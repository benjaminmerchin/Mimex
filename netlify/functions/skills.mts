import type { Config } from "@netlify/functions"
import { runs, json, type OpRecord } from "./lib/store.mjs"

// Serves the generated SKILL.md as a downloadable markdown file.
export default async function handler(_req: Request, context: { params: Record<string, string> }): Promise<Response> {
  const raw = context.params?.id ?? ""
  const id = raw.endsWith(".md") ? raw.slice(0, -3) : raw
  if (!id) return json(400, { error: "missing_id" })

  const op = (await runs().get(`op:${id}`, { type: "json" })) as OpRecord | null
  if (!op || op.status !== "succeeded") return json(404, { error: "skill_not_found" })

  const output = op.output as { skill_name?: string; skill_md?: string }
  if (!output?.skill_md) return json(404, { error: "skill_not_found" })

  const filename = `${output.skill_name ?? "skill"}.md`
  return new Response(output.skill_md, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
      "cache-control": "public, max-age=31536000, immutable",
    },
  })
}

export const config: Config = { path: "/skills/:id" }
