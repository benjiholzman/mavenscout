variable "name_prefix" {
  description = "Prefix of every resource name. The apply role is scoped to this prefix, so it must be mavenscout-engine"
  type        = string
}

variable "app_origins" {
  description = "Origins of the app that may read results from the bucket (CORS)"
  type        = list(string)
}

variable "alerts_topic_arn" {
  description = "Topic that receives the alarm when the dead letter queue has a message"
  type        = string
}
