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
4. Work directly on `main` for the hackathon, with small commits pushed frequently. Never force-push. No co-author trailers in commit messages.
5. TypeScript strict everywhere. Match existing code style (see `netlify/functions/` for reference implementation — port its logic, don't reinvent it).
6. ffmpeg is a system dependency: available in the Docker image (never `ffmpeg-static` npm package in server/ — platform trap).

## Deployment & environments

7. There is no local application runtime. The workflow is push to GitHub, then GitHub Actions deploys to the VPS. Do not run the Mimex server or its worker locally.
8. Never connect to or target the shared VPS PostgreSQL directly from a development machine. Mimex uses the existing VPS PostgreSQL container through `internal-net`, with the separate `mimex` database and `/home/ubuntu/envs/mimex.env`.
9. Pushes to `main` deploy the `mimex` container at `getmimex.com`. Deployment must use the blue/green release slots, sanitized env file, Prisma `migrate deploy`, custom Mimex runtime image, Traefik, and in-container `/healthz` readiness check adapted from GetMaxxing.
10. After a deploy, CI must run `tests/contract.sh` against the freshly deployed container and fail the workflow if the Ginse contract is red.
11. The only permitted local PostgreSQL use is the Homebrew `postgresql@16` service on `localhost`, database `mimex_scratch`, solely for generating Prisma migrations. Never use a remote database for `prisma migrate dev`.
12. Authentication uses Better Auth magic links sent through Resend from `updates@getmimex.com`. Resend credentials live only in environment files and GitHub Actions secrets; never put them in source, fixtures, logs, or commits.
