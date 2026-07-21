import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Bot,
  Braces,
  Check,
  CircleAlert,
  Download,
  FlaskConical,
  Play,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

type TraceEvent = {
  action: "fill" | "select" | "click" | "assert"
  target: { role: string; label: string; test_id: string }
  value: string
}

type AutomationParameter = {
  key: string
  label: string
  description: string
  example: string
}

type AutomationStep = {
  order: number
  action: "fill" | "select" | "click"
  target: { role: string; label: string; test_id: string }
  value_template: string
  rationale: string
}

type Automation = {
  parameters: AutomationParameter[]
  steps: AutomationStep[]
  assertions: Array<{ text_template: string }>
}

type Phase = "idle" | "teaching" | "compiling" | "ready" | "running" | "failed" | "repairing" | "passed"

type RuntimeFailure = {
  message: string
  step: AutomationStep
}

const plans = ["Starter", "Pro", "Enterprise"]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_, key: string) => values[key] ?? "")
}

export function TeachPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>("idle")
  const [customerName, setCustomerName] = useState("")
  const [plan, setPlan] = useState("Starter")
  const [customers, setCustomers] = useState<Array<{ name: string; plan: string }>>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [trace, setTrace] = useState<TraceEvent[]>([])
  const [automation, setAutomation] = useState<Automation | null>(null)
  const [playwrightTs, setPlaywrightTs] = useState("")
  const [runId, setRunId] = useState<string | null>(null)
  const [workflowName, setWorkflowName] = useState<string | null>(null)
  const [replayInputs, setReplayInputs] = useState<Record<string, string>>({})
  const [runtimeLog, setRuntimeLog] = useState<string[]>([])
  const [failure, setFailure] = useState<RuntimeFailure | null>(null)
  const [repairSummary, setRepairSummary] = useState<string | null>(null)
  const [uiChanged, setUiChanged] = useState(false)
  const [activeTarget, setActiveTarget] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testIds = useMemo(() => ({
    name: uiChanged ? "customer-name-v2" : "customer-name",
    plan: "customer-plan",
    submit: "create-customer",
    notice: "customer-created",
  }), [uiChanged])

  useEffect(() => {
    fetch("/api/me").then((response) => {
      if (response.status === 401) navigate("/login?next=/teach", { replace: true })
    }).catch(() => navigate("/login?next=/teach", { replace: true }))
  }, [navigate])

  function resetCrm() {
    setCustomerName("")
    setPlan("Starter")
    setCustomers([])
    setNotice(null)
    setActiveTarget(null)
  }

  function startTeaching() {
    resetCrm()
    setUiChanged(false)
    setTrace([])
    setAutomation(null)
    setPlaywrightTs("")
    setRunId(null)
    setWorkflowName(null)
    setRuntimeLog([])
    setFailure(null)
    setRepairSummary(null)
    setError(null)
    setPhase("teaching")
  }

  function remember(event: TraceEvent) {
    setTrace((current) => {
      if (event.action === "fill" || event.action === "select") {
        return [...current.filter((item) => item.action !== event.action), event]
      }
      return [...current, event]
    })
  }

  function submitCustomer() {
    const name = customerName.trim()
    if (!name) return
    const message = `Customer ${name} created on ${plan}`
    setCustomers((current) => [...current, { name, plan }])
    setNotice(message)
    if (phase === "teaching") {
      remember({
        action: "click",
        target: { role: "button", label: "Create customer", test_id: testIds.submit },
        value: "",
      })
      remember({
        action: "assert",
        target: { role: "status", label: "Customer created", test_id: testIds.notice },
        value: message,
      })
    }
  }

  async function compileTrace() {
    setPhase("compiling")
    setError(null)
    const response = await fetch("/api/teach/compile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trace }),
    }).catch(() => null)
    const body = await response?.json().catch(() => null) as {
      run?: { id: string; name: string }
      automation?: Automation
      playwrightTs?: string
      error?: string
    } | null
    if (!response?.ok || !body?.run || !body.automation || !body.playwrightTs) {
      setError(body?.error ?? "Mimex could not compile this demonstration.")
      setPhase("teaching")
      return
    }

    const inputs = Object.fromEntries(body.automation.parameters.map((parameter) => {
      const normalized = `${parameter.key} ${parameter.label}`.toLowerCase()
      if (normalized.includes("name") || normalized.includes("customer")) return [parameter.key, "OpenAI"]
      if (normalized.includes("plan")) return [parameter.key, "Enterprise"]
      return [parameter.key, `${parameter.example}-new`]
    }))
    setAutomation(body.automation)
    setPlaywrightTs(body.playwrightTs)
    setRunId(body.run.id)
    setWorkflowName(body.run.name)
    setReplayInputs(inputs)
    setRuntimeLog(["Trace generalized into parameters and executable steps."])
    setPhase("ready")
  }

  function availableTargets() {
    return [
      { role: "textbox", label: "Customer name", test_id: testIds.name },
      { role: "combobox", label: "Plan", test_id: testIds.plan },
      { role: "button", label: "Create customer", test_id: testIds.submit },
      { role: "status", label: "Customer created", test_id: testIds.notice },
    ]
  }

  async function executeWorkflow(spec: Automation = automation as Automation, repairNote?: string) {
    if (!spec) return
    resetCrm()
    setFailure(null)
    setRepairSummary(repairNote ?? null)
    setRuntimeLog(repairNote ? [`Repair: ${repairNote}`] : [])
    setPhase("running")
    await sleep(400)

    let runtimeName = ""
    let runtimePlan = ""
    for (const step of [...spec.steps].sort((a, b) => a.order - b.order)) {
      setActiveTarget(step.target.test_id)
      setRuntimeLog((current) => [...current, `${step.order}. ${step.action} · ${step.target.label}`])
      await sleep(650)

      const element = document.querySelector(`[data-testid="${step.target.test_id}"]`)
      if (!element) {
        setActiveTarget(null)
        setFailure({
          message: `Selector [data-testid="${step.target.test_id}"] no longer exists.`,
          step,
        })
        setRuntimeLog((current) => [...current, "Verification stopped: selector drift detected."])
        setPhase("failed")
        return
      }

      const value = renderTemplate(step.value_template, replayInputs)
      if (step.action === "fill") {
        runtimeName = value
        setCustomerName(value)
      } else if (step.action === "select") {
        runtimePlan = value
        setPlan(value)
      } else if (step.action === "click") {
        const finalName = runtimeName || Object.values(replayInputs)[0] || "Customer"
        const finalPlan = runtimePlan || "Enterprise"
        const message = `Customer ${finalName} created on ${finalPlan}`
        setCustomers([{ name: finalName, plan: finalPlan }])
        setNotice(message)
      }
    }

    await sleep(500)
    const actual = `Customer ${runtimeName} created on ${runtimePlan}`
    const expected = spec.assertions.map((assertion) => renderTemplate(assertion.text_template, replayInputs))
    const verified = expected.some((assertion) => assertion === actual)
    setActiveTarget(null)
    if (!verified) {
      const lastStep = spec.steps.at(-1)
      if (!lastStep) return
      setFailure({ message: `Expected “${expected[0] ?? "success"}”, received “${actual}”.`, step: lastStep })
      setRuntimeLog((current) => [...current, "Assertion failed."])
      setPhase("failed")
      return
    }

    setRuntimeLog((current) => [...current, `✓ ${actual}`, "All assertions passed."])
    setPhase("passed")
  }

  async function repairAndRerun() {
    if (!runId || !failure) return
    setPhase("repairing")
    setError(null)
    const response = await fetch(`/api/teach/${runId}/repair`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ failure, availableTargets: availableTargets() }),
    }).catch(() => null)
    const body = await response?.json().catch(() => null) as {
      automation?: Automation
      playwrightTs?: string
      repairSummary?: string
      error?: string
    } | null
    if (!response?.ok || !body?.automation || !body.playwrightTs) {
      setError(body?.error ?? "Mimex could not repair this workflow.")
      setPhase("failed")
      return
    }

    setAutomation(body.automation)
    setPlaywrightTs(body.playwrightTs)
    const summary = body.repairSummary ?? "Selector repaired from live DOM evidence."
    setRepairSummary(summary)
    setRuntimeLog([`Repair: ${summary}`])
    await sleep(700)
    await executeWorkflow(body.automation, summary)
  }

  function simulateUiChange() {
    setUiChanged(true)
    resetCrm()
    setFailure(null)
    setRepairSummary(null)
    setRuntimeLog(["UI v2 deployed: Customer name selector changed."])
    setPhase("ready")
  }

  const teachingComplete = trace.some((event) => event.action === "fill")
    && trace.some((event) => event.action === "select")
    && trace.some((event) => event.action === "click")
    && trace.some((event) => event.action === "assert")

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Dashboard
          </Link>
          <span className="flex items-center gap-2 font-semibold"><span className="grid size-7 place-items-center bg-primary font-mono text-xs text-primary-foreground">M</span>Mimex Teach Lab</span>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">■ Teach → execute → verify → repair</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Show it once. Run it with different data.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Teach Mimex how to create “Acme” on Pro. GPT‑5.6 turns the demonstration into a parameterized Codex skill and Playwright test, then runs “OpenAI” on Enterprise.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {phase === "idle" && <Button size="lg" onClick={startTeaching}><FlaskConical className="size-4" /> Start teaching</Button>}
            {phase !== "idle" && <Button variant="outline" onClick={startTeaching}><RotateCcw className="size-4" /> Reset demo</Button>}
          </div>
        </div>

        <div className="mt-8 grid gap-px border bg-border lg:grid-cols-[1.05fr_.95fr]">
          <section className="bg-background">
            <header className="flex items-center justify-between border-b px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Demo CRM · {uiChanged ? "UI v2" : "UI v1"}</span>
              <span className="flex items-center gap-2"><span className={`size-1.5 ${phase === "teaching" ? "animate-pulse bg-red-400" : "bg-emerald-400"}`} />{phase === "teaching" ? "recording semantics" : "live"}</span>
            </header>
            <div className="p-5 sm:p-8">
              {phase === "teaching" && (
                <div className="mb-6 border border-blue-400/30 bg-blue-400/10 p-4 text-sm text-blue-100">
                  Create customer <strong>Acme</strong>, choose <strong>Pro</strong>, then finish the teaching session.
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Customer name</span>
                  <input
                    data-testid={testIds.name}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    onBlur={() => phase === "teaching" && customerName.trim() && remember({
                      action: "fill",
                      target: { role: "textbox", label: "Customer name", test_id: testIds.name },
                      value: customerName.trim(),
                    })}
                    disabled={phase === "running" || phase === "repairing"}
                    placeholder="Acme"
                    className={`h-11 w-full border bg-background px-3 outline-none transition ${activeTarget === testIds.name ? "border-blue-400 ring-2 ring-blue-400/20" : "focus:border-foreground"}`}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Plan</span>
                  <select
                    data-testid={testIds.plan}
                    value={plan}
                    onChange={(event) => {
                      setPlan(event.target.value)
                      if (phase === "teaching") remember({
                        action: "select",
                        target: { role: "combobox", label: "Plan", test_id: testIds.plan },
                        value: event.target.value,
                      })
                    }}
                    disabled={phase === "running" || phase === "repairing"}
                    className={`h-11 w-full border bg-background px-3 outline-none transition ${activeTarget === testIds.plan ? "border-blue-400 ring-2 ring-blue-400/20" : "focus:border-foreground"}`}
                  >
                    {plans.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              </div>
              <Button
                data-testid={testIds.submit}
                className={`mt-5 transition ${activeTarget === testIds.submit ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-background" : ""}`}
                onClick={submitCustomer}
                disabled={!customerName.trim() || phase === "running" || phase === "repairing"}
              >
                Create customer
              </Button>

              {notice && (
                <div data-testid={testIds.notice} role="status" className="mt-6 flex items-center gap-3 border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                  <Check className="size-4" /> {notice}
                </div>
              )}

              <div className="mt-8 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">Customers</h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{customers.length} records</span>
                </div>
                {customers.length === 0 ? (
                  <p className="mt-4 border border-dashed p-8 text-center text-sm text-muted-foreground">No customers yet.</p>
                ) : (
                  <div className="mt-4 border">
                    {customers.map((customer) => (
                      <div key={`${customer.name}-${customer.plan}`} className="flex items-center justify-between border-b px-4 py-3 text-sm last:border-0">
                        <span>{customer.name}</span><span className="font-mono text-xs text-muted-foreground">{customer.plan}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-background">
            <header className="flex items-center justify-between border-b px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Mimex agent</span><span>GPT‑5.6 Sol</span>
            </header>
            <div className="p-5 sm:p-8">
              {phase === "idle" && (
                <div className="grid min-h-80 place-items-center text-center">
                  <div><Bot className="mx-auto size-8 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">Start a teaching session to capture semantic actions, not screen coordinates.</p></div>
                </div>
              )}

              {(phase === "teaching" || phase === "compiling") && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Live semantic trace</p>
                  <div className="mt-4 min-h-48 border bg-card p-4 font-mono text-xs leading-6">
                    {trace.length === 0 ? <span className="text-muted-foreground">Waiting for actions…</span> : trace.map((event, index) => (
                      <p key={`${event.action}-${index}`}><span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span> {event.action} <span className="text-blue-300">{event.target.label}</span>{event.value ? ` = “${event.value}”` : ""}</p>
                    ))}
                  </div>
                  <Button className="mt-5 w-full" size="lg" onClick={compileTrace} disabled={!teachingComplete || phase === "compiling"}>
                    <Sparkles className={phase === "compiling" ? "size-4 animate-pulse" : "size-4"} />
                    {phase === "compiling" ? "Generalizing with GPT‑5.6…" : "Finish teaching & generate"}
                  </Button>
                  {!teachingComplete && <p className="mt-3 text-xs text-muted-foreground">Complete the Acme / Pro workflow to unlock generation.</p>}
                </div>
              )}

              {automation && !["teaching", "compiling", "idle"].includes(phase) && (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Executable skill</p><h2 className="mt-2 font-medium">{workflowName}</h2></div>
                    <span className="border px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300">compiled</span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {automation.parameters.map((parameter) => (
                      <label key={parameter.key} className="block">
                        <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{parameter.label}</span>
                        {`${parameter.key} ${parameter.label}`.toLowerCase().includes("plan") ? (
                          <select value={replayInputs[parameter.key] ?? ""} onChange={(event) => setReplayInputs((current) => ({ ...current, [parameter.key]: event.target.value }))} className="h-10 w-full border bg-background px-3 text-sm">
                            {plans.map((option) => <option key={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input value={replayInputs[parameter.key] ?? ""} onChange={(event) => setReplayInputs((current) => ({ ...current, [parameter.key]: event.target.value }))} className="h-10 w-full border bg-background px-3 text-sm outline-none focus:border-foreground" />
                        )}
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button onClick={() => executeWorkflow()} disabled={phase === "running" || phase === "repairing"}><Play className="size-4" /> Run autonomously</Button>
                    {!uiChanged && phase === "passed" && <Button variant="outline" onClick={simulateUiChange}><CircleAlert className="size-4" /> Simulate UI change</Button>}
                    {runId && <Button variant="outline" asChild><a href={`/api/runs/${runId}/skill.md`}><Download className="size-4" /> Codex skill</a></Button>}
                    {runId && <Button variant="outline" asChild><a href={`/api/runs/${runId}/playwright.ts`}><Download className="size-4" /> Playwright</a></Button>}
                  </div>

                  <div className="mt-5 border bg-card p-4 font-mono text-xs leading-6">
                    {runtimeLog.length === 0 ? <span className="text-muted-foreground">Ready to execute with new inputs.</span> : runtimeLog.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
                  </div>

                  {phase === "failed" && failure && (
                    <div className="mt-4 border border-destructive/40 bg-destructive/10 p-4">
                      <p className="flex items-center gap-2 text-sm text-destructive"><CircleAlert className="size-4" /> {failure.message}</p>
                      <Button className="mt-4" onClick={repairAndRerun}><WandSparkles className="size-4" /> Repair with GPT‑5.6 & rerun</Button>
                    </div>
                  )}
                  {phase === "repairing" && <div className="mt-4 border border-blue-400/30 bg-blue-400/10 p-4 text-sm text-blue-100"><WandSparkles className="mr-2 inline size-4 animate-pulse" /> Inspecting failure and live DOM…</div>}
                  {phase === "passed" && <div className="mt-4 border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200"><Check className="mr-2 inline size-4" /> Autonomous replay verified with different data.{repairSummary ? ` ${repairSummary}` : ""}</div>}

                  <details className="mt-5 border">
                    <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><Braces className="mr-2 inline size-3.5" /> Inspect generated Playwright</summary>
                    <pre className="max-h-64 overflow-auto border-t p-4 text-[11px] leading-5 text-muted-foreground">{playwrightTs}</pre>
                  </details>
                </div>
              )}
              {error && <p className="mt-4 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
