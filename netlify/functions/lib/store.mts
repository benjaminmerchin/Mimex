import { getStore } from "@netlify/blobs"

export type OpRecord = {
  op_id: string
  fingerprint: string
  status: "pending" | "succeeded" | "failed"
  input: { video_url: string }
  output?: unknown
  error?: string
}

export const runs = () => getStore({ name: "mimex-runs", consistency: "strong" })

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}
