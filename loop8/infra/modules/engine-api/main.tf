# Compute and front door of the engine: the three Lambdas (api, worker and extract), their roles,
# the queue to worker mapping and the HTTP API. The worker role may call the named models
# and read the named secrets, and nothing else. The extract role may call the extraction model and
# write one counter key, and nothing else. The worker runs the stub unless
# engine_mode sets ENGINE (loop8/docs/planning/worker-engine-connect-plan.md).

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

data "archive_file" "extract" {
  type        = "zip"
  source_file = "${var.dist_dir}/extract/index.mjs"
  output_path = "${path.root}/.build/extract.zip"
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

resource "aws_cloudwatch_log_group" "extract" {
  #checkov:skip=CKV_AWS_338:14 days of retention is enough for a POC
  #checkov:skip=CKV_AWS_158:the default log encryption is enough for demo logs
  name              = "/aws/lambda/${var.name_prefix}-extract"
  retention_in_days = 14
}

# ---------------------------------------------------------------------------
# Roles. The api role cannot call any model. The worker role is cut by the
# budget action at 150% (module cost-guard).
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

# Models called directly, and models called through a cross region inference
# profile. A profile call needs the profile and the foundation model in every
# region the profile routes to. The Converse API needs the same permission as
# InvokeModel.
locals {
  worker_model_resources = concat(
    [for id in var.worker_model_ids : "arn:aws:bedrock:${var.region}::foundation-model/${id}"],
    flatten([
      for id in var.worker_profile_model_ids : concat(
        ["arn:aws:bedrock:${var.region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.profile_prefix}.${id}"],
        [for r in var.profile_regions : "arn:aws:bedrock:${r}::foundation-model/${id}"],
      )
    ]),
  )
}

# The extraction model, through its inference profile, as for the worker.
locals {
  extract_model_resources = flatten([
    for id in var.extract_profile_model_ids : concat(
      ["arn:aws:bedrock:${var.region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.profile_prefix}.${id}"],
      [for r in var.profile_regions : "arn:aws:bedrock:${r}::foundation-model/${id}"],
    )
  ])
}

# The extract role has logs, the extraction model and one counter key of the jobs table, and nothing
# else: no bucket, no queue, no secret. The counter keys start with DAY#extract-, so the role cannot
# touch a job item or the daily job counter.
data "aws_iam_policy_document" "extract" {
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.extract.arn}:*"]
  }

  dynamic "statement" {
    for_each = length(local.extract_model_resources) > 0 ? [1] : []

    content {
      sid       = "InvokeExtractModel"
      actions   = ["bedrock:InvokeModel"]
      resources = local.extract_model_resources
    }
  }

  statement {
    sid       = "ExtractDailyCounter"
    actions   = ["dynamodb:UpdateItem"]
    resources = [var.table_arn]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values   = ["DAY#extract-*"]
    }
  }
}

data "aws_iam_policy_document" "worker" {
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.worker.arn}:*"]
  }

  dynamic "statement" {
    for_each = length(local.worker_model_resources) > 0 ? [1] : []

    content {
      sid       = "InvokeEngineModels"
      actions   = ["bedrock:InvokeModel"]
      resources = local.worker_model_resources
    }
  }

  dynamic "statement" {
    for_each = length(var.secret_arns) > 0 ? [1] : []

    content {
      sid       = "ReadEngineSecrets"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = var.secret_arns
    }
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

resource "aws_iam_role" "extract" {
  name               = "${var.name_prefix}-extract-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy" "extract" {
  name   = "${var.name_prefix}-extract"
  role   = aws_iam_role.extract.id
  policy = data.aws_iam_policy_document.extract.json
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
    variables = merge({
      JOBS_TABLE     = var.table_name
      JOBS_BUCKET    = var.bucket_name
      JOBS_QUEUE_URL = var.queue_url
      ENGINE_VARIANT = "A"
      },
      var.fit_model != "" ? { FIT_MODEL = var.fit_model } : {},
      var.text_model != "" ? { TEXT_MODEL = var.text_model } : {},
      var.embed_model != "" ? { EMBED_MODEL = var.embed_model } : {},
    )
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
    variables = merge({
      JOBS_TABLE     = var.table_name
      JOBS_BUCKET    = var.bucket_name
      ENGINE_VARIANT = "A"
      },
      var.supabase_secret_id != "" ? { SUPABASE_SECRET_ID = var.supabase_secret_id } : {},
      var.index_artifact_key != "" ? { INDEX_ARTIFACT_S3_KEY = var.index_artifact_key } : {},
      var.engine_mode != "" ? { ENGINE = var.engine_mode } : {},
    )
  }

  depends_on = [aws_cloudwatch_log_group.worker, aws_iam_role_policy.worker]
}

# Reads one job description with a model and answers in the same request. The timeout stays below the
# 30 seconds that API Gateway allows for an HTTP API integration, with room for two model tries of
# 10 seconds (loop8/docs/planning/extract-route-plan.md).
resource "aws_lambda_function" "extract" {
  #checkov:skip=CKV_AWS_50:X-Ray tracing adds cost and the structured logs of the Lambda are enough for the POC
  #checkov:skip=CKV_AWS_115:reserved concurrency would take from the account limit, the route throttling and the daily cap bound the load
  #checkov:skip=CKV_AWS_116:a failed call is returned to the caller, which falls back to the keyword extractor, so there is nothing to dead letter
  #checkov:skip=CKV_AWS_117:the function calls AWS services only, a VPC adds cost and no protection here
  #checkov:skip=CKV_AWS_173:environment variables hold a table name and a model id, not secrets
  #checkov:skip=CKV_AWS_272:code signing is not used in the POC
  function_name    = "${var.name_prefix}-extract"
  role             = aws_iam_role.extract.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.extract.output_path
  source_code_hash = data.archive_file.extract.output_base64sha256
  timeout          = 25
  memory_size      = var.extract_memory_mb

  environment {
    variables = merge({
      JOBS_TABLE = var.table_name
      },
      var.extract_model != "" ? { EXTRACT_MODEL = var.extract_model } : {},
    )
  }

  depends_on = [aws_cloudwatch_log_group.extract, aws_iam_role_policy.extract]
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
# HTTP API with three routes. Route throttling is the main protection while the
# sign in of the app is mocked. POST /extract also has a daily cap in its Lambda.
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

resource "aws_apigatewayv2_integration" "extract" {
  api_id                 = aws_apigatewayv2_api.engine.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.extract.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "extract" {
  #checkov:skip=CKV_AWS_309:sign in is mocked in the app, so there is no identity to check. The protection is throttling, the daily cap of 300 extractions and the 150 percent budget cut of the extract role
  api_id    = aws_apigatewayv2_api.engine.id
  route_key = "POST /extract"
  target    = "integrations/${aws_apigatewayv2_integration.extract.id}"
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

  # Extraction spends on every call, so it has its own, lower limits.
  route_settings {
    route_key              = aws_apigatewayv2_route.extract.route_key
    throttling_rate_limit  = var.extract_rate_limit
    throttling_burst_limit = var.extract_burst_limit
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "apigw-invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.engine.execution_arn}/*/*/jobs*"
}

resource "aws_lambda_permission" "extract_api_gateway" {
  statement_id  = "apigw-invoke-extract"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.extract.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.engine.execution_arn}/*/POST/extract"
}

# ---------------------------------------------------------------------------
# Failure alarms of the worker. They notify the alerts topic. A model call that
# fails is retried inside the engine, so an error here means a job failed or
# was cut, and a duration close to the timeout means a run is about to be lost.
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "worker_errors" {
  alarm_name          = "${var.name_prefix}-worker-errors"
  alarm_description   = "The worker Lambda returned an error in the last 5 minutes"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.worker.function_name }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "worker_throttles" {
  alarm_name          = "${var.name_prefix}-worker-throttles"
  alarm_description   = "The worker Lambda was throttled in the last 5 minutes"
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  dimensions          = { FunctionName = aws_lambda_function.worker.function_name }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "worker_duration" {
  alarm_name          = "${var.name_prefix}-worker-duration"
  alarm_description   = "A worker run took more than ${var.worker_error_alarm_seconds} seconds, close to the ${aws_lambda_function.worker.timeout} second timeout"
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  dimensions          = { FunctionName = aws_lambda_function.worker.function_name }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.worker_error_alarm_seconds * 1000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}

# ---------------------------------------------------------------------------
# Failure alarms of the extract Lambda. A model that fails does not raise an error here, because the
# function answers with the keyword result and degraded true. An error means the function itself failed,
# for example the counter table was not reachable, and a duration close to the timeout means the model
# tries are using all the time.
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "extract_errors" {
  alarm_name          = "${var.name_prefix}-extract-errors"
  alarm_description   = "The extract Lambda returned an error in the last 5 minutes"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.extract.function_name }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "extract_duration" {
  alarm_name          = "${var.name_prefix}-extract-duration"
  alarm_description   = "An extraction took more than ${var.extract_error_alarm_seconds} seconds, close to the ${aws_lambda_function.extract.timeout} second timeout"
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  dimensions          = { FunctionName = aws_lambda_function.extract.function_name }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.extract_error_alarm_seconds * 1000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}
