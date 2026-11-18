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
    error_message = "The worker role has no model access until Luna is connected"
  }
}
