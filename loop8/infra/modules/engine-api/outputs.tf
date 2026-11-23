output "api_url" {
  description = "URL of the engine API. Marked sensitive so it is not printed in the public pipeline log. Read it with aws apigatewayv2 get-apis"
  value       = aws_apigatewayv2_api.engine.api_endpoint
  sensitive   = true
}

output "worker_role_name" {
  description = "Role of the worker Lambda"
  value       = aws_iam_role.worker.name
}

output "extract_role_name" {
  description = "Role of the extract Lambda"
  value       = aws_iam_role.extract.name
}
