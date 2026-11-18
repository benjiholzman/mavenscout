mock_provider "aws" {
  override_during = plan
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
