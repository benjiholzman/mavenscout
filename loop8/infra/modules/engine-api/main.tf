# Compute and front door of the engine walking skeleton: the two Lambdas, their
# roles, the queue to worker mapping and the HTTP API. The worker runs the stub
# engine, so it has no model, secret or vector database permission yet. Those
# are added in the change that connects Luna (loop8/docs/planning/engine-deploy-plan.md).

data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# Code packages, made from the esbuild output so the zip is the same at every
# run and an unchanged build does not update the functions.
# ---------------------------------------------------------------------------

data "archive_file" "api" {
  type        = "zip"
  source_file = "${var.dist_dir}/api/index.mjs"
  output_path = "${path.root}/.build/api.zip"
}

data "archive_file" "worker" {
  type        = "zip"
  source_file = "${var.dist_dir}/worker/index.mjs"
  output_path = "${path.root}/.build/worker.zip"
}

# ---------------------------------------------------------------------------
# Log groups
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "api" {
  #checkov:skip=CKV_AWS_338:14 days of retention is enough for a POC
  #checkov:skip=CKV_AWS_158:the default log encryption is enough for demo logs
  name              = "/aws/lambda/${var.name_prefix}-api"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "worker" {
  #checkov:skip=CKV_AWS_338:14 days of retention is enough for a POC
  #checkov:skip=CKV_AWS_158:the default log encryption is enough for demo logs
  name              = "/aws/lambda/${var.name_prefix}-worker"
  retention_in_days = 14
}

# ---------------------------------------------------------------------------
# Roles. The api role cannot call any model. The worker role is added to the
# budget actions when it gets model access.
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "api" {
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.api.arn}:*"]
  }

  statement {
    sid       = "InputsAndResults"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${var.bucket_arn}/*"]
  }

  statement {
    sid       = "JobState"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [var.table_arn]
  }

  statement {
    sid       = "StartJobs"
    actions   = ["sqs:SendMessage"]
    resources = [var.queue_arn]
  }
}

data "aws_iam_policy_document" "worker" {
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.worker.arn}:*"]
  }

  statement {
    sid = "ConsumeJobs"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ChangeMessageVisibility",
    ]
    resources = [var.queue_arn]
  }

  statement {
    sid       = "JobState"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"]
    resources = [var.table_arn]
  }

  statement {
    sid       = "InputsAndResults"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${var.bucket_arn}/*"]
  }

  # Without ListBucket a missing input object answers AccessDenied and not
  # NoSuchKey, and the worker could not report input_missing.
  statement {
    sid       = "ListForMissingKey"
    actions   = ["s3:ListBucket"]
    resources = [var.bucket_arn]
  }
}

resource "aws_iam_role" "api" {
  name               = "${var.name_prefix}-api-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy" "api" {
  name   = "${var.name_prefix}-api"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}

resource "aws_iam_role" "worker" {
  name               = "${var.name_prefix}-worker-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy" "worker" {
  name   = "${var.name_prefix}-worker"
  role   = aws_iam_role.worker.id
  policy = data.aws_iam_policy_document.worker.json
}

# ---------------------------------------------------------------------------
# Lambdas
# ---------------------------------------------------------------------------

resource "aws_lambda_function" "api" {
  #checkov:skip=CKV_AWS_50:X-Ray tracing adds cost and the structured logs of the Lambda are enough for the POC
  #checkov:skip=CKV_AWS_115:reserved concurrency would take from the account limit, the API throttling bounds the load
  #checkov:skip=CKV_AWS_116:a failed API call is returned to the caller, there is nothing to dead letter
  #checkov:skip=CKV_AWS_117:the function calls AWS services only, a VPC adds cost and no protection here
  #checkov:skip=CKV_AWS_173:environment variables hold resource names, not secrets
  #checkov:skip=CKV_AWS_272:code signing is not used in the POC
  function_name    = "${var.name_prefix}-api"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      JOBS_TABLE     = var.table_name
      JOBS_BUCKET    = var.bucket_name
      JOBS_QUEUE_URL = var.queue_url
      ENGINE_VARIANT = "A"
    }
  }

  depends_on = [aws_cloudwatch_log_group.api, aws_iam_role_policy.api]
}

resource "aws_lambda_function" "worker" {
  #checkov:skip=CKV_AWS_50:X-Ray tracing adds cost and the structured logs of the Lambda are enough for the POC
  #checkov:skip=CKV_AWS_115:the queue mapping caps the jobs at once
  #checkov:skip=CKV_AWS_116:the jobs queue redrives failed jobs into its dead letter queue
  #checkov:skip=CKV_AWS_117:the function calls AWS services only, a VPC adds cost and no protection here
  #checkov:skip=CKV_AWS_173:environment variables hold resource names, not secrets
  #checkov:skip=CKV_AWS_272:code signing is not used in the POC
  function_name    = "${var.name_prefix}-worker"
  role             = aws_iam_role.worker.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.worker.output_path
  source_code_hash = data.archive_file.worker.output_base64sha256
  timeout          = 180
  memory_size      = var.worker_memory_mb

  environment {
    variables = {
      JOBS_TABLE     = var.table_name
      JOBS_BUCKET    = var.bucket_name
      ENGINE_VARIANT = "A"
    }
  }

  depends_on = [aws_cloudwatch_log_group.worker, aws_iam_role_policy.worker]
}

# One job per invocation. The cap protects the model quotas once models are connected.
resource "aws_lambda_event_source_mapping" "worker" {
  event_source_arn = var.queue_arn
  function_name    = aws_lambda_function.worker.arn
  batch_size       = 1

  scaling_config {
    maximum_concurrency = var.max_jobs_at_once
  }
}

# ---------------------------------------------------------------------------
# HTTP API with two routes. Route throttling is the main protection while the
# sign in of the app is mocked.
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "engine" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.app_origins
    allow_methods = ["GET", "POST"]
    allow_headers = ["content-type", "idempotency-key"]
  }
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.engine.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "start_job" {
  #checkov:skip=CKV_AWS_309:sign in is mocked in the app, so there is no identity to check. The protection is throttling, the daily job cap and the jobs at once
  api_id    = aws_apigatewayv2_api.engine.id
  route_key = "POST /jobs"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_route" "get_job" {
  #checkov:skip=CKV_AWS_309:sign in is mocked in the app, so there is no identity to check. The protection is throttling, the daily job cap and the jobs at once
  api_id    = aws_apigatewayv2_api.engine.id
  route_key = "GET /jobs/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  #checkov:skip=CKV_AWS_76:access logging is not needed in the POC, the Lambda logs each request
  api_id      = aws_apigatewayv2_api.engine.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = var.api_rate_limit
    throttling_burst_limit = var.api_burst_limit
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "apigw-invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.engine.execution_arn}/*/*/jobs*"
}
