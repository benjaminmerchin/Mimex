import { useEffect, useState } from "react"
import { LogOut, Video } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

type Me = {
  id: string
  email: string
  name: string | null
  isDev: boolean
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [me, setMe] = useState<Me | null>(null)

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

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" })
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
        <div className="mt-10 border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">Your generated skills will appear here.</div>
      </section>
    </main>
  )
}
