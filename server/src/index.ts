import { serve } from "@hono/node-server"
import { createApp } from "./app.js"

const DEFAULT_PORT = 3000
const configuredPort = Number.parseInt(process.env.PORT ?? "", 10)
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : DEFAULT_PORT

const app = createApp()

serve({ fetch: app.fetch, hostname: "0.0.0.0", port }, (info) => {
  console.log(`Mimex server listening on http://0.0.0.0:${info.port}`)
})
