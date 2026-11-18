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
  description = "Model id mapped to the input token count per hour that raises an alarm. Titan V2 is bounded by its quota, so its value is a wide safety margin. Luna and Sol were added on 2026-11-18"
  type        = map(number)
  default = {
    "amazon.titan-embed-text-v2:0" = 5000000
    # Estimates, not measured. AWS has not published the price of Luna. Luna scores
    # each candidate, so a ranking is the larger load. Both ids are listed because
    # the dimension CloudWatch uses for profile calls is checked after the first call.
    "us.openai.gpt-6-luna" = 20000000
    "openai.gpt-6-luna"    = 20000000
    "us.openai.gpt-6-sol"  = 5000000
    "openai.gpt-6-sol"     = 5000000
  }
}

# tflint-ignore: terraform_unused_declarations
# Used by the OpenSearch resources, which are written together with the build check.
variable "enable_opensearch" {
  description = "Create the OpenSearch Serverless collection. It bills by the hour, so it stays false except during the build check"
  type        = bool
  default     = false
}

variable "invoke_model_ids" {
  description = "Foundation models that engineers may invoke directly in the region of the environment. Titan V2"
  type        = list(string)
  default     = ["amazon.titan-embed-text-v2:0"]
}

variable "invoke_profile_model_ids" {
  description = "Foundation models that engineers may invoke through the US inference profile. GPT-6 Luna for Fit and GPT-6 Sol for extraction and summaries, confirmed on 2026-11-16"
  type        = list(string)
  default     = ["openai.gpt-6-luna", "openai.gpt-6-sol"]
}

variable "invoke_profile_regions" {
  description = "Regions the US inference profile routes to, read from the account on 2026-11-18"
  type        = list(string)
  default     = ["us-east-1", "us-east-2", "us-west-2"]
}
