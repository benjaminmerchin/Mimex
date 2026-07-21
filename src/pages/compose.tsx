import { useEffect, useState, type FormEvent } from "react"
import { ArrowDown, ArrowLeft, ArrowUp, Check, GitMerge, Sparkles } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

type SkillSummary = {
  id: string
  status: "pending" | "succeeded" | "failed"
  skillName: string | null
  description: string | null
  filename: string
}

export function ComposePage() {
  const navigate = useNavigate()
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetch("/api/me"), fetch("/api/runs")])
      .then(async ([me, runsResponse]) => {
        if (me.status === 401 || runsResponse.status === 401) {
          navigate("/login?next=/compose", { replace: true })
          return
        }
        const body = await runsResponse.json() as { runs?: SkillSummary[] }
        setSkills((body.runs ?? []).filter((run) => run.status === "succeeded" && run.skillName))
        setLoading(false)
      })
      .catch(() => navigate("/login?next=/compose", { replace: true }))
  }, [navigate])

  function toggleSkill(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : current.length < 8 ? [...current, id] : current)
    setError(null)
  }

  function moveSkill(id: string, direction: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const swap = next[nextIndex]
      if (!swap) return current
      next[nextIndex] = id
      next[index] = swap
      return next
    })
  }

  async function compose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedIds.length < 2) return
    setComposing(true)
    setError(null)
    const response = await fetch("/api/skills/compose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runIds: selectedIds, name: name.trim(), goal: goal.trim() }),
    }).catch(() => null)
    const body = await response?.json().catch(() => null) as { run?: { id: string }; error?: string } | null
    if (!response?.ok || !body?.run) {
      setError(body?.error ?? "Unable to compose these skills.")
      setComposing(false)
      return
    }
    navigate(`/dashboard?run=${encodeURIComponent(body.run.id)}&composed=1`)
  }

  const selectedSkills = selectedIds
    .map((id) => skills.find((skill) => skill.id === id))
    .filter((skill): skill is SkillSummary => Boolean(skill))

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Dashboard</Link>
          <span className="flex items-center gap-2 font-semibold"><span className="grid size-7 place-items-center bg-primary font-mono text-xs text-primary-foreground">M</span>Mimex</span>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">■ Compose learned workflows</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Chain skills without building a workflow engine</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Choose independent skills, order them, and let GPT‑5.6 create a readable parent skill that calls each child explicitly. Every child stays editable and reusable on its own.</p>

        <form className="mt-9 grid gap-px border bg-border lg:grid-cols-[1.1fr_.9fr]" onSubmit={compose}>
          <section className="bg-background p-5 sm:p-7">
            <div className="flex items-center justify-between"><h2 className="font-medium">1. Choose skills</h2><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{selectedIds.length}/8 selected</span></div>
            {loading ? (
              <div className="mt-5 border border-dashed p-10 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading skills…</div>
            ) : skills.length < 2 ? (
              <div className="mt-5 border border-dashed p-10 text-center text-sm text-muted-foreground">Generate at least two skills before composing them.</div>
            ) : (
              <div className="mt-5 border">
                {skills.map((skill) => {
                  const selectedIndex = selectedIds.indexOf(skill.id)
                  return (
                    <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)} className={`flex w-full items-start gap-4 border-b p-4 text-left transition last:border-b-0 ${selectedIndex >= 0 ? "bg-primary text-primary-foreground" : "bg-background hover:bg-card"}`}>
                      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center border font-mono text-[10px] ${selectedIndex >= 0 ? "border-primary-foreground/30" : ""}`}>{selectedIndex >= 0 ? selectedIndex + 1 : "+"}</span>
                      <span className="min-w-0"><span className="block font-medium">{skill.skillName ?? skill.filename}</span><span className={`mt-1 block line-clamp-2 text-xs ${selectedIndex >= 0 ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{skill.description}</span></span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="bg-background p-5 sm:p-7">
            <h2 className="font-medium">2. Define the parent skill</h2>
            <div className="mt-5 space-y-4">
              <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Name · optional</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="candidate-outreach" className="h-11 w-full border bg-background px-3 text-sm outline-none focus:border-foreground" /></label>
              <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Goal · optional</span><textarea value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={2_000} rows={3} placeholder="Find relevant candidates, adapt the outreach, then prepare the message for review." className="w-full resize-y border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" /></label>
            </div>

            <div className="mt-6 border">
              <div className="border-b px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Execution order</div>
              {selectedSkills.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Select skills on the left.</p> : selectedSkills.map((skill, index) => (
                <div key={skill.id} className="flex items-center gap-3 border-b p-3 last:border-0">
                  <span className="grid size-6 shrink-0 place-items-center bg-primary font-mono text-[10px] text-primary-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{skill.skillName}</span>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => moveSkill(skill.id, -1)} aria-label="Move up"><ArrowUp className="size-3.5" /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={index === selectedSkills.length - 1} onClick={() => moveSkill(skill.id, 1)} aria-label="Move down"><ArrowDown className="size-3.5" /></Button>
                </div>
              ))}
            </div>

            <Button type="submit" size="lg" className="mt-6 w-full" disabled={selectedIds.length < 2 || composing}>
              {composing ? <Sparkles className="size-4 animate-pulse" /> : <GitMerge className="size-4" />}
              {composing ? "Composing with GPT‑5.6…" : "Create parent skill"}
            </Button>
            {selectedIds.length >= 2 && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Check className="size-3.5 text-emerald-400" /> Child skills remain unchanged.</p>}
            {error && <p className="mt-4 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          </section>
        </form>
      </section>
    </main>
  )
}
