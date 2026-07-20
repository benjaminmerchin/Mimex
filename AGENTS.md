# Invariants & conventions

1. Never commit `.env`, secrets, or API keys. `OPENAI_API_KEY` and friends live in env files on the VPS (`/home/ubuntu/envs/mimex.env`) and GitHub Actions secrets.
2. tlify/`, `public/.well-known/ginse.json`, or `public/samples/` — they back the live prod + Ginse listing. New work goes in `server/`, `src/`, `prisma/`, `.github/`.
3. Ginse is out of scope for the self-hosted product. Do not port its provider endpoints or contract tests to `server/`. Keep the legacy Netlify functions and published manifest untouched unless Benjamin explicitly asks to decommission the old listing.
4. Work directly on `main` for the hackathon, with small commits pushed frequently. Never force-push. No co-author trailers in commit messages.
5. TypeScript strict everywhere. Match existing code style (see `netlify/functions/` for reference implementation — port its logic, don't reinvent it).
6. ffmpeg is a system dependency: available in the Docker image (never `ffmpeg-static` npm package in server/ — platform trap).

## Deployment & environments

7. There is no local application runtime. The workflow is push to GitHub, then GitHub Actions deploys to the VPS. Do not run the Mimex server or its worker locally.
8. Never connect to or target the shared VPS PostgreSQL directly from a development machine. Mimex uses the existing VPS PostgreSQL container through `internal-net`, with the separate `mimex` database and `/home/ubuntu/envs/mimex.env`.
9. Pushes to `main` deploy the `mimex` container at `getmimex.com`. Deployment must use the blue/green release slots, sanitized env file, Prisma `migrate deploy`, custom Mimex runtime image, Traefik, and in-container `/healthz` readiness check adapted from GetMaxxing.
10. The only permitted local PostgreSQL use is the Homebrew `postgresql@16` service on `localhost`, database `mimex_scratch`, solely for generating Prisma migrations. Never use a remote database for `prisma migrate dev`.
11. Authentication uses Better Auth magic links sent through Resend from `updates@getmimex.com`. Resend credentials live only in environment files and GitHub Actions secrets; never put them in source, fixtures, logs, or commits.
