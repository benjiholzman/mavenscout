# Runbook: MavenScout POC environment (AWS)

| | |
|---|---|
| Status | Living runbook. Part A run. Parts B, C and D written, not run, and waiting for review and approval |
| Phase | P1 (Parts A to C), P1 to P2 (Part D) |
| Task | AWS environment setup |
| Owner | Krish Tomar (AWS environment setup), Guillermo Sandoval (project lead, approves and runs admin steps) |
| Date | 2026-11-16 |
| Sources | SOW sections 9 and 13; read-only checks of 2026-11-09 and 2026-11-13; model decision record of 2026-11-14 (Luna and Sol for v1); engine blueprint v4 (`loop8/docs/architecture/index.html` and the shared web page: components, settings, steps 3 to 7) |

This runbook covers every AWS resource Loop8 creates for the POC in the customer's MavenScout AWS account: how it is created, how to check it and how to remove it.

Per SOW section 9 there is no Infrastructure as Code for this POC. Resources are created with the AWS CLI commands below, and this file is the record. Per SOW section 13 the environment is temporary: it is decommissioned 30 days after the demo unless agreed otherwise, and the customer pays its AWS cost.

## Rules

1. **Every resource carries the tag** `aws-apn-id = pc:8m1j53s4l98quhnwq6wgbhf0l`, plus `Project = mavenscout` and `Environment = dev`.
2. **Region:** `us-east-1`. Models are called through US cross-region inference profiles, so requests can be served in us-east-1, us-east-2 or us-west-2. Pass `--region` on every command and do not rely on a CLI default.
3. **No account IDs, secrets or email addresses in this file.** The repo is public. Commands read the account ID at run time, and inputs such as the alert email are set in the shell, not written here.
4. **Nothing in Parts B, C or D runs without explicit approval from the project lead** (`loop8/CLAUDE.md` section 8). Read-only checks in Part A are always allowed.
5. Add each created resource to the inventory at the bottom the same day it is created.
6. Every name starts with `mavenscout-dev-` so the whole environment can be found and removed together.

## Access

| Who | Access | Can run |
|---|---|---|
| Loop8 engineers | Read-only role | Part A |
| Loop8 project lead | Admin | Parts B, C, D and teardown, after approval |

Set the profile for whichever access you have before running anything:

```bash
export AWS_PROFILE=<your-mavenscout-profile>
export AWS_REGION=us-east-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

## Decided inputs

These come from the model decision of 2026-11-14 and the architecture blueprint. They are used across Parts B to D.

| Input | Value | Source |
|---|---|---|
| Fit model (Haiku role) | GPT-6 Luna, inference profile `us.openai.gpt-6-luna` | Model decision, findings of 2026-11-13 |
| Extraction and summary model (Sonnet role) | GPT-6 Sol. Exact inference profile id to read from Part A3 before use | Model decision |
| Embedding model | Titan Text Embeddings V2, `amazon.titan-embed-text-v2:0`, 1024 dimensions | Blueprint, findings |
| Claude Haiku 5.5 and Sonnet 5.5 | Kept as later comparison variants. Blocked by a quota of 0 | Model decision |
| Worker Lambda timeout | 180 seconds, with a continuation when under 20 seconds remain | Blueprint |
| api Lambda timeout | 10 seconds, no model calls | Blueprint |
| SQS visibility timeout | 1,080 seconds (6 times the worker timeout) | Blueprint, AWS guidance |
| Receives before the dead-letter queue | 5 | Blueprint, AWS guidance |
| S3 object expiry | 7 days for `inputs/` and `results/`. The index artifact under `index/` is kept | Blueprint, change of issue 69 |
| Vector database | OpenSearch Serverless (chosen). The build check in Part C picks between its newer and classic collection types | Blueprint v4 |
| Jobs running at once | 2 to 3, to protect the Bedrock quotas (proposal). AWS allows a minimum of 2 for an SQS event source | Blueprint v4 |
| Worker memory | 1 GB, the value used in the blueprint's cost estimate (not yet confirmed as the setting) | Blueprint v4 |
| Presigned result links | Valid for 5 minutes | Blueprint v4 |

## Inputs still open

| Input | Needed for | Who decides | Value |
|---|---|---|---|
| `BUDGET_USD` | B1 budget alarm. The customer pays (SOW 13.3), so he agrees it. Luna and Sol have no published price yet | Project manager with the customer | TBD |
| `ALERT_EMAIL` | B1 and D3 alerts | Project lead | TBD, never written in this file |
| Which Supabase project the engine reads | B2 secret value | Project lead | TBD |
| `SOL_PROFILE` | B3 smoke test | Read from Part A3 | TBD |
| OpenSearch collection type (newer or classic) | Part C | Build check result | TBD |
| `APP_ORIGIN` | D1 S3 CORS and D7 API CORS | Project lead | TBD |
| API throttle rate and burst | D7 | Walking skeleton plan | TBD |

---

## Part A: read-only checks (any engineer)

Run these and record the answers in "Findings".

```bash
# A1. Who am I, which account
aws sts get-caller-identity

# A2. Anything already in the account (tagged or not)
aws resourcegroupstaggingapi get-resources --region $AWS_REGION \
  --query 'ResourceTagMappingList[].ResourceARN' --output text
aws lambda list-functions --region $AWS_REGION --query 'Functions[].FunctionName'
aws secretsmanager list-secrets --region $AWS_REGION --query 'SecretList[].Name'
aws budgets describe-budgets --account-id $ACCOUNT_ID --query 'Budgets[].BudgetName'
aws opensearchserverless list-collections --region $AWS_REGION

# A3. Bedrock: models and inference profiles in the region
aws bedrock list-foundation-models --region $AWS_REGION \
  --query 'modelSummaries[?contains(outputModalities, `TEXT`) || contains(outputModalities, `EMBEDDING`)].[modelId,providerName,modelLifecycle.status]' \
  --output table
aws bedrock list-inference-profiles --region $AWS_REGION \
  --query 'inferenceProfileSummaries[].[inferenceProfileId,status]' --output table

# A4. Bedrock: is each chosen model usable in this account?
#     Run for Luna, Sol and Titan V2 (model ids, not profile ids).
aws bedrock get-foundation-model-availability --region $AWS_REGION --model-id <model-id>

# A5. Bedrock: has the Anthropic first-use form been submitted? (error = not yet)
aws bedrock get-use-case-for-model-access --region $AWS_REGION

# A6. Bedrock quotas (tokens and requests per minute)
aws service-quotas list-service-quotas --service-code bedrock --region $AWS_REGION \
  --query 'Quotas[?contains(QuotaName, `tokens per minute`) || contains(QuotaName, `requests per minute`)].[QuotaName,QuotaCode,Value]' \
  --output table

# A7. Support plan (SubscriptionRequiredException = Basic)
aws support describe-severity-levels --region us-east-1

# A8. Which Regions each US inference profile can route to
aws bedrock get-inference-profile --region $AWS_REGION \
  --inference-profile-identifier us.openai.gpt-6-luna --query 'models[].modelArn'
aws bedrock get-inference-profile --region $AWS_REGION \
  --inference-profile-identifier $SOL_PROFILE --query 'models[].modelArn'

# A9. Past quota requests and their status
aws service-quotas list-requested-service-quota-change-history \
  --service-code bedrock --region $AWS_REGION
```

Read-only access cannot invoke a model (`bedrock:InvokeModel` is not a read action), so the smoke test is in Part B.

### Findings

| Check | Result | Date |
|---|---|---|
| A1 account and role | Read-only role in the MavenScout account (account ID not recorded here) | 2026-11-09 |
| A2 existing resources | No Lambda functions and no budgets | 2026-11-09 |
| A3 models and profiles | Claude Haiku 5.5, Claude Sonnet 5.5 and Titan Text Embeddings V2 listed; the 5.5 models are reachable only through inference profiles (US and global, both ACTIVE). GPT-6 Luna is in Bedrock as `openai.gpt-6-luna`, reachable through `us.openai.gpt-6-luna`. GPT-6 Sol, GPT-6.1 Sol, GPT-6.1 Terra and GPT-6 Astra are also listed, with active `us.` and `global.` profiles | 2026-11-09, 2026-11-13 |
| A4 model availability | Luna and Sol show AUTHORIZED and AVAILABLE. No model invoked, since the role is read-only. No published price for Luna | 2026-11-13 |
| A5 Anthropic use-case form | Not submitted | 2026-11-09, confirmed 2026-11-12 |
| A6 Bedrock quotas | Cross-region tokens per minute: GPT-6 Luna 4,000,000; GPT-6 Sol and GPT-6.1 Sol 2,000,000; GPT-6.1 Terra 2,000,000; GPT-6 Astra 0; Claude Haiku 5.5 and Sonnet 5.5 at 0 (adjustable; quota codes `L-47520EB7` Haiku, `L-94A31E46` Sonnet). Titan V2 on-demand: 600 requests and 300,000 tokens per minute, not adjustable | 2026-11-09, 2026-11-13 |
| A7 support plan | Business Support+ active on the customer account | 2026-11-09 |
| A8 profile routing Regions | Not yet run | |
| A9 quota request history | Requests for Haiku 5.5 (10,000,000 tokens per minute) and Sonnet 5.5 (6,000,000) were filed on 2026-11-12 with the project lead's approval. Later reads show the cases closed about 19 minutes after filing, with the applied value still 0, so not granted. A second set of requests may exist, since the creation times reported by two people differ; verify with this check. This is the only change to the account that we know of | 2026-11-13 |
| A10 models confirmed for the POC | Titan Text Embeddings V2, GPT-6 Luna (Fit) and GPT-6 Sol (extraction and summaries). Claude Haiku 5.5 and Sonnet 5.5 are not in the plan | 2026-11-16 |
| A11 bootstrap pre checks | Read only, with the Loop8 admin role. The account has no GitHub OIDC provider, so the bootstrap template creates it. The name `mavenscout-poc-tfstate` is free (HeadBucket answered 404). `Loop8-ReadOnly` is a plain IAM role at path `/`, so the budget action ARN pattern applies. No role with the `mavenscout` prefix exists and no budget exists. The CloudFormation stack `Loop8-Access` already exists and is not part of this POC | 2026-11-18 |

---

## Part B: account foundation (admin, after approval)

Shell values used by every step from here on:

```bash
APN='pc:8m1j53s4l98quhnwq6wgbhf0l'
# Tag formats differ by service, so each format is set once here.
TAGS_KV_JSON='[{"Key":"aws-apn-id","Value":"'$APN'"},{"Key":"Project","Value":"mavenscout"},{"Key":"Environment","Value":"dev"}]'
TAGS_MAP_JSON='{"aws-apn-id":"'$APN'","Project":"mavenscout","Environment":"dev"}'
TAGS_LOWER_JSON='[{"key":"aws-apn-id","value":"'$APN'"},{"key":"Project","value":"mavenscout"},{"key":"Environment","value":"dev"}]'
LUNA_PROFILE='us.openai.gpt-6-luna'
SOL_PROFILE='<from A3>'
EMBED_MODEL='amazon.titan-embed-text-v2:0'
```

### B1. Budget alarm

Alerts at 80% of actual spend and 100% of forecast spend. A budget alarm only warns; it does not stop spending.

```bash
aws budgets create-budget --account-id $ACCOUNT_ID \
  --budget '{"BudgetName":"mavenscout-dev-monthly","BudgetLimit":{"Amount":"'$BUDGET_USD'","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[
    {"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80,"ThresholdType":"PERCENTAGE"},
     "Subscribers":[{"SubscriptionType":"EMAIL","Address":"'$ALERT_EMAIL'"}]},
    {"Notification":{"NotificationType":"FORECASTED","ComparisonOperator":"GREATER_THAN","Threshold":100,"ThresholdType":"PERCENTAGE"},
     "Subscribers":[{"SubscriptionType":"EMAIL","Address":"'$ALERT_EMAIL'"}]}
  ]' \
  --resource-tags "$TAGS_KV_JSON"
```

### B2. Secret for the Supabase connection

Created empty by Terraform (module `engine-secrets`), named `mavenscout/supabase`. The apply role can only manage secrets that start with `mavenscout/`. The worker and the profile indexer read profiles from Supabase through the shared pooler in transaction mode (port 6543), as the blueprint describes. The value is one JSON object, for example `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_DB_URL`, added by whoever holds it. It is never pasted into chat, tickets or this repo, and never goes through Terraform, the plan or the state.

The person who holds the values runs the script with the MavenScout session active. It shows the role and the last four digits of the account, asks for a typed yes, asks for each value with the typing hidden (empty skips a key), writes a temporary file only that user can read, uploads it and deletes it:

```bash
loop8/infra/scripts/put-secret.sh mavenscout/supabase SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_DB_URL
```

Check without showing the value:

```bash
aws secretsmanager describe-secret --region $AWS_REGION --secret-id mavenscout/supabase \
  --query '[Name,LastChangedDate]'
```

Who can read it: the engineers, through the role `mavenscout-engine-titan-invoke` (profile `mavenscout-titan`, see B3c). The pipeline attaches the policy `mavenscout-engine-secrets-read`, which allows only `secretsmanager:GetSecretValue` on the secrets of the module `engine-secrets`. `Loop8-ReadOnly` itself cannot read the secret and cannot be changed. To use the values without printing them, load them into the shell and show only the key names:

```bash
aws secretsmanager get-secret-value --profile mavenscout-titan --region $AWS_REGION \
  --secret-id mavenscout/supabase --query SecretString --output text | jq 'keys'
```

### B3. Bedrock smoke test

One call to each chosen model, recording tokens and latency. This is step 5 of the blueprint. Luna and Sol are third-party models sold through AWS Marketplace, so the first call from the account may create the Marketplace subscription. Run it with the admin role for that reason.

```bash
# Luna (Fit)
aws bedrock-runtime converse --region $AWS_REGION --model-id $LUNA_PROFILE \
  --messages '[{"role":"user","content":[{"text":"Reply with OK"}]}]' \
  --query '{text: output.message.content[0].text, usage: usage, latencyMs: metrics.latencyMs}'

# Sol (extraction and summaries)
aws bedrock-runtime converse --region $AWS_REGION --model-id $SOL_PROFILE \
  --messages '[{"role":"user","content":[{"text":"Reply with OK"}]}]' \
  --query '{text: output.message.content[0].text, usage: usage, latencyMs: metrics.latencyMs}'

# Titan V2 (embeddings, 1024 dimensions)
aws bedrock-runtime invoke-model --region $AWS_REGION --model-id $EMBED_MODEL \
  --body '{"inputText":"household panel surveys","dimensions":1024,"normalize":true}' \
  --cli-binary-format raw-in-base64-out titan-out.json
python -c "import json; d=json.load(open('titan-out.json')); print(len(d['embedding']), d['inputTextTokenCount'])"
rm titan-out.json
```

Record the token counts and latency in the inventory notes. They are the first measured numbers for the cost per ranking.

### B3c. Titan invoke access for the engineers

The pipeline creates the policy `mavenscout-engine-bedrock-invoke` (`bedrock:InvokeModel` on Titan V2 only) and the role `mavenscout-engine-titan-invoke` that carries it. The role trusts only `Loop8-ReadOnly`. The policy is not attached to `Loop8-ReadOnly`, because a Loop8 guardrail denies any change to that role (found on 2026-11-18, AccessDenied with the admin role).

Each engineer adds this profile once to `~/.aws/config`, with the account ID of the MavenScout account and the name of the profile they already use for `Loop8-ReadOnly`:

```ini
[profile mavenscout-titan]
role_arn = arn:aws:iam::<account-id>:role/mavenscout-engine-titan-invoke
source_profile = <the Loop8-ReadOnly profile>
region = us-east-1
```

Then run the embedding script with `AWS_PROFILE=mavenscout-titan`. Check with `aws sts get-caller-identity --profile mavenscout-titan`, which must show the assumed role `mavenscout-engine-titan-invoke`. The budget deny policy also targets this role, so the 100% budget cut removes the model access too. The role also reads the secret `mavenscout/supabase` since the policy `mavenscout-engine-secrets-read` was added (B2). The name `titan-invoke` is narrower than what the role does, and it is kept because every engineer has a profile that points to it.

Models the role can call (read from the account on 2026-11-18, Nova added on 2026-11-20):

1. Titan Text Embeddings V2. Model id `amazon.titan-embed-text-v2:0`, called directly.
2. GPT-6 Luna, for Fit. Call it with the profile id `us.openai.gpt-6-luna` (model id `openai.gpt-6-luna`).
3. GPT-6 Sol, for extraction and summaries. Call it with the profile id `us.openai.gpt-6-sol` (model id `openai.gpt-6-sol`).
4. Amazon Nova Lite, temporary Fit model while Luna is blocked. Call it with the profile id `us.amazon.nova-lite-v1:0` (model id `amazon.nova-lite-v1:0`).
5. Amazon Nova Pro, temporary model for extraction and summaries while Sol is blocked. Call it with the profile id `us.amazon.nova-pro-v1:0` (model id `amazon.nova-pro-v1:0`).
6. Amazon Nova 2 Lite, comparison model for Fit. Call it with the profile id `us.amazon.nova-2-lite-v1:0` (model id `amazon.nova-2-lite-v1:0`). It allows 200 requests per minute, half of Nova Lite, and that limit is not adjustable.

Luna and Sol are rejected with `not available for this account` since 2026-11-19, and the sales request that AWS support asked for is open. Nova needs no Marketplace subscription or sales enablement. The plan is in [nova-temporary-models-plan.md](../planning/nova-temporary-models-plan.md). Items 4 and 5 are in the role since the apply of 2026-11-20 (pull request 57). Item 6 is in the role since the apply of 2026-11-20 (pull request 59). Nova 2 Pro does not exist in the account.

Call Luna, Sol and Nova with the profile id, never with the model id alone. The profile routes to us-east-1, us-east-2 and us-west-2, and the policy allows the profile and the model in all three. The Converse API needs the same permission as `InvokeModel`. The role cannot call any other model. A token alarm exists for each model, with estimated thresholds that are reviewed after the first measured run.

Check each model with a small call before building on it:

```bash
aws bedrock-runtime converse --region us-east-1 --profile mavenscout-titan \
  --model-id us.openai.gpt-6-luna \
  --messages '[{"role":"user","content":[{"text":"Reply with OK"}]}]' \
  --query 'output.message.content[0].text'
```

### B4. Unblock Claude Haiku and Sonnet (optional, in parallel)

The Claude models are no longer in the plan (Titan V2, GPT-6 Luna and GPT-6 Sol are confirmed), so this is optional and only needed for a later comparison. Both steps act on behalf of the customer's account, so they need the customer's agreement through the project manager.

1. Submit the Anthropic use case form in the console (Bedrock, Model access). It asks for the organization's legal name, website and industry, which the customer gives or confirms.
2. Re-file the cross-region tokens per minute increases in us-east-1 with a detailed description of the workload:

```bash
aws service-quotas request-service-quota-increase --region $AWS_REGION \
  --service-code bedrock --quota-code L-47520EB7 --desired-value 10000000   # Haiku 5.5
aws service-quotas request-service-quota-increase --region $AWS_REGION \
  --service-code bedrock --quota-code L-94A31E46 --desired-value 6000000    # Sonnet 5.5
```

If the requests close again without a grant, open a support case that cites the case ids in the 2026-11-13 findings. Re-run A6 and A9 after each step.

---

## Part C: OpenSearch Serverless test (admin, after approval)

Step 6 of the blueprint. OpenSearch Serverless is the chosen vector database. The build check picks between its newer type and its classic type, with a measured cost, before Part D depends on it. The test loads a few hundred fragments, checks filtering by a list of profile ids, and compares recall against exact search.

The blueprint describes a newer collection type with no minimum capacity that scales to zero after 10 idle minutes, and a classic type with a minimum of 2 OCUs (about $350 a month, or about $175 with standby replicas off). The CLI exposes `--standby-replicas`, `--vector-options` and `--collection-group-name` on `create-collection`; which of these selects the newer type is **not confirmed here** and must be checked in the current AWS documentation before running C4.

```bash
# C1. Encryption policy (AWS owned key)
aws opensearchserverless create-security-policy --region $AWS_REGION \
  --name mavenscout-dev-enc --type encryption \
  --policy '{"Rules":[{"ResourceType":"collection","Resource":["collection/mavenscout-dev-vectors"]}],"AWSOwnedKey":true}'

# C2. Network policy. Public endpoint for the POC: the Lambdas run outside a VPC,
#     and access is still limited by the data access policy in C3.
aws opensearchserverless create-security-policy --region $AWS_REGION \
  --name mavenscout-dev-net --type network \
  --policy '[{"Rules":[{"ResourceType":"collection","Resource":["collection/mavenscout-dev-vectors"]}],"AllowFromPublic":true}]'

# C3. Data access policy: the admin running the test now; the worker role is added in D4.
ADMIN_ARN=$(aws sts get-caller-identity --query Arn --output text)
aws opensearchserverless create-access-policy --region $AWS_REGION \
  --name mavenscout-dev-data --type data \
  --policy '[{"Rules":[
      {"ResourceType":"index","Resource":["index/mavenscout-dev-vectors/*"],"Permission":["aoss:*"]},
      {"ResourceType":"collection","Resource":["collection/mavenscout-dev-vectors"],"Permission":["aoss:*"]}],
    "Principal":["'$ADMIN_ARN'"]}]'

# C4. Collection (type flags to confirm first, see above)
aws opensearchserverless create-collection --region $AWS_REGION \
  --name mavenscout-dev-vectors --type VECTORSEARCH \
  --standby-replicas DISABLED \
  --tags "$TAGS_LOWER_JSON"
```

The security and access policies are not taggable; they are found by their `mavenscout-dev-` names. Record the test result (type chosen, recall, filter behaviour, measured cost per hour) in the inventory notes. If the classic type is chosen after testing the newer one, delete the test collection with the teardown command and create it again with the chosen type.

---

## Part D: engine resources for the walking skeleton (admin, after approval)

**Replaced by Terraform on 2026-11-18.** The resources of this part are created by the modules `engine-data` and `engine-api` in `loop8/infra`, through the pipeline, with names that start with `mavenscout-engine-` (the apply role can only manage that prefix). Do not run the commands below by hand. They stay as a reference of what the modules create. See `loop8/docs/planning/engine-deploy-plan.md`.

Step 7 of the blueprint: the API, the api Lambda, the queue, DynamoDB, S3 and a worker with a stub engine, so the asynchronous pipeline is tested before any model spend. Run Part D only after the walking skeleton plan is approved and its open inputs (runtime, memory, concurrency, throttling, app origin) are set. The DynamoDB key schema below is a proposal for that plan to confirm.

### D1. S3 bucket for job inputs and results

Private, encrypted by default, objects expire after 7 days, CORS for the app origin only.

```bash
BUCKET=mavenscout-dev-jobs-$ACCOUNT_ID
aws s3api create-bucket --region $AWS_REGION --bucket $BUCKET
aws s3api put-public-access-block --bucket $BUCKET \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-tagging --bucket $BUCKET --tagging '{"TagSet":'"$TAGS_KV_JSON"'}'
aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET \
  --lifecycle-configuration '{"Rules":[{"ID":"expire-7-days","Status":"Enabled","Filter":{},"Expiration":{"Days":7}}]}'
aws s3api put-bucket-cors --bucket $BUCKET \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["'$APP_ORIGIN'"],"AllowedMethods":["GET"],"AllowedHeaders":["*"],"MaxAgeSeconds":3000}]}'
```

### D2. DynamoDB table for job state

On-demand, with items expiring through TTL. Holds job state and progress, per-candidate checkpoints, idempotency keys and daily counters.

```bash
aws dynamodb create-table --region $AWS_REGION \
  --table-name mavenscout-dev-jobs \
  --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --tags "$TAGS_KV_JSON"
aws dynamodb wait table-exists --region $AWS_REGION --table-name mavenscout-dev-jobs
aws dynamodb update-time-to-live --region $AWS_REGION --table-name mavenscout-dev-jobs \
  --time-to-live-specification Enabled=true,AttributeName=expires_at
```

### D3. Queues and the failure alarm

The dead-letter queue first, then the jobs queue that redrives into it after 5 receives. An alarm emails as soon as anything lands in the dead-letter queue.

Three timings must stay in this order: the worker Lambda timeout (180 seconds, set in D5) is shorter than the job lease (`leaseMs`, 200 seconds, in `loop8/engine/src/shared/limits.ts`), which is shorter than the SQS visibility timeout (1080 seconds, set below). If the lease is shorter than the Lambda timeout, a second worker can take over a job that is still running. If the visibility timeout is shorter than the lease, the message comes back before the lease can expire. Change one of them only together with the others.

```bash
aws sqs create-queue --region $AWS_REGION --queue-name mavenscout-dev-jobs-dlq \
  --attributes MessageRetentionPeriod=1209600 --tags "$TAGS_MAP_JSON"
DLQ_URL=$(aws sqs get-queue-url --region $AWS_REGION --queue-name mavenscout-dev-jobs-dlq --query QueueUrl --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --region $AWS_REGION --queue-url $DLQ_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)

aws sqs create-queue --region $AWS_REGION --queue-name mavenscout-dev-jobs \
  --attributes '{"VisibilityTimeout":"1080","RedrivePolicy":"{\"deadLetterTargetArn\":\"'$DLQ_ARN'\",\"maxReceiveCount\":\"5\"}"}' \
  --tags "$TAGS_MAP_JSON"
QUEUE_URL=$(aws sqs get-queue-url --region $AWS_REGION --queue-name mavenscout-dev-jobs --query QueueUrl --output text)
QUEUE_ARN=$(aws sqs get-queue-attributes --region $AWS_REGION --queue-url $QUEUE_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)

TOPIC_ARN=$(aws sns create-topic --region $AWS_REGION --name mavenscout-dev-alerts \
  --tags "$TAGS_KV_JSON" --query TopicArn --output text)
aws sns subscribe --region $AWS_REGION --topic-arn $TOPIC_ARN \
  --protocol email --notification-endpoint $ALERT_EMAIL
aws cloudwatch put-metric-alarm --region $AWS_REGION \
  --alarm-name mavenscout-dev-jobs-dlq-not-empty \
  --namespace AWS/SQS --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=mavenscout-dev-jobs-dlq \
  --statistic Maximum --period 300 --evaluation-periods 1 \
  --threshold 0 --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN --tags "$TAGS_KV_JSON"
```

### D4. IAM roles for the two Lambdas

Inline policies, scoped to the resources above. The worker can call only the three chosen models. `bedrock:InvokeModel` also authorizes the Converse API.

```bash
TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
LOGS_STMT='{"Effect":"Allow","Action":["logs:CreateLogStream","logs:PutLogEvents"],"Resource":"arn:aws:logs:'$AWS_REGION':'$ACCOUNT_ID':log-group:/aws/lambda/mavenscout-dev-*:*"}'
TABLE_ARN=arn:aws:dynamodb:$AWS_REGION:$ACCOUNT_ID:table/mavenscout-dev-jobs
SECRET_ARN=$(aws secretsmanager describe-secret --region $AWS_REGION --secret-id mavenscout-dev/supabase --query ARN --output text)

# api role: S3 input write and result read, job table, send to queue. No model access.
aws iam create-role --role-name mavenscout-dev-api-role \
  --assume-role-policy-document "$TRUST" --tags "$TAGS_KV_JSON"
aws iam put-role-policy --role-name mavenscout-dev-api-role --policy-name mavenscout-dev-api \
  --policy-document '{"Version":"2012-10-17","Statement":['"$LOGS_STMT"',
    {"Effect":"Allow","Action":["s3:PutObject","s3:GetObject"],"Resource":"arn:aws:s3:::'$BUCKET'/*"},
    {"Effect":"Allow","Action":["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem"],"Resource":"'$TABLE_ARN'"},
    {"Effect":"Allow","Action":"sqs:SendMessage","Resource":"'$QUEUE_ARN'"}]}'

# worker role: queue consumer, job table, S3, Supabase secret, the three models, the vector collection.
aws iam create-role --role-name mavenscout-dev-worker-role \
  --assume-role-policy-document "$TRUST" --tags "$TAGS_KV_JSON"
aws iam put-role-policy --role-name mavenscout-dev-worker-role --policy-name mavenscout-dev-worker \
  --policy-document '{"Version":"2012-10-17","Statement":['"$LOGS_STMT"',
    {"Effect":"Allow","Action":["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes","sqs:ChangeMessageVisibility"],"Resource":"'$QUEUE_ARN'"},
    {"Effect":"Allow","Action":["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:Query"],"Resource":"'$TABLE_ARN'"},
    {"Effect":"Allow","Action":["s3:PutObject","s3:GetObject"],"Resource":"arn:aws:s3:::'$BUCKET'/*"},
    {"Effect":"Allow","Action":"s3:ListBucket","Resource":"arn:aws:s3:::'$BUCKET'"},
    {"Effect":"Allow","Action":"secretsmanager:GetSecretValue","Resource":"'$SECRET_ARN'"},
    {"Effect":"Allow","Action":"bedrock:InvokeModel","Resource":[
      "arn:aws:bedrock:'$AWS_REGION':'$ACCOUNT_ID':inference-profile/'$LUNA_PROFILE'",
      "arn:aws:bedrock:'$AWS_REGION':'$ACCOUNT_ID':inference-profile/'$SOL_PROFILE'",
      "arn:aws:bedrock:*::foundation-model/openai.gpt-6-*",
      "arn:aws:bedrock:'$AWS_REGION'::foundation-model/'$EMBED_MODEL'"]},
    {"Effect":"Allow","Action":"aoss:APIAccessAll","Resource":"arn:aws:aoss:'$AWS_REGION':'$ACCOUNT_ID':collection/*"}]}'
```

The worker role has `s3:ListBucket` so that a missing input object comes back as NoSuchKey, which the worker turns into the `input_missing` failure; without it S3 answers AccessDenied for a missing key. The api role does not need it.

Two follow-ups for the worker, done when they apply. If the vector database stays OpenSearch, add the worker role ARN to the `Principal` list of the C3 data access policy with `aws opensearchserverless update-access-policy`. The `openai.gpt-6-*` model pattern covers the foundation models behind both profiles in every Region the profiles route to (A8); narrow it to the exact model ids once A8 is recorded.

### D5. Log groups and the two Lambdas

Log groups are created first so they carry the tags and a retention period. The code packages come from the walking skeleton build in `loop8/engine`; worker memory is set by that plan.

```bash
RUNTIME=nodejs22.x
API_HANDLER=index.handler
WORKER_HANDLER=index.handler
npm --prefix loop8/engine ci && npm --prefix loop8/engine run build

for fn in api worker; do
  aws logs create-log-group --region $AWS_REGION \
    --log-group-name /aws/lambda/mavenscout-dev-$fn --tags "$TAGS_MAP_JSON"
  aws logs put-retention-policy --region $AWS_REGION \
    --log-group-name /aws/lambda/mavenscout-dev-$fn --retention-in-days 14
done

ENV_JSON='{"Variables":{"JOBS_TABLE":"mavenscout-dev-jobs","JOBS_BUCKET":"'$BUCKET'","JOBS_QUEUE_URL":"'$QUEUE_URL'","SUPABASE_SECRET_ID":"mavenscout-dev/supabase","ENGINE_VARIANT":"A","FIT_MODEL":"'$LUNA_PROFILE'","TEXT_MODEL":"'$LUNA_PROFILE'","EMBED_MODEL":"'$EMBED_MODEL'"}}'

aws lambda create-function --region $AWS_REGION --function-name mavenscout-dev-api \
  --runtime $RUNTIME --handler $API_HANDLER --zip-file fileb://loop8/engine/dist/api.zip \
  --role arn:aws:iam::$ACCOUNT_ID:role/mavenscout-dev-api-role \
  --timeout 10 --environment "$ENV_JSON" --tags "$TAGS_MAP_JSON"

aws lambda create-function --region $AWS_REGION --function-name mavenscout-dev-worker \
  --runtime $RUNTIME --handler $WORKER_HANDLER --zip-file fileb://loop8/engine/dist/worker.zip \
  --role arn:aws:iam::$ACCOUNT_ID:role/mavenscout-dev-worker-role \
  --timeout 180 --memory-size ${WORKER_MEMORY_MB:-1024} --environment "$ENV_JSON" --tags "$TAGS_MAP_JSON"
```

This sets variant A, the first variant to measure: Luna for everything, 5 summaries. Other variants change `ENGINE_VARIANT`, `TEXT_MODEL` and `SUMMARY_COUNT` together.

### D6. Connect the queue to the worker

One job per invocation. `MaximumConcurrency` caps how many jobs run at once, which protects the Bedrock quotas; AWS allows a minimum of 2.

```bash
aws lambda create-event-source-mapping --region $AWS_REGION \
  --function-name mavenscout-dev-worker --event-source-arn $QUEUE_ARN \
  --batch-size 1 --scaling-config MaximumConcurrency=${MAX_JOBS_AT_ONCE:-2} \
  --tags "$TAGS_MAP_JSON"
```

### D7. HTTP API with two routes

`POST /jobs` starts a job and `GET /jobs/{id}` returns its progress and a presigned result link (valid 5 minutes). Both go to the api Lambda. The blueprint also lists an optional `POST /jobs/{id}/summaries` route for on-demand summaries, built only if time allows; its command is included below, commented out. Route throttling is the main protection while sign-in is mocked.

```bash
API_ID=$(aws apigatewayv2 create-api --region $AWS_REGION --name mavenscout-dev-api \
  --protocol-type HTTP \
  --cors-configuration '{"AllowOrigins":["'$APP_ORIGIN'"],"AllowMethods":["GET","POST"],"AllowHeaders":["content-type","idempotency-key"]}' \
  --tags "$TAGS_MAP_JSON" --query ApiId --output text)

INTEGRATION_ID=$(aws apigatewayv2 create-integration --region $AWS_REGION --api-id $API_ID \
  --integration-type AWS_PROXY --payload-format-version 2.0 \
  --integration-uri arn:aws:lambda:$AWS_REGION:$ACCOUNT_ID:function:mavenscout-dev-api \
  --query IntegrationId --output text)

aws apigatewayv2 create-route --region $AWS_REGION --api-id $API_ID \
  --route-key 'POST /jobs' --target integrations/$INTEGRATION_ID
aws apigatewayv2 create-route --region $AWS_REGION --api-id $API_ID \
  --route-key 'GET /jobs/{id}' --target integrations/$INTEGRATION_ID
# Optional, only if the on-demand summaries route is built:
# aws apigatewayv2 create-route --region $AWS_REGION --api-id $API_ID \
#   --route-key 'POST /jobs/{id}/summaries' --target integrations/$INTEGRATION_ID

aws apigatewayv2 create-stage --region $AWS_REGION --api-id $API_ID \
  --stage-name '$default' --auto-deploy \
  --default-route-settings ThrottlingRateLimit=$API_RATE,ThrottlingBurstLimit=$API_BURST \
  --tags "$TAGS_MAP_JSON"

aws lambda add-permission --region $AWS_REGION --function-name mavenscout-dev-api \
  --statement-id apigw-invoke --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT_ID:$API_ID/*/*/jobs*"
```

---

## Verify tagging (after any create step)

```bash
aws resourcegroupstaggingapi get-resources --region $AWS_REGION \
  --tag-filters Key=Project,Values=mavenscout \
  --query 'ResourceTagMappingList[].[ResourceARN, Tags[?Key==`aws-apn-id`].Value | [0]]' --output table
aws budgets list-tags-for-resource \
  --resource-arn arn:aws:budgets::$ACCOUNT_ID:budget/mavenscout-dev-monthly
```

Every row must show the APN value. IAM roles are global, so check them with `aws iam list-role-tags --role-name <role>`. The OpenSearch security and access policies cannot be tagged.

---

## Teardown (30 days after the demo)

Admin only, in reverse order of creation. Skip any step whose resource was never created.

```bash
# Part D
aws apigatewayv2 delete-api --region $AWS_REGION --api-id $API_ID
for uuid in $(aws lambda list-event-source-mappings --region $AWS_REGION \
    --function-name mavenscout-dev-worker --query 'EventSourceMappings[].UUID' --output text); do
  aws lambda delete-event-source-mapping --region $AWS_REGION --uuid $uuid
done
for fn in api worker; do
  aws lambda delete-function --region $AWS_REGION --function-name mavenscout-dev-$fn
  aws logs delete-log-group --region $AWS_REGION --log-group-name /aws/lambda/mavenscout-dev-$fn
done
aws iam delete-role-policy --role-name mavenscout-dev-api-role --policy-name mavenscout-dev-api
aws iam delete-role --role-name mavenscout-dev-api-role
aws iam delete-role-policy --role-name mavenscout-dev-worker-role --policy-name mavenscout-dev-worker
aws iam delete-role --role-name mavenscout-dev-worker-role
aws cloudwatch delete-alarms --region $AWS_REGION --alarm-names mavenscout-dev-jobs-dlq-not-empty
aws sns delete-topic --region $AWS_REGION --topic-arn $TOPIC_ARN
aws sqs delete-queue --region $AWS_REGION --queue-url $QUEUE_URL
aws sqs delete-queue --region $AWS_REGION --queue-url $DLQ_URL
aws dynamodb delete-table --region $AWS_REGION --table-name mavenscout-dev-jobs
aws s3 rm s3://$BUCKET --recursive
aws s3api delete-bucket --region $AWS_REGION --bucket $BUCKET

# Part C
COLLECTION_ID=$(aws opensearchserverless batch-get-collection --region $AWS_REGION \
  --names mavenscout-dev-vectors --query 'collectionDetails[0].id' --output text)
aws opensearchserverless delete-collection --region $AWS_REGION --id $COLLECTION_ID
aws opensearchserverless delete-access-policy --region $AWS_REGION --name mavenscout-dev-data --type data
aws opensearchserverless delete-security-policy --region $AWS_REGION --name mavenscout-dev-net --type network
aws opensearchserverless delete-security-policy --region $AWS_REGION --name mavenscout-dev-enc --type encryption

# Part B
aws secretsmanager delete-secret --region $AWS_REGION \
  --secret-id mavenscout-dev/supabase --recovery-window-in-days 7
aws budgets delete-budget --account-id $ACCOUNT_ID --budget-name mavenscout-dev-monthly
```

Then re-run the tagging check: it must return no rows. Quota increases and the Marketplace subscriptions created by the first model calls are not resources and need no teardown.

---

## Inventory

| Resource | Name | Region | Created (date, by) | Removed |
|---|---|---|---|---|
| CloudFormation stack (bootstrap, from `loop8/infra/bootstrap/bootstrap.yaml`, created from a reviewed change set) | `mavenscout-bootstrap` | us-east-1 | 2026-11-18, project lead | |
| S3 bucket (Terraform state, kept on stack deletion, delete by hand at teardown) | `mavenscout-poc-tfstate` | us-east-1 | 2026-11-18, bootstrap stack | |
| IAM OIDC provider for GitHub Actions | `token.actions.githubusercontent.com` | global | 2026-11-18, bootstrap stack | |
| IAM role, read only plan role (pull requests and `loop8-develop`) | `mavenscout-gha-plan` | global | 2026-11-18, bootstrap stack | |
| IAM role, apply role (pinned to `loop8-develop`) | `mavenscout-gha-apply` | global | 2026-11-18, bootstrap stack | |
| Terraform state object | `poc/terraform.tfstate` in `mavenscout-poc-tfstate` | us-east-1 | 2026-11-18, first apply by the pipeline | |
| SNS topic for budget and alarm messages | `mavenscout-engine-alerts` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | One email subscription added by hand on 2026-11-18 and confirmed (address not recorded here, the repository is public) |
| SNS topic policy | `mavenscout-engine-alerts` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | |
| Monthly budget, 350 USD, alerts at 50% and 80% of actual spend and 100% of the forecast | `mavenscout-engine-monthly` | global | 2026-11-18, Terraform apply by the pipeline | |
| Budget action at 100% of actual spend, attaches the deny policy to the engineer roles | on `mavenscout-engine-monthly` | global | 2026-11-18, Terraform apply by the pipeline | |
| Budget action at 150% of actual spend, attaches the same deny policy to the worker role | on `mavenscout-engine-monthly` | global | 2026-11-20, Terraform apply by the pipeline (pull request 62) | The worker is the service that spends, so it has more room than the engineers |
| IAM policy that denies model invocation | `mavenscout-engine-bedrock-deny` | global | 2026-11-18, Terraform apply by the pipeline | |
| IAM role and inline policy for the budget action | `mavenscout-engine-budget-action` | global | 2026-11-18, Terraform apply by the pipeline | |
| CloudWatch alarm on Titan V2 input tokens per hour (5,000,000) | `mavenscout-engine-tokens-amazon.titan-embed-text-v2-0` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | |
| IAM policy that allows `bedrock:InvokeModel` on Titan V2 (version 1), and from 2026-11-18 on Luna and Sol through the US inference profiles (version 2), and Nova Lite and Nova Pro (version 3, 2026-11-20, pull request 57), and Nova 2 Lite (version 4, 2026-11-20, pull request 59) | `mavenscout-engine-bedrock-invoke` | global | 2026-11-18, Terraform apply by the pipeline | Not attached to `Loop8-ReadOnly`, see B3c |
| IAM role the engineers assume to call the models, trusts only `Loop8-ReadOnly` | `mavenscout-engine-titan-invoke` | global | 2026-11-18, Terraform apply by the pipeline | The budget deny also targets it |
| CloudWatch alarms on Luna and Sol input tokens per hour (20,000,000 and 5,000,000, estimates), one for the profile id and one for the model id. Four more for Nova Lite (20,000,000) and Nova Pro (5,000,000), applied on 2026-11-20 (pull request 57). Two more for Nova 2 Lite (20,000,000), applied on 2026-11-20 (pull request 59) | `mavenscout-engine-tokens-us.openai.gpt-6-luna`, `...-openai.gpt-6-luna`, `...-us.openai.gpt-6-sol`, `...-openai.gpt-6-sol` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | The alarm whose dimension receives data is kept after the first calls |
| S3 bucket for job inputs and results (private, encrypted, objects expire after 7 days) | `mavenscout-engine-jobs-<account id>` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | |
| DynamoDB table for job state (on demand, TTL on `expires_at`) | `mavenscout-engine-jobs` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | |
| SQS jobs queue (visibility timeout 1,080 s, 5 receives) and its dead letter queue | `mavenscout-engine-jobs`, `mavenscout-engine-jobs-dlq` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | |
| CloudWatch alarm on the dead letter queue, notifies the alert topic | `mavenscout-engine-jobs-dlq-not-empty` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | |
| IAM roles of the api and worker Lambdas, each with one inline policy. The api role has no model access. The worker role gets model and Supabase secret access in the change of issue 61 (below) | `mavenscout-engine-api-role`, `mavenscout-engine-worker-role` | global | 2026-11-18, Terraform apply by the pipeline | |
| CloudWatch log groups of the Lambdas, 14 days of retention | `/aws/lambda/mavenscout-engine-api`, `/aws/lambda/mavenscout-engine-worker` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | |
| Lambda functions, Node 22, stub engine (api 10 s, worker 180 s and 1,024 MB) | `mavenscout-engine-api`, `mavenscout-engine-worker` | us-east-1 | 2026-11-18, Terraform apply by the pipeline | |
| Event source mapping from the jobs queue to the worker, one job per call, at most 2 at once | on `mavenscout-engine-worker` | us-east-1 | 2026-11-18, Terraform apply by the pipeline, second run | |
| Worker role statements `InvokeEngineModels` (`bedrock:InvokeModel` on Titan V2 and on Nova Lite through the `us.` profile: the profile and the model in us-east-1, us-east-2 and us-west-2) and `ReadEngineSecrets` (`secretsmanager:GetSecretValue` on `mavenscout/supabase` only) | inline policy `mavenscout-engine-worker` | global | 2026-11-20, Terraform apply by the pipeline (pull request 62) | Nothing else changes in the policy |
| Environment of the functions: `FIT_MODEL`, `TEXT_MODEL` and `EMBED_MODEL` on the api, `SUPABASE_SECRET_ID` on the worker. `ENGINE` and `INDEX_ARTIFACT_S3_KEY` are set on the worker by the change of issue 69 (pending apply, see the next two rows) | `mavenscout-engine-api`, `mavenscout-engine-worker` | us-east-1 | 2026-11-20, Terraform apply by the pipeline (pull request 62) | With `engine_mode` empty the worker returns to the stub |
| Worker environment `ENGINE=semantic` and `INDEX_ARTIFACT_S3_KEY` (the key of the current index, see the next row). From the apply every job calls Titan V2 and Nova Lite | `mavenscout-engine-worker` | us-east-1 | 2026-11-21, Terraform apply by the pipeline (pull request 70). The key changed on 2026-11-21 (pull request 72, issue 71) | Set `engine_mode` to empty to turn the engine off |
| Index artifact, gzipped, 9.4 MB, built from the 98 local demo profiles with Titan V2 (964 fragments). Uploaded by hand with `aws s3 cp`. Current: version `13d7674312434864` under `index/index-13d7674312434864.json.gz`, with the six ToR 05 individuals under their database ids. First version: `bda903154e95230e` under `index/index.json.gz`, which keyed those six by slug so the engine answered `not_indexed` for them. `npm run check-artifact` reports 153 organization names in the free text of 40 profiles, known limitation 3 of the engine README | `index/` in the jobs bucket | us-east-1 | 2026-11-21, project lead | A new index goes under a new key and the key is changed in Terraform, which restarts the worker. Old index objects stay in the bucket until deleted by hand |
| Bucket lifecycle: the 7 day expiry is limited to `inputs/` and `results/`, so the index is kept. A third rule aborts incomplete uploads after 1 day | the jobs bucket | us-east-1 | 2026-11-21, Terraform apply by the pipeline (pull request 70) | Before this change the 7 day expiry covered every object, the index included |
| CloudWatch alarms on the worker: errors, throttles and a duration above 150 seconds, and on Bedrock throttles for Nova Lite (profile id and model id). All notify the alerts topic | `mavenscout-engine-worker-errors`, `...-worker-throttles`, `...-worker-duration`, `mavenscout-engine-throttles-us.amazon.nova-lite-v1-0`, `...-throttles-amazon.nova-lite-v1-0` | us-east-1 | 2026-11-20, Terraform apply by the pipeline (pull request 62) | Five alarms, about 0.10 dollars a month each (estimate) |
| HTTP API with `POST /jobs` and `GET /jobs/{id}`, the `$default` stage with throttling (5 per second, burst 10) and the Lambda invoke permission | `mavenscout-engine-api` | us-east-1 | 2026-11-18, Terraform apply by the pipeline, second run | URL read with `aws apigatewayv2 get-apis`, not recorded here |
| Secrets Manager secret with the Supabase values `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the anon key is the public publishable key) | `mavenscout/supabase` | us-east-1 | 2026-11-18, container by Terraform (PR 47), value uploaded by hand with `loop8/infra/scripts/put-secret.sh` | `SUPABASE_DB_URL` not set, not needed so far. Values are not recorded here |
| Lambda function for the extraction of the job description, Node 22, 25 s and 512 MB, with its role and its log group (14 days) | `mavenscout-engine-extract`, `mavenscout-engine-extract-role`, `/aws/lambda/mavenscout-engine-extract` | us-east-1 | 2026-11-23, Terraform apply by the pipeline (issue 86, pending apply) | The code is `loop8/engine/src/extract/` |
| Extract role statements: logs, `bedrock:InvokeModel` on Nova Pro through the `us.` profile (the profile and the model in us-east-1, us-east-2 and us-west-2) and `dynamodb:UpdateItem` on the jobs table limited to the keys `DAY#extract-*`. No bucket, queue or secret access | inline policy `mavenscout-engine-extract` | global | 2026-11-23, Terraform apply by the pipeline (issue 86, pending apply) | Nova Pro is temporary while Sol is blocked. A change of model is `extract_model` and `extract_profile_model_ids` |
| API route `POST /extract` to the extract Lambda, its invoke permission and its own throttling (1 per second, burst 3, estimates) on the `$default` stage | on `mavenscout-engine-api` | us-east-1 | 2026-11-23, Terraform apply by the pipeline (issue 86, pending apply) | Daily cap of 300 extractions in the Lambda, counted in the jobs table under `DAY#extract-<day>` |
| CloudWatch alarms on the extract Lambda (errors, and a duration above 20 seconds) and on Bedrock throttles for Nova Pro (profile id and model id). All notify the alerts topic | `mavenscout-engine-extract-errors`, `...-extract-duration`, `mavenscout-engine-throttles-us.amazon.nova-pro-v1-0`, `...-throttles-amazon.nova-pro-v1-0` | us-east-1 | 2026-11-23, Terraform apply by the pipeline (issue 86, pending apply) | Four alarms, about 0.10 dollars a month each (estimate) |
| Budget action at 150% of actual spend now lists the extract role next to the worker role | on `mavenscout-engine-monthly` | global | 2026-11-23, Terraform apply by the pipeline (issue 86, pending apply) | The plan of pull request 87 shows it as an update in place |
| IAM policy that allows `secretsmanager:GetSecretValue` on `mavenscout/supabase` only, attached to `mavenscout-engine-titan-invoke` | `mavenscout-engine-secrets-read` | global | 2026-11-19, Terraform apply by the pipeline (pull request 52) | Not attached to `Loop8-ReadOnly`, see B2 |

## Change log

| Date | Change |
|---|---|
| 2026-11-09 | Part A run and findings recorded |
| 2026-11-16 | Project lead: findings A8 to A10 added, Claude quota step marked optional |
| 2026-11-16 | Models changed to GPT-6 Luna, GPT-6 Sol and Titan V2 for v1 (model decision of 2026-11-14); findings of 2026-11-13 added; checks A8 and A9 added; Part C (OpenSearch test) and Part D (walking skeleton resources) written from the blueprint; resource names unified under `mavenscout-dev-`; teardown extended to every resource; aligned with blueprint v4 (OpenSearch chosen, 2 to 3 jobs at once, 1 GB worker, 5 minute presigned links, optional summaries route) |
| 2026-11-18 | Project lead: bootstrap stack and first Terraform apply recorded in the inventory |
| 2026-11-18 | Project lead: Titan role, Luna and Sol policy version 2, token alarms and alert subscription recorded in the inventory |
| 2026-11-18 | Project lead: engine data and API resources recorded in the inventory, Part D replaced by Terraform |
| 2026-11-18 | Project lead: Supabase secret recorded in the inventory, B2 describes the upload script |
| 2026-11-19 | Project lead: B2 and B3c describe how the engineers read the Supabase secret through the role, inventory row added, applied by the pipeline (pull request 52) |
| 2026-11-20 | Project lead: B3c and the inventory list Nova Lite and Nova Pro as temporary models while Luna, Sol, Haiku 5.5 and Sonnet 5.5 are blocked, applied by the pipeline (pull request 57) |
| 2026-11-20 | Project lead: Nova 2 Lite added to B3c and the inventory as a comparison model for Fit, applied by the pipeline (pull request 59) |
| 2026-11-20 | Project lead: inventory rows for the worker model and secret access, the function settings, the 150% budget action and the failure alarms, applied by the pipeline (pull request 62) |
| 2026-11-20 | Project lead: the Nova and worker rows are marked applied, after the simulation of the roles and a job with the stub engine (issue 63) |
| 2026-11-21 | Project lead: index artifact uploaded to the jobs bucket by hand. Inventory rows for `ENGINE=semantic` and the bucket lifecycle added as pending apply (issue 69) |
| 2026-11-21 | Project lead: `ENGINE=semantic` and the bucket lifecycle applied by the pipeline (pull request 70). First real job through the API finished PARTIAL with 29 `not_indexed` profiles, 6 of them individuals |
| 2026-11-21 | Project lead: index rebuilt with the six ToR 05 individuals under their database ids (version `13d7674312434864`), uploaded under a versioned key, and the worker key changed in Terraform (issue 71) |
| 2026-11-22 | Project lead: worker code updated with the new summary prompt and checks, applied by the pipeline (pull request 79). No resource changed |
| 2026-11-23 | Project lead: the extract Lambda, its role, the route `POST /extract`, its throttling, its alarms and the extract role in the 150% budget cut are recorded in the inventory as pending apply (issue 86) |
