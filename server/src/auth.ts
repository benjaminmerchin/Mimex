import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { anonymous, magicLink } from "better-auth/plugins"
import { randomUUID } from "node:crypto"
import { db } from "./db.js"
import { sendMagicLink } from "./email.js"

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
const devLoginEnabled = process.env.DEV_LOGIN_ENABLED === "true"

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [baseURL],
  plugins: [
    magicLink({
      expiresIn: 60 * 60,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLink({ to: email, url })
      },
    }),
    ...(devLoginEnabled
      ? [
          anonymous({
            generateName: () => "Mimex Dev",
            generateRandomEmail: () => `dev-${randomUUID()}@dev.getmimex.com`,
          }),
        ]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
})
