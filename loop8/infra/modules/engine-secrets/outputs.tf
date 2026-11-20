output "secret_names" {
  description = "Full names of the secrets, for the upload script and the worker settings"
  value       = [for s in aws_secretsmanager_secret.this : s.name]
}

output "read_policy_arn" {
  description = "Policy that allows reading the secrets, null when no reader role is set"
  value       = length(aws_iam_policy.read) > 0 ? aws_iam_policy.read[0].arn : null
}

output "secret_arns" {
  description = "ARN of each secret, keyed by its short name, for the roles that read it"
  value       = { for k, s in aws_secretsmanager_secret.this : k => s.arn }
}

output "secret_ids" {
  description = "Full name of each secret, keyed by its short name, for the settings of the functions that read it"
  value       = { for k, s in aws_secretsmanager_secret.this : k => s.name }
}
