output "alerts_topic_arn" {
  description = "Topic that receives budget and alarm messages. Subscribe an address to it by hand"
  value       = aws_sns_topic.alerts.arn
}

output "budget_name" {
  description = "Name of the monthly budget"
  value       = aws_budgets_budget.monthly.name
}

output "bedrock_deny_policy_arn" {
  description = "Policy that denies model invocation. The worker role gets it at the second cut, added with the worker Lambda"
  value       = aws_iam_policy.bedrock_deny.arn
}
