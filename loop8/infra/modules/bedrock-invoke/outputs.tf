output "policy_arn" {
  description = "Policy that allows the invoke"
  value       = aws_iam_policy.invoke.arn
}

output "policy_name" {
  description = "Name of the policy"
  value       = aws_iam_policy.invoke.name
}

output "role_name" {
  description = "Role the engineers assume to call the models"
  value       = aws_iam_role.invoke.name
}
