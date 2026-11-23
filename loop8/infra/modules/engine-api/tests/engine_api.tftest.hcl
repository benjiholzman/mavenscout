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

  mock_resource "aws_apigatewayv2_api" {
    defaults = {
      execution_arn = "arn:aws:execute-api:us-east-1:000000000000:mockapi"
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

run "engine_mode_sets_engine_on_the_worker_only" {
  command = plan

  variables {
    engine_mode        = "semantic"
    supabase_secret_id = "mavenscout/supabase"
    index_artifact_key = "index/index.json.gz"
  }

  assert {
    condition     = aws_lambda_function.worker.environment[0].variables["ENGINE"] == "semantic"
    error_message = "engine_mode must set ENGINE on the worker"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.api.environment[0].variables), "ENGINE")
    error_message = "The api never gets ENGINE"
  }
}

run "engine_mode_rejects_unknown_values" {
  command = plan

  variables {
    engine_mode = "fast"
  }

  expect_failures = [var.engine_mode]
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

run "extract_function_role_and_route_use_the_prefix" {
  command = plan

  assert {
    condition     = aws_lambda_function.extract.function_name == "mavenscout-engine-extract" && aws_iam_role.extract.name == "mavenscout-engine-extract-role" && aws_cloudwatch_log_group.extract.name == "/aws/lambda/mavenscout-engine-extract"
    error_message = "Every name must start with the prefix the apply role allows"
  }

  assert {
    condition     = aws_apigatewayv2_route.extract.route_key == "POST /extract"
    error_message = "The extraction route is POST /extract"
  }

  assert {
    condition     = aws_lambda_permission.extract_api_gateway.principal == "apigateway.amazonaws.com" && endswith(aws_lambda_permission.extract_api_gateway.source_arn, "/*/POST/extract")
    error_message = "API Gateway may invoke the extract Lambda for the extraction route only"
  }

  assert {
    condition     = endswith(aws_lambda_permission.api_gateway.source_arn, "/*/*/jobs*")
    error_message = "The permission of the api Lambda stays limited to the job routes"
  }
}

run "extract_stays_inside_the_limit_of_the_api" {
  command = plan

  assert {
    condition     = aws_lambda_function.extract.timeout == 25 && aws_lambda_function.extract.timeout < 30
    error_message = "An HTTP API cuts an integration at 30 seconds, so the extract timeout must stay below it"
  }

  assert {
    condition     = aws_lambda_function.extract.memory_size == 512 && aws_lambda_function.extract.runtime == "nodejs22.x" && aws_lambda_function.extract.handler == "index.handler"
    error_message = "The extract Lambda has the memory and runtime of the plan"
  }

  assert {
    condition     = aws_lambda_function.api.timeout == 10 && aws_lambda_function.worker.timeout == 180
    error_message = "The api and the worker keep their timeouts"
  }
}

run "extraction_has_its_own_lower_throttle" {
  command = plan

  assert {
    condition     = length([for r in aws_apigatewayv2_stage.default.route_settings : r if r.route_key == "POST /extract" && r.throttling_rate_limit == 1 && r.throttling_burst_limit == 3]) == 1
    error_message = "POST /extract must have its own throttling, lower than the other routes"
  }

  assert {
    condition     = aws_apigatewayv2_stage.default.default_route_settings[0].throttling_rate_limit == 5 && aws_apigatewayv2_stage.default.default_route_settings[0].throttling_burst_limit == 10
    error_message = "The other routes keep the default throttling"
  }
}

run "extract_role_has_only_logs_the_named_model_and_one_counter_key" {
  command = plan

  variables {
    extract_profile_model_ids = ["amazon.nova-pro-v1:0"]
    profile_regions           = ["us-east-1", "us-east-2", "us-west-2"]
  }

  assert {
    condition     = toset([for s in data.aws_iam_policy_document.extract.statement : s.sid]) == toset(["Logs", "InvokeExtractModel", "ExtractDailyCounter"])
    error_message = "The extract role has exactly three statements: logs, the model and the counter"
  }

  assert {
    condition     = [for s in data.aws_iam_policy_document.extract.statement : s.actions if s.sid == "InvokeExtractModel"][0] == toset(["bedrock:InvokeModel"])
    error_message = "The model statement must allow only bedrock:InvokeModel"
  }

  assert {
    condition     = length([for s in data.aws_iam_policy_document.extract.statement : s.resources if s.sid == "InvokeExtractModel"][0]) == 4 && contains([for s in data.aws_iam_policy_document.extract.statement : s.resources if s.sid == "InvokeExtractModel"][0], "arn:aws:bedrock:us-east-1:000000000000:inference-profile/us.amazon.nova-pro-v1:0")
    error_message = "The profile of the account and the model in three regions, and nothing else"
  }

  assert {
    condition     = [for s in data.aws_iam_policy_document.extract.statement : s.actions if s.sid == "ExtractDailyCounter"][0] == toset(["dynamodb:UpdateItem"]) && [for s in data.aws_iam_policy_document.extract.statement : s.resources if s.sid == "ExtractDailyCounter"][0] == toset([var.table_arn])
    error_message = "The counter statement may only update items of the jobs table"
  }

  assert {
    condition     = toset([for s in data.aws_iam_policy_document.extract.statement : [for c in s.condition : c.values if c.variable == "dynamodb:LeadingKeys" && c.test == "ForAllValues:StringLike"][0] if s.sid == "ExtractDailyCounter"][0]) == toset(["DAY#extract-*"])
    error_message = "The counter statement must be limited to the keys DAY#extract-*"
  }

  assert {
    condition     = alltrue([for s in data.aws_iam_policy_document.extract.statement : !anytrue([for a in s.actions : startswith(a, "s3:") || startswith(a, "sqs:") || startswith(a, "secretsmanager:") || a == "dynamodb:GetItem" || a == "dynamodb:PutItem" || a == "dynamodb:Query"])])
    error_message = "The extract role has no bucket, queue, secret or job item access"
  }

  assert {
    condition     = alltrue([for s in data.aws_iam_policy_document.extract.statement : alltrue([for r in s.resources : r != "*"]) if contains(["InvokeExtractModel", "ExtractDailyCounter"], s.sid)])
    error_message = "The model and counter statements may not use a wildcard resource"
  }

  assert {
    condition     = alltrue([for s in data.aws_iam_policy_document.api.statement : !anytrue([for a in s.actions : startswith(a, "bedrock:")])])
    error_message = "The api role still has no model access"
  }
}

run "extract_role_has_no_model_access_unless_a_model_is_named" {
  command = plan

  assert {
    condition     = alltrue([for s in data.aws_iam_policy_document.extract.statement : !anytrue([for a in s.actions : startswith(a, "bedrock:")])])
    error_message = "With no model named the extract role has no model access"
  }
}

run "extract_settings_reach_only_the_extract_function" {
  command = plan

  variables {
    extract_model = "us.amazon.nova-pro-v1:0"
  }

  assert {
    condition     = aws_lambda_function.extract.environment[0].variables["EXTRACT_MODEL"] == "us.amazon.nova-pro-v1:0" && aws_lambda_function.extract.environment[0].variables["JOBS_TABLE"] == "mock-table"
    error_message = "The extract function needs the model id and the table name"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.extract.environment[0].variables), "JOBS_BUCKET") && !contains(keys(aws_lambda_function.extract.environment[0].variables), "JOBS_QUEUE_URL")
    error_message = "The extract function knows neither the bucket nor the queue"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.api.environment[0].variables), "EXTRACT_MODEL") && !contains(keys(aws_lambda_function.worker.environment[0].variables), "EXTRACT_MODEL")
    error_message = "Only the extract function gets EXTRACT_MODEL"
  }
}

run "extract_alarms_notify_the_alerts_topic" {
  command = plan

  assert {
    condition     = alltrue([for a in [aws_cloudwatch_metric_alarm.extract_errors, aws_cloudwatch_metric_alarm.extract_duration] : a.alarm_actions == toset(["arn:aws:sns:us-east-1:000000000000:mock-topic"])])
    error_message = "Every extract alarm must notify the alerts topic"
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.extract_duration.threshold == 20000 && aws_cloudwatch_metric_alarm.extract_duration.threshold < aws_lambda_function.extract.timeout * 1000
    error_message = "The duration alarm must fire below the extract timeout"
  }
}
