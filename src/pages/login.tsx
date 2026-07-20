import { useEffect, useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, Check, FlaskConical, Mail } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"

type LoginState = "idle" | "sending" | "sent"

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState("")
  const [state, setState] = useState<LoginState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [devLoginEnabled, setDevLoginEnabled] = useState(false)
  const requestedNext = searchParams.get("next")
  const nextPath = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard"

  useEffect(() => {
    fetch("/api/auth-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { devLoginEnabled?: boolean } | null) => setDevLoginEnabled(data?.devLoginEnabled === true))
      .catch(() => undefined)
  }, [])

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setState("sending")
    const response = await fetch("/api/auth/sign-in/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim(), callbackURL: nextPath }),
    }).catch(() => null)

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { message?: string } | null
      setError(body?.message ?? "Unable to send the magic link.")
      setState("idle")
      return
    }
    setState("sent")
  }

  async function devLogin() {
    setError(null)
    const response = await fetch("/api/auth/sign-in/anonymous", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null)
    if (!response?.ok) {
      setError("The dev account is unavailable.")
      return
    }
    navigate(nextPath)
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Mimex
        </Link>
        <section className="border bg-card">
          <header className="border-b px-7 py-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">■ Secure access</p>
          </header>
          <div className="p-7">
            {state === "sent" ? (
              <div className="py-6 text-center">
                <span className="mx-auto grid size-12 place-items-center border bg-primary text-primary-foreground"><Check className="size-5" /></span>
                <h1 className="mt-6 text-2xl font-semibold tracking-tight">Check your inbox</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  We sent a one-time sign-in link to <span className="text-foreground">{email}</span>. It expires in one hour.
                </p>
                <Button variant="outline" className="mt-7 w-full" onClick={() => setState("idle")}>Use another email</Button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-semibold tracking-tight">Sign in to Mimex</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">No password. We’ll email you a secure magic link.</p>
                <form className="mt-8 space-y-4" onSubmit={sendLink}>
                  <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="h-11 w-full border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
                  />
                  <Button type="submit" size="lg" className="w-full font-mono text-xs uppercase tracking-widest" disabled={state === "sending"}>
                    <Mail className="size-4" /> {state === "sending" ? "Sending…" : "Email me a magic link"} <ArrowRight className="size-4" />
                  </Button>
                </form>
                {devLoginEnabled && (
                  <>
                    <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">dev</div>
                    <Button type="button" variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-widest" onClick={devLogin}>
                      <FlaskConical className="size-4" /> Login with dev account
                    </Button>
                  </>
                )}
                {error && <p className="mt-4 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
