output "secret_names" {
  description = "Full names of the secrets, for the upload script and the worker settings"
  value       = [for s in aws_secretsmanager_secret.this : s.name]
}

output "read_policy_arn" {
  description = "Policy that allows reading the secrets, null when no reader role is set"
  value       = length(aws_iam_policy.read) > 0 ? aws_iam_policy.read[0].arn : null
}
