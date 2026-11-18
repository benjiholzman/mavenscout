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

  mock_resource "aws_iam_role" {
    defaults = {
      arn = "arn:aws:iam:::role/mock-role"
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

  trusted_role_names = ["Loop8-ReadOnly"]

  profile_model_ids = ["model-c", "model-d"]
  profile_prefix    = "us"
  profile_regions   = ["us-east-1", "us-east-2", "us-west-2"]
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

run "role_uses_the_prefix_and_carries_the_policy" {
  command = plan

  assert {
    condition     = aws_iam_role.invoke.name == "mavenscout-engine-titan-invoke"
    error_message = "The role name must start with the prefix the apply role allows"
  }

  assert {
    condition     = aws_iam_role_policy_attachment.invoke.role == "mavenscout-engine-titan-invoke"
    error_message = "The policy must be attached to the invoke role"
  }
}

run "profile_models_need_the_profile_and_every_region" {
  command = plan

  assert {
    condition     = length(data.aws_iam_policy_document.invoke_profiles.statement[0].resources) == 8
    error_message = "Two profile models need one profile arn and three foundation model arns each"
  }

  assert {
    condition     = contains(data.aws_iam_policy_document.invoke_profiles.statement[0].resources, "arn:aws:bedrock:us-west-2::foundation-model/model-c")
    error_message = "The foundation model must be allowed in every region of the profile"
  }

  assert {
    condition     = contains(data.aws_iam_policy_document.invoke_profiles.statement[0].resources, "arn:aws:bedrock:us-east-1:mock-account:inference-profile/us.model-d")
    error_message = "The inference profile arn must be allowed"
  }
}

run "no_profile_models_means_no_profile_statement" {
  command = plan

  variables {
    profile_model_ids = []
    profile_regions   = []
  }

  assert {
    condition     = length(data.aws_iam_policy_document.invoke_profiles.statement) == 0
    error_message = "An empty statement would make the policy invalid"
  }
}
