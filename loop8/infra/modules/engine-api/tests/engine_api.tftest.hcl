mock_provider "archive" {
  mock_data "archive_file" {
    defaults = {
      output_base64sha256 = "mock"
      output_path         = "mock.zip"
    }
  }
}

mock_provider "aws" {
  override_during = plan

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "000000000000"
    }
  }

  mock_resource "aws_iam_role" {
    defaults = {
      arn = "arn:aws:iam::000000000000:role/mock-role"
    }
  }

  mock_resource "aws_lambda_function" {
    defaults = {
      arn        = "arn:aws:lambda:us-east-1:000000000000:function:mock"
      invoke_arn = "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/mock/invocations"
    }
  }
}

variables {
  name_prefix      = "mavenscout-engine"
  region           = "us-east-1"
  dist_dir         = "dist"
  bucket_name      = "mock-bucket"
  bucket_arn       = "arn:aws:s3:::mock-bucket"
  table_name       = "mock-table"
  table_arn        = "arn:aws:dynamodb:us-east-1:000000000000:table/mock-table"
  queue_url        = "https://sqs.us-east-1.amazonaws.com/000000000000/mock-queue"
  queue_arn        = "arn:aws:sqs:us-east-1:000000000000:mock-queue"
  app_origins      = ["http://localhost:5173"]
  api_rate_limit   = 5
  api_burst_limit  = 10
  max_jobs_at_once = 2
  worker_memory_mb = 1024
  alerts_topic_arn = "arn:aws:sns:us-east-1:000000000000:mock-topic"
}

run "names_use_the_prefix" {
  command = plan

  assert {
    condition     = aws_lambda_function.api.function_name == "mavenscout-engine-api" && aws_lambda_function.worker.function_name == "mavenscout-engine-worker" && aws_iam_role.api.name == "mavenscout-engine-api-role" && aws_iam_role.worker.name == "mavenscout-engine-worker-role"
    error_message = "Every name must start with the prefix the apply role allows"
  }
}

run "timings_and_concurrency" {
  command = plan

  assert {
    condition     = aws_lambda_function.worker.timeout == 180 && aws_lambda_function.api.timeout == 10
    error_message = "The worker timeout must stay shorter than the job lease of 200 seconds"
  }

  assert {
    condition     = aws_lambda_event_source_mapping.worker.batch_size == 1 && aws_lambda_event_source_mapping.worker.scaling_config[0].maximum_concurrency == 2
    error_message = "One job per invocation and at most 2 jobs at once"
  }
}

run "api_is_throttled_and_has_two_routes" {
  command = plan

  assert {
    condition     = aws_apigatewayv2_stage.default.default_route_settings[0].throttling_rate_limit == 5 && aws_apigatewayv2_stage.default.default_route_settings[0].throttling_burst_limit == 10
    error_message = "The stage must throttle every route"
  }

  assert {
    condition     = aws_apigatewayv2_route.start_job.route_key == "POST /jobs" && aws_apigatewayv2_route.get_job.route_key == "GET /jobs/{id}"
    error_message = "The API has exactly the two routes of the blueprint"
  }
}

run "api_role_cannot_call_models" {
  command = plan

  assert {
    condition     = alltrue([for s in data.aws_iam_policy_document.api.statement : !anytrue([for a in s.actions : startswith(a, "bedrock:")])])
    error_message = "The api role must have no model access"
  }

  assert {
    condition     = alltrue([for s in data.aws_iam_policy_document.worker.statement : !anytrue([for a in s.actions : startswith(a, "bedrock:")])])
    error_message = "The worker role has no model access unless models are named"
  }
}

run "worker_calls_only_the_named_models_and_reads_only_the_named_secret" {
  command = plan

  variables {
    worker_model_ids         = ["amazon.titan-embed-text-v2:0"]
    worker_profile_model_ids = ["amazon.nova-lite-v1:0"]
    profile_regions          = ["us-east-1", "us-east-2", "us-west-2"]
    secret_arns              = ["arn:aws:secretsmanager:us-east-1:000000000000:secret:mavenscout/supabase-abc123"]
  }

  assert {
    condition     = length([for s in data.aws_iam_policy_document.worker.statement : s if s.sid == "InvokeEngineModels"]) == 1
    error_message = "There must be one model statement"
  }

  assert {
    condition     = [for s in data.aws_iam_policy_document.worker.statement : s.actions if s.sid == "InvokeEngineModels"][0] == toset(["bedrock:InvokeModel"])
    error_message = "The model statement must allow only bedrock:InvokeModel"
  }

  assert {
    condition     = length([for s in data.aws_iam_policy_document.worker.statement : s.resources if s.sid == "InvokeEngineModels"][0]) == 5
    error_message = "One resource for Titan and four for Nova Lite: the profile and the model in three regions"
  }

  assert {
    condition     = contains([for s in data.aws_iam_policy_document.worker.statement : s.resources if s.sid == "InvokeEngineModels"][0], "arn:aws:bedrock:us-east-1:000000000000:inference-profile/us.amazon.nova-lite-v1:0")
    error_message = "The profile of the account must be allowed"
  }

  assert {
    condition     = [for s in data.aws_iam_policy_document.worker.statement : s.actions if s.sid == "ReadEngineSecrets"][0] == toset(["secretsmanager:GetSecretValue"]) && length([for s in data.aws_iam_policy_document.worker.statement : s.resources if s.sid == "ReadEngineSecrets"][0]) == 1
    error_message = "The worker may read one secret and only with GetSecretValue"
  }

  assert {
    condition     = alltrue([for s in data.aws_iam_policy_document.worker.statement : alltrue([for r in s.resources : r != "*"]) if contains(["InvokeEngineModels", "ReadEngineSecrets"], s.sid)])
    error_message = "The model and secret statements may not use a wildcard resource"
  }

  assert {
    condition     = alltrue([for s in data.aws_iam_policy_document.api.statement : !anytrue([for a in s.actions : startswith(a, "bedrock:") || startswith(a, "secretsmanager:")])])
    error_message = "The api role must have no model or secret access"
  }
}

run "engine_stays_on_the_stub_and_settings_are_optional" {
  command = plan

  assert {
    condition     = !contains(keys(aws_lambda_function.worker.environment[0].variables), "ENGINE") && !contains(keys(aws_lambda_function.worker.environment[0].variables), "INDEX_ARTIFACT_S3_KEY") && !contains(keys(aws_lambda_function.worker.environment[0].variables), "SUPABASE_SECRET_ID")
    error_message = "With no settings the worker has no engine, index or secret variable"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.api.environment[0].variables), "FIT_MODEL")
    error_message = "With no model settings the api keeps the engine defaults"
  }
}

run "settings_reach_the_functions_without_turning_the_engine_on" {
  command = plan

  variables {
    supabase_secret_id = "mavenscout/supabase"
    index_artifact_key = "index/index.json.gz"
    fit_model          = "us.amazon.nova-lite-v1:0"
    text_model         = "us.amazon.nova-lite-v1:0"
    embed_model        = "amazon.titan-embed-text-v2:0"
  }

  assert {
    condition     = aws_lambda_function.worker.environment[0].variables["SUPABASE_SECRET_ID"] == "mavenscout/supabase" && aws_lambda_function.worker.environment[0].variables["INDEX_ARTIFACT_S3_KEY"] == "index/index.json.gz"
    error_message = "The worker must know the secret name and the index key"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.worker.environment[0].variables), "ENGINE")
    error_message = "ENGINE is turned on in a separate change, never here"
  }

  assert {
    condition     = aws_lambda_function.api.environment[0].variables["FIT_MODEL"] == "us.amazon.nova-lite-v1:0" && aws_lambda_function.api.environment[0].variables["TEXT_MODEL"] == "us.amazon.nova-lite-v1:0" && aws_lambda_function.api.environment[0].variables["EMBED_MODEL"] == "amazon.titan-embed-text-v2:0"
    error_message = "The api must give the three model ids to the jobs"
  }
}

run "failure_alarms_notify_the_alerts_topic" {
  command = plan

  assert {
    condition     = alltrue([for a in [aws_cloudwatch_metric_alarm.worker_errors, aws_cloudwatch_metric_alarm.worker_throttles, aws_cloudwatch_metric_alarm.worker_duration] : a.alarm_actions == toset(["arn:aws:sns:us-east-1:000000000000:mock-topic"])])
    error_message = "Every failure alarm must notify the alerts topic"
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.worker_duration.threshold == 150000 && aws_cloudwatch_metric_alarm.worker_duration.threshold < aws_lambda_function.worker.timeout * 1000
    error_message = "The duration alarm must fire below the worker timeout"
  }
}
