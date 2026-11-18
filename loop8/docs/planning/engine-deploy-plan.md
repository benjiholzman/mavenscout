# Plan: deploy the walking skeleton of the engine with Terraform

| | |
|---|---|
| Status | Plan, not yet approved or executed |
| Phase | P2 (blueprint step 7, deployment) |
| Task | Create the engine resources of the walking skeleton in the customer account with Terraform and the existing pipeline, replacing runbook Part D |
| Owner | Guillermo Sandoval |
| Date | 2026-11-18 |
| Sources | `loop8/docs/runbooks/poc-environment.md` Part D, `loop8/docs/planning/walking-skeleton-plan.md`, `loop8/docs/planning/poc-start-plan.md`, `loop8/infra/bootstrap/bootstrap.yaml`, the code in `loop8/engine` |

All cost figures in this document are estimates from public AWS prices. None has been measured in this account.

## 1. What this task is for

Krish's walking skeleton (pull request 22, merged on 2026-11-18) runs only on a laptop. The customer will review the first build on 2026-11-23, so the skeleton has to run in the customer account. This plan creates its resources with Terraform, through the pipeline, instead of the AWS CLI commands of runbook Part D. The worker in this step uses the stub engine, so nothing in it can call a model or spend on AI.

## 2. What the design already decided

1. The flow is asynchronous: an HTTP API with `POST /jobs` and `GET /jobs/{id}`, an api Lambda, an SQS queue with a dead letter queue, a worker Lambda, one DynamoDB table and one S3 bucket. Source: engine blueprint v4.
2. Timings: worker timeout 180 seconds, lease 200 seconds, queue visibility timeout 1,080 seconds, 5 receives before the dead letter queue. The order is a rule, see the runbook D3.
3. Limits already in the code (`loop8/engine/src/shared/limits.ts`): body up to 512 KB, up to 5,000 pool ids, at most 200 candidates deep scored, 100 jobs per day.
4. Names start with `mavenscout-engine-`, because the apply role can only manage resources with that prefix. The runbook used `mavenscout-dev-`, which the apply role cannot create.
5. The funding tag comes from the provider default tags. No account ID, secret or role ARN goes in the repository.

## 3. What will be built

| Part | What |
|---|---|
| Module `engine-data` | S3 bucket `mavenscout-engine-jobs-<account id>` (private, encrypted, objects expire after 7 days, CORS for the app origins), DynamoDB table `mavenscout-engine-jobs` (on demand, key `pk` and `sk`, TTL on `expires_at`), the jobs queue and its dead letter queue, and an alarm that notifies the existing alert topic when the dead letter queue has a message |
| Module `engine-api` | Roles for the api and worker Lambdas with inline policies scoped to those resources, log groups with 14 days of retention, the two Lambdas (Node 22, worker 1,024 MB), the queue to worker mapping (one job per invocation, at most 2 jobs at once), the HTTP API with the two routes, route throttling and the invoke permission |
| Root | Calls the two modules and prints the API URL as an output |
| Workflow `.github/workflows/terraform.yml` | Sets up Node, runs `npm ci` and `npm run build` in `loop8/engine` before init in every job, and also triggers on changes under `loop8/engine/**`. The change is outside `loop8/`, so the issue states the reason |
| Runbook | Part D is marked as replaced by Terraform, and the inventory lists each resource after the apply |

The Lambda packages are made by Terraform from the esbuild output (`dist/api/index.mjs` and `dist/worker/index.mjs`) with the archive provider, not from the zips of `build.mjs`. The zip made by `build.mjs` changes at every build because it stores file times, so every apply would update the functions.

## 4. Assumptions

1. The app origin for CORS is not known. The first apply allows `http://localhost:5173`, and the deployed app origin is added by a pull request when the customer's app URL is known. Input needed from the project lead.
2. Proposed values, all estimates to be adjusted: route throttling of 5 requests per second with a burst of 10, at most 2 jobs at once, 1,024 MB for the worker.
3. The apply role was written for these services, but the plan role cannot prove that every action the provider needs is allowed. A missing action shows up at the first apply and is fixed by a change to the bootstrap template, which only the project lead can run.
4. Models, the secret header on the API and the 150% budget cut for the worker role are not part of this step, because the stub engine cannot spend. They are added in the change that connects Luna, see the remaining steps.

## 5. Impact analysis

1. Cost while idle: cents per month at public prices (estimate). The costs that grow are requests, which at demo volume are cents.
2. Exposure: the API URL ends up in the app bundle, so anyone can start a job. With the stub engine this cannot spend on AI. It is bounded by throttling, the daily cap of 100 jobs and the limit of 2 jobs at once. Job inputs (a job description and profile ids) are kept in S3 for 7 days. They are demo data.
3. Reversal: removing the modules in a pull request destroys the resources. The bucket is created with `force_destroy` so it can be removed with its objects. The DynamoDB table and queues hold no data that matters.
4. The apply role is not widened by this step.

## 6. Acceptance criteria

1. The plan on the pull request shows only additions and no destroy, and the apply succeeds.
2. With the sample job of `loop8/engine/samples/sample-job.json`, `POST /jobs` returns 202 with a job id and `GET /jobs/{id}` reaches DONE. Sending the same idempotency key twice returns the same job id.
3. Every resource carries the funding tag, checked with a read only call to the tagging API, and the dead letter queue alarm exists.
4. The pipeline stays green on the next pull request, with no pending changes in the plan.

## 7. Remaining steps

| # | Step | Who | Needs approval | Proof it worked |
|---|---|---|---|---|
| 1 | Review this plan and give the app origin | Project lead | Yes | Plan merged |
| 2 | `engine-data`, `engine-api`, root and workflow, by pull request | Project lead | Yes (pull request and merge) | Criteria 1 and 4 |
| 3 | Smoke test with the sample job | Project lead machine | No (calls the public API with demo ids) | Criterion 2 |
| 4 | Tell Krish the API URL for `VITE_ENGINE_URL` and update the runbook inventory | Project lead | No | Inventory rows, criterion 3 |
| 5 | Connect Luna: Bedrock permission for the worker role, the secret header and its parameter, the 150% budget cut, and the engine code that calls the model | Project lead and Krish | Yes | Variant A measured |

## 8. Secret containers (added on 2026-11-18)

The customer is sending the Supabase values. Terraform creates the empty secret `mavenscout/supabase` (module `engine-secrets`). The holder adds the value with `loop8/infra/scripts/put-secret.sh`, which asks for it hidden, uses a private temporary file and deletes it. No value goes through chat, the repository, the plan or the state. Cost is about $0.40 per secret per month (public price, estimate). The secret for the API header is added in the same way in the change that connects Luna. Acceptance: the plan shows one secret to add, and after the upload `describe-secret` shows a recent `LastChangedDate`.

## 9. Build record

| Date | Step | What was done and how it was checked |
|---|---|---|
| 2026-11-18 | 2, first apply | Pull request 40 merged. The plan showed 25 to add, 0 to change, 0 to destroy. The apply created 23 resources and failed on two: the event source mapping (`lambda:TagResource`) and the API stage (`apigateway:TagResource`), because the apply role lacked those actions. Terraform kept the partial state |
| 2026-11-18 | 2, bootstrap fix | Issue 41 and pull request 42 added the five tagging actions to the apply role. A change set of the stack `mavenscout-bootstrap` showed one change, the inline policy of the apply role, with no replacement. It was executed (`UPDATE_COMPLETE`) and the policy was read back |
| 2026-11-18 | 2, second apply | The merge of pull request 42 ran the apply again: 2 added, 0 changed, 0 destroyed |
| 2026-11-18 | 3, smoke test | With the sample job, the first `POST /jobs` returned 202 and the same idempotency key returned the same job id. The job reached DONE in 1.4 seconds with 0 fallbacks. Every engine resource carries the funding tag (read with the tagging API and `iam list-role-tags`) and the dead letter queue alarm is in state OK |
| 2026-11-18 | Finding | The pipeline logs of a public repository show the account ID, because the role ARNs are repository variables and GitHub masks only secrets. The plan comment replaces the ID since pull request 40. Moving the two ARNs to secrets and deleting the old runs is open |
