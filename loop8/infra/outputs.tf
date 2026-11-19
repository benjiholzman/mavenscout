output "engine_api_url" {
  description = "URL of the engine API. Sensitive so it is not printed in the public pipeline log. Read it with aws apigatewayv2 get-apis"
  value       = module.engine_api.api_url
  sensitive   = true
}
