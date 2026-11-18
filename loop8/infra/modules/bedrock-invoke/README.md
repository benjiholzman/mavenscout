# bedrock-invoke

A managed policy that allows `bedrock:InvokeModel` on the foundation models in `model_ids`, in one region. Nothing else.

## What it does

1. Creates the policy `<name_prefix>-bedrock-invoke`. The apply role can only create policies under that prefix.
2. Does not attach it. The apply role may not attach policies to roles that belong to people, so the project lead attaches it once to `Loop8-ReadOnly` (the command is in `loop8/docs/runbooks/poc-environment.md`).

## Models

Titan Text Embeddings V2 only. Luna and Sol are added in a separate change, when the engine needs them, together with their token alarms.

## Test

```bash
terraform -chdir=loop8/infra/modules/bedrock-invoke init -backend=false
terraform -chdir=loop8/infra/modules/bedrock-invoke test
```
