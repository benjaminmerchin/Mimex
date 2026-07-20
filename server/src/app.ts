import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"

export function createApp(): Hono {
  const app = new Hono()

  app.get("/healthz", (context) => context.json({ status: "ok" }))

  app.use("/*", serveStatic({ root: "./dist" }))
  app.get("/*", serveStatic({ path: "./dist/index.html" }))

  return app
}
