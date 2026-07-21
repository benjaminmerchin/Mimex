import type { Prisma } from "@prisma/client"
import { db } from "./db.js"

export async function runAccessWhere(userId: string): Promise<Prisma.RunWhereInput> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isAnonymous: true },
  })
  if (process.env.DEV_LOGIN_ENABLED === "true" && user?.isAnonymous) {
    return { user: { isAnonymous: true } }
  }
  return { userId }
}
