import type { Config } from "@netlify/functions"
import { runs, json, type OpRecord } from "./lib/store.mjs"

export default async function handler(req: Request, context: { params: Record<string, string> }): Promise<Response> {
  const id = context.params?.id
  if (!id) return json(400, { error: "missing_id" })

  const op = (await runs().get(`op:${id}`, { type: "json" })) as OpRecord | null
  if (!op) return json(404, { error: "unknown_operation" })

  if (op.status === "succeeded") {
    return json(200, { status: "succeeded", provider_operation_id: op.op_id, output: op.output })
  }
  if (op.status === "failed") {
    return json(200, { status: "failed", provider_operation_id: op.op_id, error: op.error ?? "processing_failed" })
  }
  // Pending mirrors the POST /run pending shape, including the 202 status code.
  const origin = new URL(req.url).origin
  return json(202, {
    status: "pending",
    provider_operation_id: op.op_id,
    status_url: `${origin}/status/${op.op_id}`,
  })
}

export const config: Config = { path: "/status/:id" }
