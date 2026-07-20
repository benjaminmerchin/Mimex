# Invariants & conventions

1. Never commit `.env`, secrets, or API keys. `OPENAI_API_KEY` and friends live in env files on the VPS (`/home/ubuntu/envs/mimex.env`) and GitHub Actions secrets.
2. tlify/`, `public/.well-known/ginse.json`, or `public/samples/` — they back the live prod + Ginse listing. New work goes in `server/`, `src/`, `prisma/`, `.github/`.
3. Ginse v3 provider contract (must hold on the new backend, verified by `tests/contract.sh`):
   - `POST /run` without `Authorization: Bearer <token≥16 chars>` → **401**
   - Missing/invalid `Idempotency-Key` (8–200 chars) → **400**
   - Body may be flat `{"video_url": …}` or wrapped `{"input": {"video_url": …}}`; invalid input → **422**
   - First valid call → **202** `{"status":"pending","provider_operation_id","replayed":false,"status_url"}`
   - Same key + same body replay → same operation, `"replayed":true`, no second side effect (idempotency must be durable in Postgres, survive restarts)
   - Same key + different body → **409**
   - `GET /status/:id` pending → **202** with `status`, `provider_operation_id`, `status_url`; terminal → **200** with `output` `{skill_name, description, skill_md, download_url}` or `errod` → the SKILL.md as `text/markdown`, `Content-Disposition: attachment`
4. Work in branch `feat/vps-backend`, small commits, PRs to main. No force-push to main. No co-author trailers in commit messages.
5. TypeScript strict everywhere. Match existing code style (see `netlify/functions/` for reference implementation — port its logic, don't reinvent it).
6. ffmpeg is a system dependency: available in the Docker image (never `ffmpeg-static` npm package in server/ — platform trap).
