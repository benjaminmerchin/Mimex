# Mimex — teach Codex how you work

🏆 Winner — OpenAI Build Week Community Hackathon, Paris 2026.

Mimex turns a long, narrated screen demonstration into an editable and reusable Codex `SKILL.md`. Record a workflow live or import an existing video, let Mimex recover the intent and procedure, then improve, download, and compose the resulting skills.

**Live product:** [getmimex.com](https://getmimex.com)

## The product loop

```text
record or import → understand → generate skill → verify → run with Codex
                                            ↓
                                   edit → compose → reuse
```

Mimex is a learning layer, not a generic workflow builder. Each generated skill remains independently inspectable and runnable. Composition creates a small parent `SKILL.md` that invokes selected child skills in order, so one step can later be replaced without relearning the entire workflow.

## Judge quickstart — no rebuild required

Use a current desktop version of Chrome.

1. Open [getmimex.com](https://getmimex.com) and select **Teach a workflow**.
2. Select **Login with dev account**. No email or payment is required.
3. In the skill library, select **New skill**.
4. Choose **Record screen live** and narrate a short procedure, or choose **Import existing video**.
5. Upload the recording and watch its pending state while Mimex processes it.
6. Download the generated `SKILL.md`, or select **Update with AI** to request a focused change.
7. Once the library contains two skills, select **Compose skills**, choose their order, and generate a readable parent skill.

The dev workspace is intentionally shared, so judges can inspect previously generated examples after signing in again.

## Recording pipeline

```text
browser MediaRecorder or video import
  ├─ streamed upload to disk, up to 500 MB
  ├─ ffmpeg → mono 64 kbps audio → Whisper transcript
  ├─ ffmpeg → scene-change frames + static-screen fallback
  └─ transcript + frames → GPT‑5.6 Luna → structured SKILL.md
```

The generated skill contains explicit prerequisites, reusable inputs, grounded steps, verification, and gotchas. The PostgreSQL worker claims pending jobs durably, and uploaded media is deleted after processing.

## Skill composition

Composition deliberately stays simple:

```text
[find relevant profiles]
          ↓
[prepare personalized outreach]
          ↓
[review before sending]
```

- Choose two to eight existing skills.
- Put them in execution order.
- Optionally describe the parent workflow's goal.
- GPT‑5.6 Sol generates a parent skill that explicitly invokes every child with `$child-skill-name`.
- Child skills remain independently editable, downloadable, and replaceable.

There are no conditions, loops, connector catalog, or visual automation canvas. Mimex composes learned knowledge instead of cloning n8n.

## How OpenAI is used

- **GPT‑5.6 Luna + vision:** synthesizes the transcript and sampled video frames into a grounded Codex skill, and applies requested edits to existing skills.
- **GPT‑5.6 Sol + Responses API structured outputs:** creates the composition layer between multiple existing skills while preserving their order and boundaries.
- **Whisper:** transcribes the user's spoken explanation.
- **Codex skills:** the portable output format. A skill packages focused instructions and can reference scripts or other resources; composed Mimex skills invoke focused child skills explicitly.
- **Codex:** collaborated on the production implementation, strict TypeScript UI, backend, deployment, live diagnostics, and product iteration described below.

Model outputs use strict JSON schemas. Transcripts, screenshots, current skills, and user instructions are treated as untrusted source material rather than model instructions.

## Architecture

- React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, Motion
- Hono on Node 22
- Prisma + PostgreSQL
- Better Auth magic links through Resend plus a shared hackathon dev account
- Stripe subscription checkout and customer portal
- System ffmpeg in a custom runtime image
- GitHub Actions → blue/green Docker releases on a Hetzner VPS
- Traefik TLS at `getmimex.com`

Production has no local application runtime. Every push to `main` is built by GitHub Actions, copied to the VPS, migrated with `prisma migrate deploy`, health-checked, and switched to the new release slot.

## How Codex and Benjamin collaborated

Codex was used across the core product rather than only for autocomplete:

- porting the video pipeline from serverless functions to a durable VPS worker;
- designing PostgreSQL-backed run ownership and recovery;
- implementing streamed browser uploads, media validation, live recording, and video import;
- building Better Auth, Resend, Stripe, and the production deployment workflow;
- diagnosing live VPS runs, ffmpeg streams, OpenAI calls, and deployment failures;
- iterating the product from a broad automation concept toward the focused record → understand → generate → compose loop;
- compiling, linting, deploying, and verifying each production iteration.

Benjamin made the key product decisions: preserve the existing visual language, deploy directly to production for the hackathon, provide a frictionless dev account for judges, keep skills transparent and portable, and make video-based workflow learning the center of Mimex.

## Setup and build verification

Requirements: Node 22, pnpm 11, and system ffmpeg.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
```

Runtime variables are documented in `server/.env.example`. Never commit real credentials. Production credentials live only in GitHub Actions secrets and `/home/ubuntu/envs/mimex.env` on the VPS.

For development-only Prisma migration generation, use Homebrew PostgreSQL 16 on `localhost` with the scratch database `mimex_scratch`. Never point local tooling at the VPS database. The Mimex server itself is deployed and run only through the GitHub Actions production workflow.

## Repository map

- `src/` — landing, authentication, skill library, recording/import, composition, and billing
- `server/` — Hono APIs, authentication, billing, uploads, worker, refinement, and skill composition
- `prisma/` — PostgreSQL schema and migrations
- `.github/` — production build and blue/green VPS deployment
- `netlify/` — preserved legacy hackathon provider implementation

## Privacy

Uploaded recordings are deleted after processing. Only generated artifacts and run metadata persist. Users should avoid recording secrets or sensitive third-party data.
