import { useEffect, useState, type FormEvent } from "react"
import { Check, CircleCheck, CircleX, Clock3, Copy, CreditCard, Download, Eye, GitMerge, Loader2, LogOut, Pencil, Plus, Sparkles, X } from "lucide-react"
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

type SkillPreview = {
  runId: string
  name: string
  content: string | null
  error: string | null
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [me, setMe] = useState<Me | null>(null)
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [editingRunId, setEditingRunId] = useState<string | null>(null)
  const [refinePrompt, setRefinePrompt] = useState("")
  const [refiningRunId, setRefiningRunId] = useState<string | null>(null)
  const [refineError, setRefineError] = useState<string | null>(null)
  const [refinedRunId, setRefinedRunId] = useState<string | null>(null)
  const [preview, setPreview] = useState<SkillPreview | null>(null)
  const [copyingRunId, setCopyingRunId] = useState<string | null>(null)
  const [copiedRunId, setCopiedRunId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<{ runId: string; message: string } | null>(null)
  const [renamingRunId, setRenamingRunId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renamedRunId, setRenamedRunId] = useState<string | null>(null)

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
    if (!preview) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [preview])

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

  function toggleEditor(runId: string) {
    setEditingRunId((current) => current === runId ? null : runId)
    setRenamingRunId(null)
    setNameDraft("")
    setRefinePrompt("")
    setRefineError(null)
    setRefinedRunId(null)
  }

  function toggleRename(run: RunSummary) {
    if (renamingRunId === run.id) {
      setRenamingRunId(null)
      setNameDraft("")
    } else {
      setRenamingRunId(run.id)
      setNameDraft(run.skillName ?? "")
      setEditingRunId(null)
    }
    setRenameError(null)
    setRenamedRunId(null)
  }

  async function renameRun(event: FormEvent<HTMLFormElement>, runId: string) {
    event.preventDefault()
    const name = nameDraft.trim()
    if (!name || savingName) return
    setSavingName(true)
    setRenameError(null)
    const response = await fetch(`/api/runs/${runId}/name`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null)
    const body = await response?.json().catch(() => null) as { run?: RunSummary; error?: string } | null
    if (!response?.ok || !body?.run) {
      setRenameError(body?.error ?? "Unable to rename this skill.")
      setSavingName(false)
      return
    }
    setRuns((current) => current.map((run) => run.id === runId ? body.run as RunSummary : run))
    setRenamingRunId(null)
    setNameDraft("")
    setSavingName(false)
    setRenamedRunId(runId)
  }

  async function fetchSkill(run: RunSummary): Promise<string> {
    if (!run.downloadUrl) throw new Error("This skill is not ready yet.")
    const response = await fetch(run.downloadUrl)
    if (!response.ok) throw new Error("Unable to load this skill.")
    return response.text()
  }

  async function writeToClipboard(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content)
      return
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = content
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand("copy")
      textarea.remove()
      if (!copied) throw new Error("Unable to access the clipboard.")
    }
  }

  async function previewSkill(run: RunSummary) {
    setActionError(null)
    setPreview({ runId: run.id, name: run.skillName ?? run.filename, content: null, error: null })
    try {
      const content = await fetchSkill(run)
      setPreview((current) => current?.runId === run.id ? { ...current, content } : current)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load this skill."
      setPreview((current) => current?.runId === run.id ? { ...current, error: message } : current)
    }
  }

  async function copySkill(run: RunSummary) {
    setCopyingRunId(run.id)
    setCopiedRunId(null)
    setActionError(null)
    try {
      const content = await fetchSkill(run)
      await writeToClipboard(content)
      setCopiedRunId(run.id)
      window.setTimeout(() => setCopiedRunId((current) => current === run.id ? null : current), 2_000)
    } catch (error) {
      setActionError({
        runId: run.id,
        message: error instanceof Error ? error.message : "Unable to copy this skill.",
      })
    } finally {
      setCopyingRunId(null)
    }
  }

  async function refineRun(event: FormEvent<HTMLFormElement>, runId: string) {
    event.preventDefault()
    const prompt = refinePrompt.trim()
    if (!prompt || refiningRunId) return

    setRefiningRunId(runId)
    setRefineError(null)
    setRefinedRunId(null)
    const response = await fetch(`/api/runs/${runId}/refine`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    }).catch(() => null)
    const body = await response?.json().catch(() => null) as { run?: RunSummary; error?: string } | null
    if (!response?.ok || !body?.run) {
      setRefineError(body?.error ?? "Unable to update the skill.")
      setRefiningRunId(null)
      return
    }

    setRuns((current) => current.map((run) => run.id === runId ? body.run as RunSummary : run))
    setRefiningRunId(null)
    setEditingRunId(null)
    setRefinePrompt("")
    setRefinedRunId(runId)
  }

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold"><span className="grid size-7 place-items-center bg-primary font-mono text-xs text-primary-foreground">M</span>Mimex</Link>
          <div className="flex items-center gap-3">
            {me && <span className="hidden font-mono text-xs text-muted-foreground sm:block">{me.isDev ? "DEV ACCOUNT" : me.email}</span>}
            <Button variant="outline" size="sm" asChild><Link to="/billing"><CreditCard className="size-3.5" /> Billing</Link></Button>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="size-3.5" /> Sign out</Button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">■ Workspace</p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your skills</h1>
            <p className="mt-2 text-sm text-muted-foreground">Create, improve, download, and combine the workflows you have taught Mimex.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link to="/compose"><GitMerge className="size-4" /> Compose skills</Link></Button>
            <Button asChild><Link to="/record"><Plus className="size-4" /> New skill</Link></Button>
          </div>
        </div>
        {loadingRuns ? (
          <div className="mt-10 border border-dashed px-6 py-16 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading runs…</div>
        ) : runs.length === 0 ? (
          <div className="mt-10 border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
            <p>Your generated skills will appear here.</p>
            <Button className="mt-5" asChild><Link to="/record"><Plus className="size-4" /> Create your first skill</Link></Button>
          </div>
        ) : (
          <div className="mt-10 border">
            {runs.map((run) => (
              <article key={run.id} className="border-b p-5 last:border-b-0">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate font-medium">{run.skillName ?? run.filename}</h2>
                      <span className="inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {run.status === "pending" && <Clock3 className="size-3.5 animate-spin [animation-duration:1.8s]" />}
                        {run.status === "succeeded" && <CircleCheck className="size-3 text-emerald-400" />}
                        {run.status === "failed" && <CircleX className="size-3 text-destructive" />}
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {run.description ?? (run.status === "pending" ? "Mimex is processing your recording." : run.error ?? "Skill generation failed.")}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</p>
                    {refinedRunId === run.id && <p className="mt-2 text-xs text-emerald-400">Skill updated with AI.</p>}
                    {renamedRunId === run.id && <p className="mt-2 text-xs text-emerald-400">Skill renamed.</p>}
                  </div>
                  {run.downloadUrl && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button variant="outline" onClick={() => previewSkill(run)}>
                        <Eye className="size-4" /> Preview
                      </Button>
                      <Button variant="outline" onClick={() => copySkill(run)} disabled={copyingRunId === run.id}>
                        {copyingRunId === run.id ? <Loader2 className="size-4 animate-spin" /> : copiedRunId === run.id ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                        {copiedRunId === run.id ? "Copied" : "Copy to clipboard"}
                      </Button>
                      <Button variant="outline" onClick={() => toggleRename(run)}>
                        {renamingRunId === run.id ? <X className="size-4" /> : <Pencil className="size-4" />}
                        {renamingRunId === run.id ? "Cancel rename" : "Rename"}
                      </Button>
                      <Button variant="outline" onClick={() => toggleEditor(run.id)}>
                        {editingRunId === run.id ? <X className="size-4" /> : <Sparkles className="size-4" />}
                        {editingRunId === run.id ? "Close" : "Update with AI"}
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={run.downloadUrl}><Download className="size-4" /> Download .md</a>
                      </Button>
                    </div>
                  )}
                </div>
                {actionError?.runId === run.id && <p className="mt-3 text-xs text-destructive">{actionError.message}</p>}
                {renamingRunId === run.id && (
                  <form className="mt-5 border-t pt-5" onSubmit={(event) => renameRun(event, run.id)}>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor={`rename-${run.id}`}>Skill name</label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        id={`rename-${run.id}`}
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                        maxLength={80}
                        autoFocus
                        placeholder="my-reusable-workflow"
                        className="h-10 flex-1 border bg-background px-3 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
                      />
                      <Button type="submit" disabled={!nameDraft.trim() || savingName}>
                        {savingName ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        {savingName ? "Saving…" : "Save name"}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Saved as lowercase kebab-case in the dashboard and SKILL.md frontmatter.</p>
                    {renameError && <p className="mt-2 text-xs text-destructive">{renameError}</p>}
                  </form>
                )}
                {editingRunId === run.id && (
                  <form className="mt-5 border-t pt-5" onSubmit={(event) => refineRun(event, run.id)}>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor={`refine-${run.id}`}>Tell Mimex what to change</label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <textarea
                        id={`refine-${run.id}`}
                        value={refinePrompt}
                        onChange={(event) => setRefinePrompt(event.target.value)}
                        maxLength={4_000}
                        rows={2}
                        autoFocus
                        placeholder="e.g. Add more precise verification steps and keep the commands unchanged."
                        className="min-h-20 flex-1 resize-y border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
                      />
                      <Button type="submit" className="sm:self-stretch" disabled={!refinePrompt.trim() || refiningRunId === run.id}>
                        <Sparkles className={refiningRunId === run.id ? "size-4 animate-pulse" : "size-4"} />
                        {refiningRunId === run.id ? "Updating…" : "Update skill"}
                      </Button>
                    </div>
                    {refineError && <p className="mt-2 text-xs text-destructive">{refineError}</p>}
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 sm:p-8" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreview(null)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="skill-preview-title" className="flex max-h-[90dvh] w-full max-w-4xl flex-col border bg-background shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">■ SKILL.md preview</p>
                <h2 id="skill-preview-title" className="mt-1 truncate font-medium">{preview.name}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreview(null)} aria-label="Close preview"><X className="size-4" /></Button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto p-5 sm:p-7">
              {!preview.content && !preview.error && <div className="grid min-h-64 place-items-center"><span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading skill…</span></div>}
              {preview.error && <p className="border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{preview.error}</p>}
              {preview.content && <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground sm:text-sm">{preview.content}</pre>}
            </div>
            {preview.content && (
              <footer className="flex flex-wrap justify-end gap-2 border-t p-4">
                <Button variant="outline" onClick={() => {
                  const run = runs.find((candidate) => candidate.id === preview.runId)
                  if (run) void copySkill(run)
                }}>
                  {copiedRunId === preview.runId ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                  {copiedRunId === preview.runId ? "Copied" : "Copy to clipboard"}
                </Button>
                <Button asChild><a href={`/api/runs/${preview.runId}/skill.md`}><Download className="size-4" /> Download .md</a></Button>
              </footer>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
