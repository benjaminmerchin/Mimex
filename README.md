# Mimex — video in, skill out

🏆 Winner — OpenAI Build Week Community Hackathon, Paris 2026.

Mimex watches an instructional video (tutorial, product demo, screen-recorded runbook) and distills it into a ready-to-use `SKILL.md` any skill-aware coding agent (Claude Code, Codex…) can load and act on.

- **Landing**: https://mimex.netlify.app
- **Ginse listing** (fixed-price agent marketplace action): https://app.ginse.ai/benjaminmerchin-b7bf17/mimex

## How it works

```
POST /run {"video_url": "https://…/tuto.mp4"}     (≤100 MB)
  ├─ ffmpeg → mono 64 kbps audio ─▶ OpenAI Whisper (transcript)
  ├─ ffmpeg → frames at scene changes (≤12) ─▶ GPT-4o-mini vision
  └─ transcript + screenshots ─▶ SKILL.md
GET /status/:id → { skill_name, description, skill_md, download_url }
GET /skills/:id.md → downloadable SKILL.md
```

The `/run` endpoint implements the Ginse v3 provider contract: Ed25519 bearer token required, durable idempotency (Netlify Blobs), `202 pending` + `status_url` polling, per-run receipts.

## Stack

OpenAI (Whisper + GPT-4o-mini vision) · ffmpeg · Ginse · Netlify (Functions, Background Functions, Blobs) · React / Vite / Tailwind v4 / shadcn/ui / motion

## Development

```sh
npm install
npm run fetch-ffmpeg   # Linux x64 ffmpeg used by the deployed function
echo "OPENAI_API_KEY=sk-…\nINTERNAL_TOKEN=$(openssl rand -hex 24)" > .env
npx netlify dev        # site + functions on :8888
```

Deploy: `npx netlify deploy --build --prod` (env vars `OPENAI_API_KEY` and `INTERNAL_TOKEN` must be set on the Netlify site). The Ginse manifest is served from `public/.well-known/ginse.json`; republish with the Ginse CLI (`apps verify` → new version) after changing it.
