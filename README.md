# Mimex — show it once, give it to your agent

🏆 Winner — OpenAI Build Week Community Hackathon, Paris 2026.

Mimex turns demonstrated workflows into portable agent skills. It can learn from a narrated screen recording, or capture a browser workflow semantically and compile it into both a Codex `SKILL.md` and an executable Playwright test.

**Live product:** [getmimex.com](https://getmimex.com)

## The winning loop

```text
teach → generate → execute with new inputs → verify → repair
```

The **Teach Lab** demonstrates the complete loop:

1. A human creates customer `Acme` on the `Pro` plan once.
2. Mimex records semantic actions: roles, labels, stable test IDs, values, and the success assertion.
3. GPT‑5.6 Sol separates example values from reusable parameters.
4. Mimex produces a portable Codex skill and a Playwright test.
5. The generated automation creates `OpenAI` on `Enterprise` and verifies the result.
6. A simulated UI deployment breaks a selector.
7. GPT‑5.6 inspects the runtime failure plus the live DOM target inventory, repairs the smallest broken selector, and reruns the workflow successfully.

This proves that Mimex did not memorize click coordinates: it inferred the task, parameterized it, executed it with different data, checked the outcome, and recovered from UI drift.

## Judge quickstart — no rebuild required

Supported browser: current Chrome on desktop.

1. Open [getmimex.com/login](https://getmimex.com/login).
2. Select **Login with dev account**. No email or payment is required.
3. From the dashboard, select **Teach live**.
4. Select **Start teaching**.
5. Enter `Acme`, choose `Pro`, and select **Create customer**.
6. Select **Finish teaching & generate**.
7. Run the generated workflow with the prefilled `OpenAI` / `Enterprise` inputs.
8. After it passes, select **Simulate UI change**, run it again, then select **Repair with GPT‑5.6 & rerun**.
9. Download and inspect both the generated **Codex skill** and **Playwright** test.

The dev workspace is intentionally shared, so judges can also inspect previously generated examples after signing in again.

## Two learning modes

### 1. Semantic Teach Lab

- Captures DOM-aware browser actions instead of screen coordinates.
- Generalizes demonstrated values into explicit parameters.
- Generates a standards-compatible `SKILL.md` with inputs, steps, verification, and gotchas.
- Generates runnable `@playwright/test` TypeScript using stable selectors and assertions.
- Replays with new values in a visible execution trace.
- Detects selector drift and repairs from runtime evidence.

### 2. Narrated screen recording

```text
browser MediaRecorder upload
  ├─ ffmpeg → mono 64 kbps audio → Whisper transcript
  ├─ ffmpeg → scene-change frames + static-screen fallback
  └─ transcript + frames → GPT‑5.6 Luna → SKILL.md
```

Recordings are streamed to disk up to 500 MB. The in-process PostgreSQL worker claims pending jobs durably, cleans media after processing, and persists only the generated skill.

## OpenAI usage

- **GPT‑5.6 Sol + Responses API structured outputs:** workflow generalization, Codex skill authoring, Playwright generation, and evidence-based repair.
- **GPT‑5.6 Luna + vision:** efficient transcript-and-frame synthesis for uploaded recordings.
- **Whisper:** speech-to-text for narrated demonstrations.
- **Codex:** implemented and iterated the product, production backend, strict TypeScript UI, deployment system, and live verification loop with the founder.

Model output is constrained by strict JSON schemas. Demonstrations, page content, current skills, and DOM diagnostics are explicitly treated as untrusted data rather than model instructions.

## Architecture

- React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, Motion
- Hono on Node 22
- Prisma + PostgreSQL
- Better Auth magic links through Resend plus a shared hackathon dev account
- Stripe subscription checkout and customer portal
- System ffmpeg in a custom runtime image
- GitHub Actions → blue/green Docker releases on a Hetzner VPS
- Traefik TLS at `getmimex.com`

Production has no local-runtime deployment step: every push to `main` is built in GitHub Actions, copied to the VPS, migrated with `prisma migrate deploy`, health-checked, and switched to the new release slot.

## How Codex and Benjamin collaborated

Codex was used throughout the core build, not only for autocomplete:

- porting the video pipeline from serverless functions to a durable VPS worker;
- designing PostgreSQL-backed run ownership and recovery;
- implementing streamed browser recording uploads and media validation;
- building Better Auth, Resend, Stripe, and the production deployment workflow;
- diagnosing live VPS runs, ffmpeg streams, OpenAI calls, and deployment failures;
- turning the product strategy into the semantic teach/execute/verify/repair loop;
- generating strict implementations, then compiling and testing them against the live deployment.

Benjamin made the key product choices: keep the existing design language, deploy directly to production for the hackathon, use a frictionless dev account for judges, preserve the original recording experience, and focus the final demo on a complete learning loop instead of a broad SaaS surface.

## Build verification

Requirements: Node 22, pnpm 11, and system ffmpeg.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
```

Runtime environment variables are documented in `server/.env.example`. Real credentials are stored only in GitHub Actions secrets and `/home/ubuntu/envs/mimex.env` on the VPS.

## Repository map

- `src/` — landing, authentication, dashboard, recording, billing, and Teach Lab
- `server/` — Hono APIs, authentication, billing, uploads, worker, workflow compiler, and repair loop
- `prisma/` — PostgreSQL schema and migrations
- `.github/` — production build and blue/green VPS deployment
- `netlify/` — preserved legacy hackathon provider implementation

## Privacy

Uploaded recordings are deleted after processing. Only generated artifacts and run metadata persist. Users should avoid recording secrets or sensitive third-party data.
