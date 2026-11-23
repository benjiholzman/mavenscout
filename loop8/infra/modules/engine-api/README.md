# engine-api

The compute and front door of the engine walking skeleton: the api, worker and extract Lambdas with their roles, the queue to worker mapping and the HTTP API.

## What it does

1. Packages `dist/api/index.mjs`, `dist/worker/index.mjs` and `dist/extract/index.mjs` (the esbuild output of `loop8/engine`) with the archive provider, so an unchanged build does not update the functions.
2. Creates the api Lambda (10 seconds), the worker Lambda (180 seconds) and the extract Lambda (25 seconds, 512 MB), their roles with inline policies scoped to the engine resources, and log groups with 14 days of retention.
3. Maps the jobs queue to the worker, one job per invocation and at most `max_jobs_at_once` at the same time.
4. Creates the HTTP API with `POST /jobs`, `GET /jobs/{id}` and `POST /extract`, route throttling (the extraction route has its own, lower limits) and the invoke permissions. The extract Lambda timeout stays below the 30 seconds that API Gateway allows an HTTP API integration.

## Access of the worker

The worker role may call the models named in `worker_model_ids` (directly) and `worker_profile_model_ids` (through the cross region inference profile, with the profile and the model in each of `profile_regions`), and read the secrets in `secret_arns`, and nothing else. The api role has no model or secret access. With the lists empty the worker has none either.

## Access of the extract Lambda

The extract role has three statements and nothing else: logs, `bedrock:InvokeModel` on the models in `extract_profile_model_ids` (through the inference profile, with the profile and the model in each of `profile_regions`), and `dynamodb:UpdateItem` on the jobs table limited to the keys `DAY#extract-*`, which is the daily extraction counter. It has no bucket, queue or secret access, and with `extract_profile_model_ids` empty it has no model access. `extract_model` becomes `EXTRACT_MODEL` on the extract Lambda only. The role is listed in `worker_role_names` of the module `cost-guard`, so the 150% budget cut applies to it.

## Settings

`fit_model`, `text_model` and `embed_model` become the environment of the api, which gives them to every job. `supabase_secret_id` and `index_artifact_key` become the environment of the worker. An empty value leaves the variable out. `engine_mode` (empty, `stub` or `semantic`) becomes `ENGINE` on the worker and never on the api. Empty leaves `ENGINE` out, so the worker runs the stub. With `semantic` every job calls Titan V2 and the Fit and text models, and the worker needs the index key and the Supabase secret.

## Alarms

Five alarms notify `alerts_topic_arn`: worker errors, worker throttles, a worker run longer than `worker_error_alarm_seconds` (150 by default, below the 180 second timeout), extract errors, and an extraction longer than `extract_error_alarm_seconds` (20 by default, below the 25 second timeout). The model throttle alarms and the 150% budget cut are in the module `cost-guard`.

## API URL

The `api_url` output is sensitive, so the public pipeline log does not print it. Read it with `aws apigatewayv2 get-apis`.

## Test

```bash
terraform -chdir=loop8/infra/modules/engine-api init -backend=false
terraform -chdir=loop8/infra/modules/engine-api test
```
