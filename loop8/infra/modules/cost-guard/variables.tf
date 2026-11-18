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
