import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { auth } from "./auth.js"
import { registerBillingRoutes } from "./billing.js"
import { registerRecordingRoutes } from "./recordings.js"

export function createApp(): Hono {
  const app = new Hono()

  app.get("/healthz", (context) => context.json({ status: "ok" }))

  app.on(["GET", "POST"], "/api/auth/*", (context) => auth.handler(context.req.raw))
  app.get("/api/auth-config", (context) =>
    context.json({ devLoginEnabled: process.env.DEV_LOGIN_ENABLED === "true" }),
  )
  app.get("/api/me", async (context) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (!session) return context.json({ error: "unauthorized" }, 401)
    return context.json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      isDev: "isAnonymous" in session.user && session.user.isAnonymous === true,
    })
  })

  registerRecordingRoutes(app)
  registerBillingRoutes(app)

  app.use("/*", serveStatic({ root: "./dist" }))
  app.get("/*", serveStatic({ path: "./dist/index.html" }))

  return app
}
