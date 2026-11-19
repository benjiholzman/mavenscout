mock_provider "aws" {
  override_during = plan

  mock_resource "aws_secretsmanager_secret" {
    defaults = {
      arn = "arn:aws:secretsmanager:us-east-1:mock-account:secret:mavenscout/mock-abc123"
    }
  }
}

variables {
  name_prefix  = "mavenscout"
  secret_names = ["supabase"]
}

run "name_uses_the_prefix_the_apply_role_allows" {
  command = plan

  assert {
    condition     = aws_secretsmanager_secret.this["supabase"].name == "mavenscout/supabase"
    error_message = "The name must start with mavenscout/ because the apply role is scoped to it"
  }
}

run "container_has_no_value" {
  command = plan

  assert {
    condition     = length(keys(aws_secretsmanager_secret.this)) == 1
    error_message = "Only the container is created, no secret version"
  }
}

run "no_read_policy_without_readers" {
  command = plan

  assert {
    condition     = length(aws_iam_policy.read) == 0 && length(aws_iam_role_policy_attachment.read) == 0
    error_message = "No read policy is created when reader_role_names is empty"
  }
}

run "read_policy_name_is_one_the_apply_role_allows" {
  command = plan

  variables {
    reader_role_names = ["mavenscout-engine-titan-invoke"]
  }

  assert {
    condition     = aws_iam_policy.read[0].name == "mavenscout-engine-secrets-read"
    error_message = "The policy name must start with mavenscout-engine- because the apply role is scoped to it"
  }

  assert {
    condition     = contains(keys(aws_iam_role_policy_attachment.read), "mavenscout-engine-titan-invoke")
    error_message = "The policy must be attached to the reader role"
  }
}

run "read_policy_has_one_action_on_the_module_secrets" {
  command = plan

  variables {
    reader_role_names = ["mavenscout-engine-titan-invoke"]
  }

  assert {
    condition     = length(data.aws_iam_policy_document.read[0].statement) == 1
    error_message = "The policy has exactly one statement"
  }

  assert {
    condition     = one(data.aws_iam_policy_document.read[0].statement).actions == toset(["secretsmanager:GetSecretValue"])
    error_message = "The only action is secretsmanager:GetSecretValue"
  }

  assert {
    condition     = length(one(data.aws_iam_policy_document.read[0].statement).resources) == 1
    error_message = "One resource per secret the module creates, and no wildcard"
  }
}
