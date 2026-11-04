# Runbook: MavenScout POC environment (AWS)

AWS environment setup, Phase 1. Covers every AWS resource Loop8
creates for the POC in the customer's MavenScout AWS account: how it was created, how to check it,
and how to remove it.

Per SOW section 9 there is no Infrastructure-as-Code for this POC. Resources are created with the
AWS CLI commands below, and this file is the record. Per SOW section 13 the environment is
temporary: it is decommissioned 30 days after the demo unless agreed otherwise, and the customer
pays its AWS cost.

## Rules

- **Every resource carries the tag** `aws-apn-id = pc:8m1j53s4l98quhnwq6wgbhf0l` (plus
  `Project = mavenscout`, `Environment = dev`).
- **Region:** `us-east-1` unless Part A shows a reason to change it. Pass `--region` on every
  command; do not rely on a CLI default.
- **No account IDs, secrets or email addresses in this file.** The repo is public. Commands read
  the account ID at run time.
- Add each created resource to the inventory at the bottom the same day.

## Access

| Who | Access |
|---|---|
| Loop8 engineers | Read-only. Can run Part A. |
| Loop8 project lead | Admin. Runs Part B. |

Set the profile for whichever access you have before running anything:

```bash
export AWS_PROFILE=<your-mavenscout-profile>
export AWS_REGION=us-east-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

---

## Part A: read-only checks (any engineer)

Run these first and record the answers in the "Findings" section.

```bash
# A1. Who am I, which account
aws sts get-caller-identity

# A2. Anything already in the account (tagged or not)
aws resourcegroupstaggingapi get-resources --region $AWS_REGION \
  --query 'ResourceTagMappingList[].ResourceARN' --output text
aws lambda list-functions --region $AWS_REGION --query 'Functions[].FunctionName'
aws secretsmanager list-secrets --region $AWS_REGION --query 'SecretList[].Name'
aws budgets describe-budgets --account-id $ACCOUNT_ID --query 'Budgets[].BudgetName'

# A3. Bedrock: models available in the region (text LLMs and embeddings)
aws bedrock list-foundation-models --region $AWS_REGION \
  --query 'modelSummaries[?contains(outputModalities, `TEXT`) || contains(outputModalities, `EMBEDDING`)].[modelId,providerName,modelLifecycle.status]' \
  --output table
aws bedrock list-inference-profiles --region $AWS_REGION \
  --query 'inferenceProfileSummaries[].[inferenceProfileId,status]' --output table

# A4. Bedrock: is each candidate model usable in this account?
#     Run per candidate model id from A3 (an LLM and an embedding model).
aws bedrock get-foundation-model-availability --region $AWS_REGION --model-id <model-id>

# A5. Bedrock: has the Anthropic first-use form been submitted? (error = not yet)
aws bedrock get-use-case-for-model-access --region $AWS_REGION

# A6. Bedrock quotas for the candidate models (tokens and requests per minute)
aws service-quotas list-service-quotas --service-code bedrock --region $AWS_REGION \
  --query 'Quotas[?contains(QuotaName, `tokens per minute`) || contains(QuotaName, `requests per minute`)].[QuotaName,Value]' \
  --output table

# A7. Support plan: Business Support+ active? (SubscriptionRequiredException = Basic)
aws support describe-severity-levels --region us-east-1
```

Read-only access cannot invoke a model (`bedrock:InvokeModel` is not a read action), so the
smoke test is in Part B.

### Findings

| Check | Result | Date |
|---|---|---|
| A1 account and role | | |
| A2 existing resources | | |
| A3 candidate LLM and embedding model ids | | |
| A4 model availability | | |
| A5 Anthropic use-case form | | |
| A6 Bedrock quotas | | |
| A7 support plan | | |

---

## Part B: create (admin only)

Inputs to agree before running, through the project manager:

| Input | Why | Value |
|---|---|---|
| `BUDGET_USD` | Monthly cost ceiling for the alarm. The customer pays (SOW 13.3), so they agree it | TBD |
| `ALERT_EMAIL` | Who receives budget alerts | TBD (not recorded here) |
| `LLM_MODEL_ID`, `EMBED_MODEL_ID` | From Part A3/A4 and the Phase 1 architecture decision | TBD |

```bash
APN='pc:8m1j53s4l98quhnwq6wgbhf0l'
TAGS_JSON='[{"Key":"aws-apn-id","Value":"'$APN'"},{"Key":"Project","Value":"mavenscout"},{"Key":"Environment","Value":"dev"}]'
```

### B1. Budget alarm

Alerts at 80% of actual spend and 100% of forecast spend.

```bash
aws budgets create-budget --account-id $ACCOUNT_ID \
  --budget '{"BudgetName":"mavenscout-poc-monthly","BudgetLimit":{"Amount":"'$BUDGET_USD'","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[
    {"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80,"ThresholdType":"PERCENTAGE"},
     "Subscribers":[{"SubscriptionType":"EMAIL","Address":"'$ALERT_EMAIL'"}]},
    {"Notification":{"NotificationType":"FORECASTED","ComparisonOperator":"GREATER_THAN","Threshold":100,"ThresholdType":"PERCENTAGE"},
     "Subscribers":[{"SubscriptionType":"EMAIL","Address":"'$ALERT_EMAIL'"}]}
  ]' \
  --resource-tags "$TAGS_JSON"
```

### B2. Secret for the Supabase connection

Created empty. The value (Supabase URL and service role key of the database the engine reads) is
added later by whoever holds it, never pasted into chat, tickets or this repo.

```bash
aws secretsmanager create-secret --region $AWS_REGION \
  --name mavenscout/dev/supabase \
  --description "Supabase URL and service role key for the MavenScout ranking engine POC" \
  --tags "$TAGS_JSON"

# Later, by the key holder, from a local file that is then deleted:
# aws secretsmanager put-secret-value --region $AWS_REGION \
#   --secret-id mavenscout/dev/supabase --secret-string file://supabase-secret.json
```

### B3. Bedrock model access

Only if Part A5 shows the Anthropic use-case form has not been submitted: submit it once in the
console (Bedrock, Model access) with the customer's agreement, since it is made on behalf of their
account. Then smoke-test both models:

```bash
aws bedrock-runtime converse --region $AWS_REGION --model-id $LLM_MODEL_ID \
  --messages '[{"role":"user","content":[{"text":"Reply with OK"}]}]' \
  --query 'output.message.content[0].text'

aws bedrock-runtime invoke-model --region $AWS_REGION --model-id $EMBED_MODEL_ID \
  --body '{"inputText":"household panel surveys"}' --cli-binary-format raw-in-base64-out \
  /dev/stdout | head -c 200
```

The embedding request body shown is for Amazon Titan embeddings; adjust it if another embedding
model is chosen.

### Later, after the Phase 1 architecture decision

Engine Lambda and its IAM role, the API in front of it, its log group (created up front so it can
be tagged, with a retention policy), and the vector store if it lives in AWS. Each is added to this
runbook as Part B steps before it is created.

### B9. Verify tagging

```bash
aws resourcegroupstaggingapi get-resources --region $AWS_REGION \
  --tag-filters Key=Project,Values=mavenscout \
  --query 'ResourceTagMappingList[].[ResourceARN, Tags[?Key==`aws-apn-id`].Value | [0]]' --output table
```

Every row must show the APN value. Budgets are global: check them with
`aws budgets list-tags-for-resource --resource-arn arn:aws:budgets::$ACCOUNT_ID:budget/mavenscout-poc-monthly`.

---

## Teardown (30 days after the demo)

Run in reverse order of creation. Admin only.

```bash
aws secretsmanager delete-secret --region $AWS_REGION \
  --secret-id mavenscout/dev/supabase --recovery-window-in-days 7
aws budgets delete-budget --account-id $ACCOUNT_ID --budget-name mavenscout-poc-monthly
```

Then re-run B9: it must return no rows.

---

## Inventory

| Resource | Name | Region | Created (date, by) | Removed |
|---|---|---|---|---|
| | | | | |
