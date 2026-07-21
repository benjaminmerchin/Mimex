import { motion, type Variants } from "motion/react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
  }),
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center justify-center gap-2 border px-3 py-1.5 text-center font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
      <span className="size-1.5 shrink-0 bg-foreground" />
      {children}
    </span>
  )
}

function GlitchBar({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <div
      aria-hidden
      className={`pixel-glitch pointer-events-none ${flip ? "-scale-x-100" : ""} ${className}`}
    />
  )
}

function Nav() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    fetch("/api/me")
      .then((response) => setIsAuthenticated(response.ok))
      .catch(() => setIsAuthenticated(false))
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-6 place-items-center bg-primary font-mono text-xs text-primary-foreground">
            M
          </span>
          Mimex
        </a>
        <nav className="hidden items-center gap-6 font-mono text-xs uppercase tracking-widest text-muted-foreground sm:flex">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#features" className="hover:text-foreground">Why Mimex</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <Button size="sm" className="font-mono text-xs uppercase tracking-widest" asChild>
          <a href={isAuthenticated ? "/dashboard" : "/login"}>{isAuthenticated ? "Dashboard" : "Get started"}</a>
        </Button>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b">
      <GlitchBar className="absolute -left-48 top-32 -z-10 h-40 w-80 opacity-25 blur-[1px] sm:-left-24 sm:top-24 sm:h-64 sm:w-[28rem] sm:opacity-60" />
      <GlitchBar flip className="absolute -right-56 top-12 -z-10 h-48 w-80 opacity-20 blur-[1px] sm:-right-24 sm:top-10 sm:h-72 sm:w-[30rem] sm:opacity-60" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <Tag>OpenAI Build Week Community Hackathon — Paris</Tag>
        </motion.div>
        <motion.h1
          initial="hidden"
          animate="visible"
          custom={1}
          variants={fadeUp}
          className="mt-8 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl"
        >
          Show it once.
          <br />
          Your agent learns forever.
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeUp}
          className="mt-6 max-w-xl text-balance text-lg text-muted-foreground"
        >
          Record or import a narrated workflow. Mimex understands the screen and your voice,
          then turns the demonstration into an editable, reusable Codex skill.
        </motion.p>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={3}
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Button size="lg" className="font-mono text-xs uppercase tracking-widest" asChild>
            <a href="/dashboard">Teach a workflow</a>
          </Button>
          <Button size="lg" variant="outline" className="font-mono text-xs uppercase tracking-widest" asChild>
            <a href="#how">See how it works</a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 w-full max-w-3xl border border-dashed"
        >
          <div className="flex items-center justify-between border-b border-dashed px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span>mimex_run</span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              connected
            </span>
          </div>
          <div className="grid text-left sm:grid-cols-2">
            <div className="flex flex-col items-center justify-center gap-4 border-b border-dashed p-10 sm:border-b-0 sm:border-r">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="grid size-16 place-items-center bg-primary text-primary-foreground"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </motion.div>
              <p className="font-mono text-xs text-muted-foreground">Screen + voice · one demonstration</p>
            </div>
            <div className="p-6 font-mono text-xs leading-relaxed text-muted-foreground">
              <p className="text-foreground"># learned-workflow/SKILL.md</p>
              <p className="mt-2">✓ intent extracted</p>
              <p>✓ reusable inputs identified</p>
              <p>✓ steps grounded in the video</p>
              <p className="text-emerald-300">✓ verification included</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const steps = [
  {
    title: "Record or import",
    body: "Share your screen and explain the workflow out loud, or upload an existing instructional video.",
  },
  {
    title: "Mimex understands",
    body: "Speech, scene changes, and visible context become a structured procedure with reusable inputs and checks.",
  },
  {
    title: "Improve and compose",
    body: "Edit the generated SKILL.md with AI, run it with Codex, or combine focused skills into a larger workflow.",
  },
]

function HowItWorks() {
  return (
    <section id="how" className="border-b">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
        >
          <Tag>How it works</Tag>
          <h2 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Record. Understand. Generate. Reuse.
          </h2>
        </motion.div>
        <div className="mt-12 grid gap-px border bg-border sm:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              custom={i}
              variants={fadeUp}
              className="bg-background p-8"
            >
              <p className="font-mono text-xs text-muted-foreground">0{i + 1}</p>
              <h3 className="mt-4 font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    title: "Learns from demonstrations",
    body: "Show the real workflow instead of spending hours translating tacit knowledge into agent instructions by hand.",
  },
  {
    title: "Sees and hears the context",
    body: "Mimex combines narration, screenshots, and scene changes to recover both what happened and why it matters.",
  },
  {
    title: "Editable and auditable",
    body: "Every workflow stays inspectable as a portable SKILL.md that you can download, refine, and own.",
  },
  {
    title: "Compose learned workflows",
    body: "Chain focused skills in a simple order while keeping every child independently runnable and replaceable.",
  },
]

function Features() {
  return (
    <section id="features" className="relative overflow-hidden border-b">
      <GlitchBar className="absolute -right-32 bottom-0 h-48 w-[26rem] opacity-40 blur-[1px]" />
      <div className="relative mx-auto w-full max-w-6xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
        >
          <Tag>Why Mimex</Tag>
          <h2 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Teach Codex how you work.
          </h2>
        </motion.div>
        <div className="mt-12 grid gap-px border bg-border sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              custom={i}
              variants={fadeUp}
              className="bg-background p-8"
            >
              <p className="font-mono text-xs text-muted-foreground">0{i + 1}</p>
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StartCallout() {
  return (
    <section id="run" className="border-b">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="relative overflow-hidden border px-8 py-16 text-center"
        >
          <GlitchBar className="absolute -left-20 -top-8 h-40 w-80 opacity-30 blur-[1px]" />
          <GlitchBar flip className="absolute -bottom-8 -right-20 h-40 w-80 opacity-30 blur-[1px]" />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              One workspace for every workflow
            </p>
            <h2 className="mx-auto mt-4 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Record complex work once. Reuse the knowledge.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Build a library of transparent skills, improve them over time, and compose them into larger workflows without a generic automation canvas.
            </p>
            <Button size="lg" className="mt-8 font-mono text-xs uppercase tracking-widest" asChild>
              <a href="/dashboard">Open your skill library</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const stack = [
  { name: "OpenAI Whisper", role: "speech-to-text" },
  { name: "GPT-5.6 Luna", role: "vision + skill generation" },
  { name: "ffmpeg", role: "scene detection + audio" },
  { name: "PostgreSQL", role: "accounts + skill library" },
  { name: "Hono · Node 22", role: "API + worker" },
  { name: "React · Vite · Tailwind", role: "shadcn/ui + motion" },
]

function Stack() {
  return (
    <section className="border-b">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
        >
          <Tag>Stack</Tag>
        </motion.div>
        <div className="mt-8 grid gap-px border bg-border sm:grid-cols-3">
          {stack.map((s, i) => (
            <motion.div
              key={s.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              custom={i}
              variants={fadeUp}
              className="bg-background p-6"
            >
              <p className="font-medium">{s.name}</p>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">{s.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const faqs = [
  {
    q: "What kinds of videos work best?",
    a: "Anything instructional: coding tutorials, product walkthroughs, ops runbooks recorded as screen shares, conference demos. If a human could learn a procedure from it, Mimex can turn it into a skill.",
  },
  {
    q: "What exactly do I get back?",
    a: "A portable SKILL.md with prerequisites, reusable inputs, grounded steps, verification, and gotchas extracted from the video. You can inspect it, update it with AI, download it, and use it with Codex.",
  },
  {
    q: "Can I combine several skills?",
    a: "Yes. Choose two to eight skills and put them in order. Mimex creates a readable parent skill that invokes each child explicitly, while every child remains independently editable and reusable.",
  },
  {
    q: "How does payment work?",
    a: "Mimex is €15 per month. Subscription management and secure checkout are handled by Stripe.",
  },
  {
    q: "Is my video stored?",
    a: "Videos are processed for the run and not kept afterward. The only artifact that persists is the skill you receive.",
  },
]

function Pricing() {
  return (
    <section id="pricing" className="border-b">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
        >
          <Tag>Pricing</Tag>
          <h2 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">One plan. Every workflow captured.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Turn your screen recordings and instructional videos into skills your agents can reuse.</p>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          custom={1}
          variants={fadeUp}
          className="mt-12 grid border md:grid-cols-2"
        >
          <div className="border-b p-8 md:border-b-0 md:border-r">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Mimex membership</p>
            <p className="mt-8 text-6xl font-semibold tracking-tight">15 €<span className="ml-2 text-base font-normal text-muted-foreground">/ month</span></p>
            <p className="mt-4 text-sm text-muted-foreground">Monthly subscription. Cancel anytime.</p>
            <Button size="lg" className="mt-8 font-mono text-xs uppercase tracking-widest" asChild>
              <a href="/billing">Start with Mimex</a>
            </Button>
          </div>
          <div className="grid auto-rows-fr gap-px bg-border sm:grid-cols-2 md:grid-rows-2">
            {[
              "Screen + microphone recording",
              "Transcript and visual analysis",
              "Agent-ready SKILL.md output",
              "Skill library and composition",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3 bg-background p-6 text-sm">
                <span className="mt-1 font-mono text-[10px]">■</span>{feature}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
        >
          <Tag>FAQ</Tag>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          custom={1}
          variants={fadeUp}
          className="mt-8 w-full"
        >
          <Accordion type="single" collapsible>
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 font-mono text-xs uppercase tracking-widest text-muted-foreground sm:flex-row">
        <p>Mimex — video in, skill out</p>
        <p>Built with OpenAI · Powered by GPT-5.6 Luna</p>
        <p>OpenAI Build Week — Paris, 2026</p>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <div className="min-h-dvh">
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <StartCallout />
        <Stack />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
