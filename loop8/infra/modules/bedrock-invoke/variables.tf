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

variable "profile_model_ids" {
  description = "Foundation model ids called through a cross region inference profile"
  type        = list(string)
  default     = []
}

variable "profile_prefix" {
  description = "Prefix of the inference profile ids, for example us"
  type        = string
  default     = "us"
}

variable "profile_regions" {
  description = "Regions the inference profile routes to. The foundation model must be allowed in each"
  type        = list(string)
  default     = []
}
