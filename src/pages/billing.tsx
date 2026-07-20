import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Check, CreditCard, ExternalLink } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"

type BillingDetails = {
  hasCustomer: boolean
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  price: { amount: number; currency: string; interval: string }
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "paused"])

export function BillingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [details, setDetails] = useState<BillingDetails | null>(null)
  const [action, setAction] = useState<"checkout" | "portal" | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/billing")
      .then(async (response) => {
        if (response.status === 401) {
          navigate("/login?next=/billing", { replace: true })
          return null
        }
        return response.ok ? response.json() as Promise<BillingDetails> : null
      })
      .then((body) => body && setDetails(body))
      .catch(() => setError("Unable to load your subscription."))
  }, [navigate])

  async function openStripe(kind: "checkout" | "portal") {
    setAction(kind)
    setError(null)
    const response = await fetch(`/api/billing/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null)
    const body = await response?.json().catch(() => null) as { url?: string; error?: string } | null
    if (response?.status === 401) {
      navigate("/login?next=/billing", { replace: true })
      return
    }
    if (!response?.ok || !body?.url) {
      setError(body?.error ?? "Unable to open Stripe.")
      setAction(null)
      return
    }
    window.location.assign(body.url)
  }

  const isActive = details ? ACTIVE_STATUSES.has(details.status) : false
  const checkoutResult = searchParams.get("checkout")

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Dashboard
          </Link>
          <span className="flex items-center gap-2 font-semibold"><span className="grid size-7 place-items-center bg-primary font-mono text-xs text-primary-foreground">M</span>Mimex</span>
        </div>
      </header>

      <section className="mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">■ Billing</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Manage your subscription</h1>
        <p className="mt-3 text-sm text-muted-foreground">One plan. Record workflows and turn them into reusable agent skills.</p>

        {checkoutResult === "success" && <p className="mt-7 border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm text-emerald-300">Subscription confirmed. Welcome to Mimex.</p>}
        {checkoutResult === "cancelled" && <p className="mt-7 border p-4 text-sm text-muted-foreground">Checkout cancelled. You have not been charged.</p>}

        <div className="mt-8 grid border md:grid-cols-[1fr_1.15fr]">
          <div className="border-b p-7 md:border-b-0 md:border-r">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Mimex membership</p>
            <p className="mt-6 text-5xl font-semibold tracking-tight">15 €<span className="ml-2 text-base font-normal text-muted-foreground">/ month</span></p>
            <p className="mt-3 text-sm text-muted-foreground">Recurring monthly subscription. Cancel anytime from Stripe.</p>
          </div>
          <div className="p-7">
            <ul className="space-y-4 text-sm">
              {[
                "Browser screen recording with microphone",
                "Transcript + visual workflow understanding",
                "Agent-ready SKILL.md generation",
                "Private skill dashboard and downloads",
              ].map((feature) => <li key={feature} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0" />{feature}</li>)}
            </ul>
          </div>
        </div>

        <div className="border-x border-b p-7">
          {!details ? (
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading subscription…</p>
          ) : (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Status</p>
                <p className="mt-2 flex items-center gap-2 font-medium"><span className={`size-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-muted-foreground"}`} />{details.status}</p>
                {details.currentPeriodEnd && <p className="mt-1 text-xs text-muted-foreground">{details.cancelAtPeriodEnd ? "Access ends" : "Renews"} {new Date(details.currentPeriodEnd).toLocaleDateString()}</p>}
              </div>
              <div className="flex flex-wrap gap-3">
                {!isActive && (
                  <Button size="lg" disabled={action !== null} onClick={() => openStripe("checkout")}>
                    <CreditCard className="size-4" /> {action === "checkout" ? "Opening…" : "Subscribe for 15 € / month"} <ArrowRight className="size-4" />
                  </Button>
                )}
                {details.hasCustomer && (
                  <Button size="lg" variant="outline" disabled={action !== null} onClick={() => openStripe("portal")}>
                    <ExternalLink className="size-4" /> {action === "portal" ? "Opening…" : "Manage in Stripe"}
                  </Button>
                )}
              </div>
            </div>
          )}
          {error && <p className="mt-5 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </div>
      </section>
    </main>
  )
}
