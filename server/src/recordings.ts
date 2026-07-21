import Busboy from "busboy"
import { createHash, randomUUID } from "node:crypto"
import { createWriteStream } from "node:fs"
import { mkdir, rename, rm } from "node:fs/promises"
import { basename, extname, join } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { Hono } from "hono"
import { auth } from "./auth.js"
import { db } from "./db.js"
import { runAccessWhere } from "./run-access.js"
import { refineSkill } from "./skill-refinement.js"

const MAX_RECORDING_BYTES = 500 * 1024 * 1024

class UploadError extends Error {
  constructor(
    readonly status: 400 | 413 | 415 | 422,
    message: string,
  ) {
    super(message)
  }
}

type StoredRecording = {
  path: string
  filename: string
  mimeType: string
  size: number
  fingerprint: string
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "video/mp4") return ".mp4"
  if (mimeType === "video/quicktime") return ".mov"
  if (mimeType === "video/x-matroska") return ".mkv"
  return ".webm"
}

function normalizedVideoMimeType(mimeType: string, filename: string): string | null {
  const baseMimeType = mimeType.toLowerCase().split(";", 1)[0]
  if (baseMimeType?.startsWith("video/")) return baseMimeType

  const extension = extname(filename).toLowerCase()
  if (extension === ".webm") return "video/webm"
  if (extension === ".mp4" || extension === ".m4v") return "video/mp4"
  if (extension === ".mov") return "video/quicktime"
  if (extension === ".mkv") return "video/x-matroska"
  return null
}

async function storeRecording(request: Request): Promise<StoredRecording> {
  const contentType = request.headers.get("content-type")
  if (!contentType?.toLowerCase().startsWith("multipart/form-data")) {
    throw new UploadError(415, "Expected a multipart recording upload.")
  }
  if (!request.body) throw new UploadError(400, "The recording body is empty.")

  const dataDir = process.env.DATA_DIR ?? "/app/data"
  await mkdir(dataDir, { recursive: true })

  const uploadId = randomUUID()
  const temporaryPath = join(dataDir, `${uploadId}.upload`)
  let filename = "recording.webm"
  let mimeType = "video/webm"
  let size = 0
  let fileSeen = false
  let fileTooLarge = false
  let fileWrite: Promise<void> | undefined
  const hash = createHash("sha256")

  const parser = Busboy({
    headers: { "content-type": contentType },
    limits: {
      files: 1,
      fileSize: MAX_RECORDING_BYTES,
      fields: 10,
      fieldSize: 1024 * 1024,
      parts: 12,
    },
  })

  const parsed = new Promise<void>((resolve, reject) => {
    parser.on("file", (fieldName, file, info) => {
      if (fieldName !== "recording" || fileSeen) {
        file.resume()
        return
      }

      fileSeen = true
      filename = basename(info.filename || filename)
      mimeType = info.mimeType || mimeType
      file.on("data", (chunk: Buffer) => {
        size += chunk.length
        hash.update(chunk)
      })
      file.once("limit", () => {
        fileTooLarge = true
      })
      fileWrite = pipeline(file, createWriteStream(temporaryPath))
    })
    parser.once("error", reject)
    parser.once("close", resolve)
  })

  const body = Readable.from(request.body as unknown as AsyncIterable<Uint8Array>)
  body.pipe(parser)

  try {
    await parsed
    await fileWrite
    if (!fileSeen || !fileWrite) throw new UploadError(422, "A recording file is required.")
    if (fileTooLarge) throw new UploadError(413, "Recording exceeds the 500 MB limit.")
    const videoMimeType = normalizedVideoMimeType(mimeType, filename)
    if (!videoMimeType) throw new UploadError(415, "The uploaded file must be a video.")
    mimeType = videoMimeType

    const finalPath = join(dataDir, `${uploadId}${extensionForMimeType(mimeType)}`)
    await rename(temporaryPath, finalPath)
    return {
      path: finalPath,
      filename,
      mimeType,
      size,
      fingerprint: hash.digest("hex"),
    }
  } catch (error) {
    body.destroy()
    parser.destroy()
    await rm(temporaryPath, { force: true })
    throw error
  }
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function runResponse(run: {
  id: string
  status: "pending" | "succeeded" | "failed"
  input: unknown
  output: unknown
  error: string | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}) {
  const input = jsonObject(run.input)
  const output = jsonObject(run.output)
  return {
    id: run.id,
    status: run.status,
    filename: typeof input?.filename === "string" ? input.filename : "Recording",
    skillName: typeof output?.skill_name === "string" ? output.skill_name : null,
    description: typeof output?.description === "string" ? output.description : null,
    error: run.error,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    downloadUrl: run.status === "succeeded" ? `/api/runs/${run.id}/skill.md` : null,
  }
}

export function registerRecordingRoutes(app: Hono): void {
  app.post("/api/recordings", async (context) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (!session) return context.json({ error: "unauthorized" }, 401)

    try {
      const recording = await storeRecording(context.req.raw)
      const run = await db.run.create({
        data: {
          userId: session.user.id,
          source: "direct",
          status: "pending",
          input: {
            kind: "recording",
            filename: recording.filename,
            mimeType: recording.mimeType,
            size: recording.size,
          },
          fingerprint: recording.fingerprint,
          mediaPath: recording.path,
        },
      })
      return context.json({ id: run.id, status: run.status }, 202)
    } catch (error) {
      if (error instanceof UploadError) {
        return context.json({ error: error.message }, error.status)
      }
      console.error("[recordings] Upload failed:", error)
      return context.json({ error: "Unable to save the recording." }, 500)
    }
  })

  app.get("/api/runs", async (context) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (!session) return context.json({ error: "unauthorized" }, 401)

    const access = await runAccessWhere(session.user.id)

    const runs = await db.run.findMany({
      where: access,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        input: true,
        output: true,
        error: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
      },
    })
    return context.json({ runs: runs.map(runResponse) })
  })

  app.get("/api/runs/:id", async (context) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (!session) return context.json({ error: "unauthorized" }, 401)

    const access = await runAccessWhere(session.user.id)

    const run = await db.run.findFirst({
      where: { id: context.req.param("id"), ...access },
      select: {
        id: true,
        status: true,
        input: true,
        output: true,
        error: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
      },
    })
    if (!run) return context.json({ error: "not_found" }, 404)
    return context.json(runResponse(run))
  })

  app.get("/api/runs/:id/skill.md", async (context) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (!session) return context.json({ error: "unauthorized" }, 401)

    const access = await runAccessWhere(session.user.id)

    const run = await db.run.findFirst({
      where: { id: context.req.param("id"), ...access },
      select: { status: true, output: true },
    })
    if (!run) return context.json({ error: "not_found" }, 404)
    const output = jsonObject(run.output)
    const skill = output?.skill_md
    if (run.status !== "succeeded" || !output || typeof skill !== "string") {
      return context.json({ error: "skill_not_ready" }, 409)
    }

    const rawName = typeof output.skill_name === "string" ? output.skill_name : "mimex-skill"
    const safeName = rawName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "")
    context.header("Content-Type", "text/markdown; charset=utf-8")
    context.header("Content-Disposition", `attachment; filename="${safeName || "mimex-skill"}.md"`)
    return context.body(skill)
  })

  app.post("/api/runs/:id/refine", async (context) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (!session) return context.json({ error: "unauthorized" }, 401)

    const contentLength = Number(context.req.header("content-length") ?? "0")
    if (contentLength > 8 * 1024) return context.json({ error: "request_too_large" }, 413)
    const body = await context.req.json<{ prompt?: unknown }>().catch(() => null)
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
    if (prompt.length < 2 || prompt.length > 4_000) {
      return context.json({ error: "Prompt must be between 2 and 4,000 characters." }, 422)
    }

    const access = await runAccessWhere(session.user.id)
    const run = await db.run.findFirst({
      where: { id: context.req.param("id"), status: "succeeded", ...access },
      select: { id: true, output: true },
    })
    if (!run) return context.json({ error: "not_found" }, 404)

    const currentOutput = jsonObject(run.output)
    const currentSkill = currentOutput?.skill_md
    if (typeof currentSkill !== "string") return context.json({ error: "skill_not_ready" }, 409)

    try {
      const refined = await refineSkill(currentSkill, prompt)
      const updated = await db.run.update({
        where: { id: run.id },
        data: {
          output: {
            ...refined,
            download_url: `/api/runs/${run.id}/skill.md`,
          },
        },
        select: {
          id: true,
          status: true,
          input: true,
          output: true,
          error: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
        },
      })
      return context.json({ run: runResponse(updated) })
    } catch (error) {
      console.error("[skills] Unable to refine skill:", error)
      return context.json({ error: "Unable to update the skill." }, 502)
    }
  })
}
