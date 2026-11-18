# engine-api

The compute and front door of the engine walking skeleton: the api and worker Lambdas with their roles, the queue to worker mapping and the HTTP API.

## What it does

1. Packages `dist/api/index.mjs` and `dist/worker/index.mjs` (the esbuild output of `loop8/engine`) with the archive provider, so an unchanged build does not update the functions.
2. Creates the api Lambda (10 seconds) and the worker Lambda (180 seconds), their roles with inline policies scoped to the engine resources, and log groups with 14 days of retention.
3. Maps the jobs queue to the worker, one job per invocation and at most `max_jobs_at_once` at the same time.
4. Creates the HTTP API with `POST /jobs` and `GET /jobs/{id}`, route throttling and the invoke permission.

## Not here yet

The worker runs the stub engine, so neither role has model, secret or vector database access. Those permissions, the secret header on the API and the 150% budget cut for the worker role are added in the change that connects Luna (`loop8/docs/planning/engine-deploy-plan.md`).

## API URL

The `api_url` output is sensitive, so the public pipeline log does not print it. Read it with `aws apigatewayv2 get-apis`.

## Test

```bash
terraform -chdir=loop8/infra/modules/engine-api init -backend=false
terraform -chdir=loop8/infra/modules/engine-api test
```
