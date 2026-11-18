output "policy_arn" {
  description = "Policy to attach to the engineer role by hand"
  value       = aws_iam_policy.invoke.arn
}

output "policy_name" {
  description = "Name of the policy"
  value       = aws_iam_policy.invoke.name
}
