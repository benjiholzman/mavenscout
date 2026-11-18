variable "name_prefix" {
  description = "Prefix of the policy name. The apply role can only create policies under mavenscout-engine, so it must be mavenscout-engine"
  type        = string
}

variable "region" {
  description = "Region of the foundation models"
  type        = string
}

variable "model_ids" {
  description = "Foundation model ids the policy allows. One action, bedrock:InvokeModel, on these models only"
  type        = list(string)
}

variable "trusted_role_names" {
  description = "Names of the roles that may assume the invoke role"
  type        = list(string)
}
