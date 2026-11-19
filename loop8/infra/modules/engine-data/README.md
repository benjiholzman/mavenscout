# engine-data

The data plane of the engine walking skeleton: the bucket for job inputs and results, the job state table, the jobs queue with its dead letter queue and the alarm on the dead letter queue.

## What it does

1. Creates the private, encrypted bucket `<name_prefix>-jobs-<account id>`. Objects expire after 7 days, and CORS allows only the app origins.
2. Creates the on demand table `<name_prefix>-jobs` with key `pk` and `sk`, and a TTL on `expires_at`.
3. Creates the jobs queue with a visibility timeout of 1,080 seconds, redriving into the dead letter queue after 5 receives.
4. Creates an alarm that notifies the alert topic when the dead letter queue has a message.

## Timing rule

The worker timeout (180 seconds), the job lease (200 seconds, `loop8/engine/src/shared/limits.ts`) and the visibility timeout (1,080 seconds) must stay in this order. Changing one means checking the other two.

## Test

```bash
terraform -chdir=loop8/infra/modules/engine-data init -backend=false
terraform -chdir=loop8/infra/modules/engine-data test
```
