data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# Alert topic. Terraform creates the topic only. Who receives the messages is
# set by a person with a subscription (aws sns subscribe), so no email address
# is committed to this public repository.
# ---------------------------------------------------------------------------

resource "aws_sns_topic" "alerts" {
  #checkov:skip=CKV_AWS_26:Budgets and CloudWatch cannot publish to a topic that uses the AWS managed SNS key, and a customer managed key is not needed for cost alerts
  name = "${var.name_prefix}-alerts"
}

data "aws_iam_policy_document" "alerts_publish" {
  statement {
    sid       = "BudgetsAndCloudWatchPublish"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alerts.arn]

    principals {
      type        = "Service"
      identifiers = ["budgets.amazonaws.com", "cloudwatch.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "alerts" {
  arn    = aws_sns_topic.alerts.arn
  policy = data.aws_iam_policy_document.alerts_publish.json
}

# ---------------------------------------------------------------------------
# Monthly budget with alerts at 50% and 80% of actual spend and at 100% of the
# forecast. The limit is set by the project lead.
# ---------------------------------------------------------------------------

resource "aws_budgets_budget" "monthly" {
  name         = "${var.name_prefix}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 50
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.alerts.arn]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.alerts.arn]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_sns_topic_arns = [aws_sns_topic.alerts.arn]
  }
}

# ---------------------------------------------------------------------------
# Cut at 100% of actual spend: attach an explicit deny on model invocation to
# the engineer roles. Billing data lags by hours, so this is not an instant
# cap. The second cut at 150%, for the worker role, is added together with the
# worker Lambda, because that role does not exist yet.
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "bedrock_deny" {
  statement {
    sid = "DenyModelInvocation"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
      "bedrock:Converse",
      "bedrock:ConverseStream",
    ]
    resources = ["*"]
    effect    = "Deny"
  }
}

resource "aws_iam_policy" "bedrock_deny" {
  name   = "${var.name_prefix}-bedrock-deny"
  policy = data.aws_iam_policy_document.bedrock_deny.json
}

data "aws_iam_policy_document" "budget_action_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["budgets.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

data "aws_iam_policy_document" "budget_action_permissions" {
  statement {
    sid       = "AttachDenyToEngineerRoles"
    actions   = ["iam:AttachRolePolicy", "iam:DetachRolePolicy"]
    resources = [for name in var.engineer_role_names : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${name}"]

    condition {
      test     = "ArnEquals"
      variable = "iam:PolicyARN"
      values   = [aws_iam_policy.bedrock_deny.arn]
    }
  }
}

resource "aws_iam_role" "budget_action" {
  name               = "${var.name_prefix}-budget-action"
  assume_role_policy = data.aws_iam_policy_document.budget_action_trust.json
}

resource "aws_iam_role_policy" "budget_action" {
  name   = "${var.name_prefix}-budget-action"
  role   = aws_iam_role.budget_action.id
  policy = data.aws_iam_policy_document.budget_action_permissions.json
}

resource "aws_budgets_budget_action" "deny_engineers" {
  budget_name        = aws_budgets_budget.monthly.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budget_action.arn

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 100
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.bedrock_deny.arn
      roles      = var.engineer_role_names
    }
  }

  subscriber {
    subscription_type = "SNS"
    address           = aws_sns_topic.alerts.arn
  }
}

# ---------------------------------------------------------------------------
# Alarm on model input tokens per hour, one per model id. This reacts in
# minutes, which the budget cannot. Luna and Sol are added to the map when
# their model ids are confirmed.
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "bedrock_input_tokens" {
  for_each = var.bedrock_alarm_models

  alarm_name          = "${var.name_prefix}-tokens-${replace(each.key, ":", "-")}"
  alarm_description   = "Input tokens per hour for ${each.key} above ${each.value}"
  namespace           = "AWS/Bedrock"
  metric_name         = "InputTokenCount"
  dimensions          = { ModelId = each.key }
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = each.value
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
