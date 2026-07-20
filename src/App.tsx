import { motion, type Variants } from "motion/react"
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
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <Button size="sm" className="font-mono text-xs uppercase tracking-widest" asChild>
          <a href="/login">Get started</a>
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
          Your videos know how.
          <br />
          Now your agent does too.
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeUp}
          className="mt-6 max-w-xl text-balance text-lg text-muted-foreground"
        >
          Mimex watches a tutorial, demo, or walkthrough and distills it into a
          ready-to-use <code className="bg-muted px-1.5 py-0.5 font-mono text-sm">SKILL.md</code> your
          coding agent can load and act on.
        </motion.p>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={3}
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Button size="lg" className="font-mono text-xs uppercase tracking-widest" asChild>
            <a href="/login">Start creating</a>
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
              <p className="font-mono text-xs text-muted-foreground">deploy-walkthrough.mp4</p>
            </div>
            <div className="p-6 font-mono text-xs leading-relaxed text-muted-foreground">
              <p className="text-foreground"># SKILL.md</p>
              <p className="mt-2">name: deploy-to-prod</p>
              <p>description: Ship the app the</p>
              <p>way the video does.</p>
              <p className="mt-2 text-foreground">## Steps</p>
              <p>1. Build with `npm run build`</p>
              <p>2. Preview, check routes</p>
              <p>3. Deploy, verify live URL</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const steps = [
  {
    title: "Point it at a video",
    body: "Paste a URL. Tutorials, product demos, conference talks, internal walkthroughs — anything with knowledge worth keeping.",
  },
  {
    title: "Mimex watches and distills",
    body: "It transcribes, follows what happens on screen, and extracts the intent: the steps, the commands, the gotchas mentioned in passing.",
  },
  {
    title: "Get a ready-to-use skill",
    body: "Out comes a clean SKILL.md — structured instructions your agent can load and act on immediately.",
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
            Video in. Skill out. Nothing in between.
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
    title: "Agent-native output",
    body: "Standard SKILL.md format with frontmatter, steps, and guardrails — drops straight into .agents/skills/ or .claude/skills/.",
  },
  {
    title: "Sees, not just hears",
    body: "Combines the transcript with what's on screen, so commands and UI paths make it into the skill accurately.",
  },
  {
    title: "Record in your browser",
    body: "Capture a screen walkthrough with system audio and your microphone, then let Mimex turn it into reusable instructions.",
  },
  {
    title: "Your private skill library",
    body: "Every generated skill stays attached to your account, ready to inspect, download, and reuse whenever your agent needs it.",
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
            Your videos are smart. Your agent should be too.
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
              Turn the way you work into skills your agent can reuse
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Sign in with a magic link, record a walkthrough, and keep the result in your private library.
            </p>
            <Button size="lg" className="mt-8 font-mono text-xs uppercase tracking-widest" asChild>
              <a href="/login">Open Mimex</a>
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
    a: "A SKILL.md file — name, description, and step-by-step instructions with the commands, paths, and caveats extracted from the video. It follows the emerging agent-skills convention, so it works with Claude Code, Codex, and other skill-aware agents.",
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
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
