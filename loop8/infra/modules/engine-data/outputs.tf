output "bucket_name" {
  description = "Bucket for job inputs and results"
  value       = aws_s3_bucket.jobs.bucket
}

output "bucket_arn" {
  description = "ARN of the jobs bucket"
  value       = aws_s3_bucket.jobs.arn
}

output "table_name" {
  description = "Job state table"
  value       = aws_dynamodb_table.jobs.name
}

output "table_arn" {
  description = "ARN of the job state table"
  value       = aws_dynamodb_table.jobs.arn
}

output "queue_url" {
  description = "URL of the jobs queue"
  value       = aws_sqs_queue.jobs.url
}

output "queue_arn" {
  description = "ARN of the jobs queue"
  value       = aws_sqs_queue.jobs.arn
}
