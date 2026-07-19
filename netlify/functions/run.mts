import type { Config } from "@netlify/functions"
import { runs, sha256Hex, json, type OpRecord } from "./lib/store.mjs"

const MAX_URL_LEN = 2048

function validInput(body: unknown): body is { video_url: string } {
  if (typeof body !== "object" || body === null) return false
  const url = (body as Record<string, unknown>).video_url
  if (typeof url !== "string" || url.length > MAX_URL_LEN) return false
  try {
    return new URL(url).protocol === "https:"
  } catch {
    return false
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" })

  // Ginse sends a short-lived Ed25519 bearer token; unsigned calls must be rejected.
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (token.length < 16) return json(401, { error: "missing_or_invalid_token" })

  const idemKey = req.headers.get("idempotency-key")
  if (!idemKey || idemKey.length < 8 || idemKey.length > 200) {
    return json(400, { error: "missing_idempotency_key" })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return json(400, { error: "invalid_json" })
  }
  // Ginse wraps the app input as {"input": {...}}; accept the flat shape too.
  const body =
    typeof raw === "object" && raw !== null && "input" in (raw as Record<string, unknown>)
      ? (raw as Record<string, unknown>).input
      : raw
  if (!validInput(body)) {
    return json(422, { error: "input_schema_violation", detail: "expected { video_url: https URL }" })
  }

  const store = runs()
  const fingerprint = await sha256Hex(JSON.stringify({ video_url: body.video_url }))
  const origin = new URL(req.url).origin

  const existingRef = (await store.get(`idem:${idemKey}`, { type: "json" })) as
    | { op_id: string; fingerprint: string }
    | null
  if (existingRef) {
    if (existingRef.fingerprint !== fingerprint) {
      return json(409, { error: "idempotency_key_reused_with_different_request" })
    }
    const op = (await store.get(`op:${existingRef.op_id}`, { type: "json" })) as OpRecord | null
    if (!op) return json(500, { error: "operation_state_missing" })
    if (op.status === "succeeded") {
      return json(200, {
        status: "succeeded",
        provider_operation_id: op.op_id,
        replayed: true,
        output: op.output,
      })
    }
    if (op.status === "failed") {
      return json(200, {
        status: "failed",
        provider_operation_id: op.op_id,
        replayed: true,
        error: op.error ?? "processing_failed",
      })
    }
    return json(202, {
      status: "pending",
      provider_operation_id: op.op_id,
      replayed: true,
      status_url: `${origin}/status/${op.op_id}`,
    })
  }

  const op_id = crypto.randomUUID()
  const record: OpRecord = { op_id, fingerprint, status: "pending", input: body }
  await store.setJSON(`op:${op_id}`, record)
  await store.setJSON(`idem:${idemKey}`, { op_id, fingerprint })

  // Kick the background worker; it responds 202 immediately.
  // Use the native functions path: custom `path` config is not honored for
  // background functions in production.
  await fetch(`${origin}/.netlify/functions/process-background`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-token": process.env.INTERNAL_TOKEN ?? "",
    },
    body: JSON.stringify({ op_id }),
  })

  return json(202, {
    status: "pending",
    provider_operation_id: op_id,
    replayed: false,
    status_url: `${origin}/status/${op_id}`,
  })
}

export const config: Config = { path: "/run" }
