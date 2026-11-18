mock_provider "aws" {
  override_during = plan

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }

  mock_resource "aws_iam_policy" {
    defaults = {
      arn = "arn:aws:iam:::policy/mock-policy"
    }
  }
}

variables {
  name_prefix = "mavenscout-engine"
  region      = "us-east-1"
  model_ids   = ["model-a:0", "model-b:0"]
}

run "policy_uses_the_prefix" {
  command = plan

  assert {
    condition     = aws_iam_policy.invoke.name == "mavenscout-engine-bedrock-invoke"
    error_message = "The policy name must start with the prefix the apply role allows"
  }
}

run "one_action_and_one_resource_per_model" {
  command = plan

  assert {
    condition     = length(data.aws_iam_policy_document.invoke.statement[0].actions) == 1 && contains(data.aws_iam_policy_document.invoke.statement[0].actions, "bedrock:InvokeModel")
    error_message = "The policy must allow only bedrock:InvokeModel"
  }

  assert {
    condition     = length(data.aws_iam_policy_document.invoke.statement[0].resources) == 2
    error_message = "There must be one resource per model id"
  }
}
