variable "aws_region" {
  description = "Region of the POC environment"
  type        = string
  default     = "us-east-1"
}

variable "monthly_budget_usd" {
  description = "Monthly budget of the account in US dollars. Set to 350 by the project lead on 2026-11-18"
  type        = number
  default     = 350
}

variable "engineer_role_names" {
  description = "Names of the human roles that get an explicit deny on model invocation when the budget reaches 100 percent of actual spend."
  type        = list(string)
  default     = ["Loop8-ReadOnly"]
}

variable "bedrock_alarm_models" {
  description = "Model id mapped to the input token count per hour that raises an alarm. Titan V2 is bounded by its quota, so its value is a wide safety margin. Add Luna and Sol when their ids are confirmed"
  type        = map(number)
  default = {
    "amazon.titan-embed-text-v2:0" = 5000000
  }
}

# tflint-ignore: terraform_unused_declarations
# Used by the OpenSearch resources, which are written together with the build check.
variable "enable_opensearch" {
  description = "Create the OpenSearch Serverless collection. It bills by the hour, so it stays false except during the build check"
  type        = bool
  default     = false
}
