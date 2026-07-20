import Stripe from "stripe"
import type { Hono } from "hono"
import { auth } from "./auth.js"
import { db } from "./db.js"

const DEFAULT_PRICE_ID = "price_1TvPV3BY1m1Her53HNAVHa6Q"
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "paused"])

function stripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error("missing_stripe_secret_key")
  return new Stripe(secretKey)
}

function appBaseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

async function ensureCustomer(stripe: Stripe, userId: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, isAnonymous: true, stripeCustomerId: true },
  })
  if (user.stripeCustomerId) return user.stripeCustomerId

  const customer = await stripe.customers.create({
    ...(user.isAnonymous ? {} : { email: user.email }),
    ...(user.name ? { name: user.name } : {}),
    metadata: { mimex_user_id: user.id },
  })
  await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } })
  return customer.id
}

async function subscriptionForCustomer(stripe: Stripe, customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  })
  return subscriptions.data.find((subscription) => ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status))
    ?? subscriptions.data[0]
    ?? null
}

export function registerBillingRoutes(app: Hono): void {
  app.get("/api/billing", async (context) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (!session) return context.json({ error: "unauthorized" }, 401)

    try {
      const user = await db.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { stripeCustomerId: true },
      })
      if (!user.stripeCustomerId) {
        return context.json({
          hasCustomer: false,
          status: "inactive",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
          price: { amount: 1500, currency: "eur", interval: "month" },
        })
      }

      const subscription = await subscriptionForCustomer(stripeClient(), user.stripeCustomerId)
      const currentPeriodEnd = subscription?.items.data[0]?.current_period_end
      return context.json({
        hasCustomer: true,
        status: subscription?.status ?? "inactive",
        cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
        price: { amount: 1500, currency: "eur", interval: "month" },
      })
    } catch (error) {
      console.error("[billing] Unable to load subscription:", error)
      return context.json({ error: "Unable to load billing details." }, 500)
    }
  })

  app.post("/api/billing/checkout", async (context) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (!session) return context.json({ error: "unauthorized" }, 401)

    try {
      const stripe = stripeClient()
      const customerId = await ensureCustomer(stripe, session.user.id)
      const currentSubscription = await subscriptionForCustomer(stripe, customerId)
      if (currentSubscription && ACTIVE_SUBSCRIPTION_STATUSES.has(currentSubscription.status)) {
        return context.json({ error: "An active subscription already exists." }, 409)
      }

      const checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: process.env.STRIPE_PRICE_ID ?? DEFAULT_PRICE_ID, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: session.user.id,
        subscription_data: { metadata: { mimex_user_id: session.user.id } },
        success_url: `${appBaseUrl()}/billing?checkout=success`,
        cancel_url: `${appBaseUrl()}/billing?checkout=cancelled`,
      })
      if (!checkout.url) return context.json({ error: "Stripe did not return a checkout URL." }, 502)
      return context.json({ url: checkout.url })
    } catch (error) {
      console.error("[billing] Unable to create checkout:", error)
      return context.json({ error: "Unable to start Stripe Checkout." }, 500)
    }
  })

  app.post("/api/billing/portal", async (context) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (!session) return context.json({ error: "unauthorized" }, 401)

    try {
      const stripe = stripeClient()
      const customerId = await ensureCustomer(stripe, session.user.id)
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appBaseUrl()}/billing`,
      })
      return context.json({ url: portal.url })
    } catch (error) {
      console.error("[billing] Unable to create portal session:", error)
      return context.json({ error: "Unable to open the Stripe billing portal." }, 500)
    }
  })
}
