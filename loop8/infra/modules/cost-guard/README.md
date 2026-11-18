# cost-guard

Spending limits for the POC account: an alert topic, a monthly budget with alerts, a budget action that attaches a deny on model invocation to the engineer roles, and one token alarm per model.

## What it does

1. Creates the topic `<name_prefix>-alerts`. No address is subscribed by Terraform, so no email is committed to the public repository. A person subscribes with `aws sns subscribe`.
2. Creates the monthly budget with alerts at 50% and 80% of actual spend and at 100% of the forecast.
3. At 100% of actual spend, attaches the deny policy to the roles in `engineer_role_names`. Billing data lags by hours, so this is not an instant cap.
4. Creates an alarm on `InputTokenCount` per hour for each model in `bedrock_alarm_models`. This reacts in minutes.

## Not here yet

The second cut at 150% for the worker role is added with the worker Lambda, because that role does not exist yet.

## Test

```bash
terraform -chdir=loop8/infra/modules/cost-guard init -backend=false
terraform -chdir=loop8/infra/modules/cost-guard test
```
