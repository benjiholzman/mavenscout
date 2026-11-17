# MavenScout ranking engine

This package is the server side of the ranking engine walking skeleton. It has two AWS Lambda functions: an API function that accepts a ranking job and reports its status, and a worker function that ranks the pool and writes the result. Today the worker runs a stub engine that produces stable fake scores, so the whole job pipeline can be tested before the real engine exists.

## Commands

Run these from this folder.

| Command | What it does |
|---|---|
| `npm install` | Installs the dependencies. |
| `npm test` | Builds the tests and runs them. |
| `npm run typecheck` | Type checks the source, tests and scripts. |
| `npm run local` | Runs one job end to end on this machine and prints the ranking. |
| `npm run local -- path/to/job.json` | Same, with your own job file instead of `samples/sample-job.json`. |
| `npm run build` | Writes `dist/api.zip` and `dist/worker.zip`. |

`npm run local` uses an in-memory store and queue and the stub engine. It prints rank, profile id, Fit and band for each profile, then the variant settings, the job phases and the end-to-end time in milliseconds. Set `LOCAL_VERBOSE=true` to also see the JSON log lines.

## Packaging

`npm run build` produces two zip files in `dist/`, one for the API function and one for the worker function. In both, the handler is `index.handler`. Deployment follows `loop8/docs/runbooks/poc-environment.md`, Part D.

## Environment variables

1. Infrastructure: `JOBS_TABLE`, `JOBS_BUCKET`, `JOBS_QUEUE_URL` and `AWS_REGION`.
2. Settings, read when a job is created and saved with the job: `ENGINE_VARIANT`, `FIT_MODEL`, `TEXT_MODEL`, `EMBED_MODEL`, `SUMMARY_COUNT`, `PARALLEL_CALLS`, `THRESHOLD` and `PROMPT_VERSION`. Each has a default, so none is required.
3. Stub engine controls: `STUB_DELAY_MS` adds a delay in milliseconds for each profile, `STUB_FAILURE_RATE` is the share of profiles (0 to 1) that fall back, and `STUB_CRASH=true` makes the engine throw. All are off when unset. They apply to the worker and to `npm run local`.

## Smoke test

The smoke test runs against a deployed API, not against your machine. Set `ENGINE_URL` to the API base URL and run:

```
node scripts/smoke-test.mjs
```

It posts `samples/sample-job.json` twice with one idempotency key and expects the same job id both times. It then checks the job status once a second for up to 120 seconds, downloads the result and checks that it has `results` and `settings`. It prints one summary line and exits 0 on success, or exits 1 with a message if the job fails, times out or the result is malformed.

## Local engine server

`npm run serve` starts an HTTP server on `127.0.0.1:8787` that runs the real API and worker code in memory with the stub engine. Use it to try the customer's app against the engine without any AWS resources. Set `LOCAL_ENGINE_PORT` to use another port. The command prints the URL when it is ready, and stops with Ctrl+C. Jobs live only in memory and are lost when the server stops.

To connect the app, set `VITE_ENGINE_URL=http://127.0.0.1:8787` in the app's `.env` and restart the Vite dev server. Use 127.0.0.1 and not `localhost`, because the server binds 127.0.0.1 only and on Windows `localhost` can resolve to ::1 first. The app still needs its own Supabase settings to load profiles, because the engine only ranks the profile ids it is sent.

This works with `npm run dev`, with the app on `http://localhost:5173`, which is the origin the server allows by default. `npm run dev:lan` is not supported, because it serves the app over HTTPS and a browser blocks an HTTPS page from calling this HTTP server. If Vite starts on another port, for example 5174 because 5173 is busy, set `LOCAL_ALLOW_ORIGIN` to that origin, such as `LOCAL_ALLOW_ORIGIN=http://localhost:5174`.

The stub options work here too. `STUB_DELAY_MS` adds a delay in milliseconds for each profile, `STUB_FAILURE_RATE` is the share of profiles (0 to 1) that fall back, and `STUB_CRASH=true` makes the engine throw so the job ends as failed.
