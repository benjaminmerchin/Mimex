import { useEffect, useState } from "react"
import { CircleCheck, CircleX, Clock3, Download, LogOut, Video } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

type Me = {
  id: string
  email: string
  name: string | null
  isDev: boolean
}

type RunSummary = {
  id: string
  status: "pending" | "succeeded" | "failed"
  filename: string
  skillName: string | null
  description: string | null
  error: string | null
  createdAt: string
  downloadUrl: string | null
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [me, setMe] = useState<Me | null>(null)
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)

  useEffect(() => {
    fetch("/api/me")
      .then(async (response) => {
        if (response.status === 401) {
          navigate("/login", { replace: true })
          return null
        }
        return response.ok ? (response.json() as Promise<Me>) : null
      })
      .then(setMe)
      .catch(() => navigate("/login", { replace: true }))
  }, [navigate])

  useEffect(() => {
    let active = true
    async function loadRuns() {
      const response = await fetch("/api/runs").catch(() => null)
      if (!active) return
      if (response?.status === 401) {
        navigate("/login", { replace: true })
        return
      }
      if (response?.ok) {
        const body = await response.json() as { runs?: RunSummary[] }
        if (active) setRuns(body.runs ?? [])
      }
      if (active) setLoadingRuns(false)
    }
    void loadRuns()
    const interval = window.setInterval(loadRuns, 5000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [navigate])

  async function signOut() {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    navigate("/", { replace: true })
  }

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold"><span className="grid size-7 place-items-center bg-primary font-mono text-xs text-primary-foreground">M</span>Mimex</Link>
          <div className="flex items-center gap-3">
            {me && <span className="hidden font-mono text-xs text-muted-foreground sm:block">{me.isDev ? "DEV ACCOUNT" : me.email}</span>}
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="size-3.5" /> Sign out</Button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">■ Workspace</p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your skills</h1>
            <p className="mt-2 text-sm text-muted-foreground">Record a workflow and turn it into an agent-ready skill.</p>
          </div>
          <Button asChild><Link to="/record"><Video className="size-4" /> New recording</Link></Button>
        </div>
        {loadingRuns ? (
          <div className="mt-10 border border-dashed px-6 py-16 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading runs…</div>
        ) : runs.length === 0 ? (
          <div className="mt-10 border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">Your generated skills will appear here.</div>
        ) : (
          <div className="mt-10 border">
            {runs.map((run) => (
              <article key={run.id} className="flex flex-col gap-5 border-b p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="truncate font-medium">{run.skillName ?? run.filename}</h2>
                    <span className="inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {run.status === "pending" && <Clock3 className="size-3 animate-pulse" />}
                      {run.status === "succeeded" && <CircleCheck className="size-3 text-emerald-400" />}
                      {run.status === "failed" && <CircleX className="size-3 text-destructive" />}
                      {run.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {run.description ?? (run.status === "pending" ? "Mimex is processing your recording." : run.error ?? "Skill generation failed.")}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</p>
                </div>
                {run.downloadUrl && (
                  <Button variant="outline" asChild className="shrink-0">
                    <a href={run.downloadUrl}><Download className="size-4" /> Download .md</a>
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
