mock_provider "aws" {
  override_during = plan

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }

  mock_resource "aws_sqs_queue" {
    defaults = {
      arn = "arn:aws:sqs:us-east-1:000000000000:mock-queue"
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "mock-account"
    }
  }
}

variables {
  name_prefix      = "mavenscout-engine"
  app_origins      = ["http://localhost:5173"]
  alerts_topic_arn = "arn:aws:sns:us-east-1:000000000000:mock-topic"
}

run "names_use_the_prefix" {
  command = plan

  assert {
    condition     = aws_dynamodb_table.jobs.name == "mavenscout-engine-jobs" && aws_sqs_queue.jobs.name == "mavenscout-engine-jobs" && aws_sqs_queue.dlq.name == "mavenscout-engine-jobs-dlq"
    error_message = "Every name must start with the prefix the apply role allows"
  }
}

run "queue_timing_and_redrive" {
  command = plan

  assert {
    condition     = aws_sqs_queue.jobs.visibility_timeout_seconds == 1080
    error_message = "The visibility timeout must stay longer than the lease and the worker timeout"
  }

  assert {
    condition     = jsondecode(aws_sqs_queue.jobs.redrive_policy).maxReceiveCount == 5
    error_message = "A job moves to the dead letter queue after 5 receives"
  }
}

run "bucket_is_private_and_expires" {
  command = plan

  assert {
    condition     = aws_s3_bucket_public_access_block.jobs.block_public_acls && aws_s3_bucket_public_access_block.jobs.restrict_public_buckets
    error_message = "The bucket must block public access"
  }

  assert {
    condition     = one(aws_s3_bucket_lifecycle_configuration.jobs.rule).expiration[0].days == 7
    error_message = "Objects must expire after 7 days"
  }
}
