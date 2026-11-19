variable "name_prefix" {
  description = "Prefix of every resource name. The apply role is scoped to this prefix, so it must be mavenscout-engine"
  type        = string
}

variable "region" {
  description = "Region of the environment"
  type        = string
}

variable "dist_dir" {
  description = "Folder with the esbuild output of loop8/engine, api/index.mjs and worker/index.mjs"
  type        = string
}

variable "bucket_name" {
  description = "Jobs bucket"
  type        = string
}

variable "bucket_arn" {
  description = "ARN of the jobs bucket"
  type        = string
}

variable "table_name" {
  description = "Job state table"
  type        = string
}

variable "table_arn" {
  description = "ARN of the job state table"
  type        = string
}

variable "queue_url" {
  description = "URL of the jobs queue"
  type        = string
}

variable "queue_arn" {
  description = "ARN of the jobs queue"
  type        = string
}

variable "app_origins" {
  description = "Origins of the app that may call the API (CORS)"
  type        = list(string)
}

variable "api_rate_limit" {
  description = "Route throttling, requests per second. Estimate, adjust after the first runs"
  type        = number
}

variable "api_burst_limit" {
  description = "Route throttling burst. Estimate, adjust after the first runs"
  type        = number
}

variable "max_jobs_at_once" {
  description = "Most jobs the worker runs at the same time. AWS allows a minimum of 2"
  type        = number
}

variable "worker_memory_mb" {
  description = "Memory of the worker Lambda in MB"
  type        = number
}
