variable "name_prefix" {
  description = "Prefix of every resource name. The apply role is scoped to this prefix, so it must be mavenscout-engine"
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly budget of the account in US dollars"
  type        = number
}

variable "engineer_role_names" {
  description = "Names of the human roles that get an explicit deny on model invocation when the budget reaches 100 percent of actual spend"
  type        = list(string)
}

variable "bedrock_alarm_models" {
  description = "Model id mapped to the input token count per hour that raises an alarm"
  type        = map(number)
}

variable "worker_role_names" {
  description = "Names of the service roles that get an explicit deny on model invocation when the budget reaches 150 percent of actual spend. Empty creates no action"
  type        = list(string)
  default     = []
}

variable "bedrock_throttle_alarm_models" {
  description = "Model ids whose Bedrock invocation throttles raise an alarm. List the profile id and the model id, since the dimension CloudWatch uses for profile calls is checked after the first call"
  type        = list(string)
  default     = []
}
