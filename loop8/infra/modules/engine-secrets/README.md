# engine-secrets

Empty Secrets Manager secrets for the engine. Terraform creates the container and never the value.

## What it does

1. Creates one secret per name in `secret_names`, called `<name_prefix>/<name>`. The apply role can only manage secrets that start with `mavenscout/`.
2. Sets a recovery window of 7 days, so a destroy at the end of the POC frees the name quickly.

## How the value gets in

The person who holds the value runs `loop8/infra/scripts/put-secret.sh`. It asks for each value without showing it, writes it to a temporary file that only that user can read, uploads it and deletes the file. The value is never typed in a chat, a ticket, the repository or the pipeline. See the runbook B2.

## Test

```bash
terraform -chdir=loop8/infra/modules/engine-secrets init -backend=false
terraform -chdir=loop8/infra/modules/engine-secrets test
```
