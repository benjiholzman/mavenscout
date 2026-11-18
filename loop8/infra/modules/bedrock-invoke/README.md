# bedrock-invoke

A managed policy that allows `bedrock:InvokeModel` on the foundation models in `model_ids`, in one region, and a role that carries it. Nothing else.

## What it does

1. Creates the policy `<name_prefix>-bedrock-invoke` and the role `<name_prefix>-titan-invoke` with that policy attached. The apply role can only manage roles and policies under that prefix.
2. The role trusts only the roles in `trusted_role_names`. The policy is not attached to those roles, because a Loop8 guardrail denies any change to `Loop8-ReadOnly`. The engineers assume the new role with a profile (runbook B3c).

## Models

Titan Text Embeddings V2 is called directly (`model_ids`). GPT-6 Luna and GPT-6 Sol are called through the US inference profile (`profile_model_ids`). For those the policy allows the profile ARN and the foundation model in each region the profile routes to (`profile_regions`). The token alarms are in the `cost-guard` module.

## Test

```bash
terraform -chdir=loop8/infra/modules/bedrock-invoke init -backend=false
terraform -chdir=loop8/infra/modules/bedrock-invoke test
```
