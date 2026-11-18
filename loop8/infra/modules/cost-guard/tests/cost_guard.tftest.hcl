mock_provider "aws" {
  override_during = plan

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "mock-account"
    }
  }

  mock_resource "aws_sns_topic" {
    defaults = {
      arn = "arn:aws:sns:us-east-1::mock-topic"
    }
  }

  mock_resource "aws_iam_policy" {
    defaults = {
      arn = "arn:aws:iam:::policy/mock-policy"
    }
  }

  mock_resource "aws_iam_role" {
    defaults = {
      arn = "arn:aws:iam:::role/mock-role"
    }
  }
}

variables {
  name_prefix         = "mavenscout-engine"
  monthly_budget_usd  = 350
  engineer_role_names = ["Loop8-ReadOnly"]
  bedrock_alarm_models = {
    "model-a:0" = 1000
    "model-b:0" = 2000
  }
}

run "budget_uses_the_limit_and_the_prefix" {
  command = plan

  assert {
    condition     = aws_budgets_budget.monthly.limit_amount == "350" && aws_budgets_budget.monthly.name == "mavenscout-engine-monthly"
    error_message = "The budget must use the given limit and the prefixed name"
  }
}

run "one_alarm_per_model" {
  command = plan

  assert {
    condition     = length(aws_cloudwatch_metric_alarm.bedrock_input_tokens) == 2
    error_message = "There must be one alarm per model id"
  }
}

run "three_alerts_and_one_action_at_100_percent" {
  command = plan

  assert {
    condition     = length(aws_budgets_budget.monthly.notification) == 3
    error_message = "The budget must alert at 50 and 80 percent of actual and 100 percent of forecast"
  }

  assert {
    condition     = aws_budgets_budget_action.deny_engineers.action_threshold[0].action_threshold_value == 100
    error_message = "The deny action must fire at 100 percent"
  }
}
