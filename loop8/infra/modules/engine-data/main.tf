# Data plane of the engine: the bucket for job inputs and results, the job state
# table, the jobs queue with its dead letter queue and the alarm on that queue.
# Timings that must stay in this order: worker timeout 180 s, lease 200 s
# (loop8/engine/src/shared/limits.ts), queue visibility timeout 1080 s.

data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# S3: job inputs and results, kept for 7 days. The index artifact is kept.
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "jobs" {
  #checkov:skip=CKV_AWS_21:versioning adds nothing to temporary objects that expire after 7 days
  #checkov:skip=CKV2_AWS_62:no event notifications are needed, the worker is started by the queue
  bucket        = "${var.name_prefix}-jobs-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "jobs" {
  bucket                  = aws_s3_bucket.jobs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "jobs" {
  bucket = aws_s3_bucket.jobs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# The 7 day expiry covers only the prefixes the API and the worker write, so an object
# uploaded by hand under another prefix (the index artifact, under index/) is kept.
resource "aws_s3_bucket_lifecycle_configuration" "jobs" {
  bucket = aws_s3_bucket.jobs.id

  dynamic "rule" {
    for_each = toset(["inputs/", "results/"])

    content {
      id     = "expire-7-days-${trimsuffix(rule.value, "/")}"
      status = "Enabled"

      filter {
        prefix = rule.value
      }

      expiration {
        days = 7
      }

      abort_incomplete_multipart_upload {
        days_after_initiation = 1
      }
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "jobs" {
  bucket = aws_s3_bucket.jobs.id

  cors_rule {
    allowed_origins = var.app_origins
    allowed_methods = ["GET"]
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

data "aws_iam_policy_document" "jobs_tls" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.jobs.arn, "${aws_s3_bucket.jobs.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "jobs" {
  bucket = aws_s3_bucket.jobs.id
  policy = data.aws_iam_policy_document.jobs_tls.json

  depends_on = [aws_s3_bucket_public_access_block.jobs]
}

# ---------------------------------------------------------------------------
# DynamoDB: job state, per candidate checkpoints, idempotency keys and counters.
# ---------------------------------------------------------------------------

resource "aws_dynamodb_table" "jobs" {
  #checkov:skip=CKV_AWS_28:point in time recovery is not needed, the items expire and the table holds no data that matters
  #checkov:skip=CKV_AWS_119:the default AWS owned key is enough for demo job state
  name         = "${var.name_prefix}-jobs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
}

# ---------------------------------------------------------------------------
# SQS: the jobs queue redrives into the dead letter queue after 5 receives.
# ---------------------------------------------------------------------------

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.name_prefix}-jobs-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "jobs" {
  name                       = "${var.name_prefix}-jobs"
  visibility_timeout_seconds = 1080
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_cloudwatch_metric_alarm" "dlq_not_empty" {
  alarm_name          = "${var.name_prefix}-jobs-dlq-not-empty"
  alarm_description   = "A job landed in the dead letter queue"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  dimensions          = { QueueName = aws_sqs_queue.dlq.name }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alerts_topic_arn]
}
