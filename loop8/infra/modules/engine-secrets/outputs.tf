output "secret_names" {
  description = "Full names of the secrets, for the upload script and the worker settings"
  value       = [for s in aws_secretsmanager_secret.this : s.name]
}
