variable "name_prefix" {
  description = "Prefix of every resource name. The apply role is scoped to this prefix, so it must be mavenscout-engine"
  type        = string
}

variable "region" {
  description = "Region of the environment"
  type        = string
}

variable "dist_dir" {
  description = "Folder with the esbuild output of loop8/engine, api/index.mjs, worker/index.mjs and extract/index.mjs"
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

variable "alerts_topic_arn" {
  description = "Topic that receives the failure alarms of the worker"
  type        = string
}

variable "worker_model_ids" {
  description = "Foundation models the worker may call directly in the region of the environment, for example Titan V2"
  type        = list(string)
  default     = []
}

variable "worker_profile_model_ids" {
  description = "Foundation models the worker may call through the cross region inference profile, for example Nova Lite. The worker needs the profile and the foundation model in every region the profile routes to"
  type        = list(string)
  default     = []
}

variable "profile_prefix" {
  description = "Prefix of the inference profile ids, for example us"
  type        = string
  default     = "us"
}

variable "profile_regions" {
  description = "Regions the inference profile routes to"
  type        = list(string)
  default     = []
}

variable "secret_arns" {
  description = "ARNs of the secrets the worker may read, and nothing else"
  type        = list(string)
  default     = []
}

variable "supabase_secret_id" {
  description = "Name of the secret that holds the Supabase values. The worker reads it at run time, only the name is stored here. Empty leaves the setting out"
  type        = string
  default     = ""
}

variable "index_artifact_key" {
  description = "Key of the gzipped index artifact in the jobs bucket. Empty leaves the setting out"
  type        = string
  default     = ""
}

variable "engine_mode" {
  description = "Value of ENGINE for the worker: stub or semantic. Empty leaves ENGINE out, which runs the stub. The semantic engine needs the index key and the Supabase secret"
  type        = string
  default     = ""

  validation {
    condition     = contains(["", "stub", "semantic"], var.engine_mode)
    error_message = "engine_mode must be empty, stub or semantic."
  }
}

variable "fit_model" {
  description = "Model id the API gives to jobs for Fit. Empty keeps the engine default"
  type        = string
  default     = ""
}

variable "text_model" {
  description = "Model id the API gives to jobs for summaries. Empty keeps the engine default. Extraction has its own variable, extract_model"
  type        = string
  default     = ""
}

variable "embed_model" {
  description = "Model id the API gives to jobs for embeddings. Empty keeps the engine default"
  type        = string
  default     = ""
}

variable "worker_error_alarm_seconds" {
  description = "Duration in seconds above which the worker alarm fires. Set below the worker timeout so a long run is seen before it is cut"
  type        = number
  default     = 150
}

variable "extract_model" {
  description = "Model id of the extraction, given to the extract Lambda as EXTRACT_MODEL. Empty keeps the engine default, which is GPT-6 Sol and is blocked for this account"
  type        = string
  default     = ""
}

variable "extract_profile_model_ids" {
  description = "Foundation models the extract Lambda may call through the cross region inference profile. It needs the profile and the foundation model in every region the profile routes to. Empty gives the role no model access"
  type        = list(string)
  default     = []
}

variable "extract_memory_mb" {
  description = "Memory of the extract Lambda in MB. Estimate, adjust after the first runs"
  type        = number
  default     = 512
}

variable "extract_rate_limit" {
  description = "Throttling of POST /extract in requests per second. Estimate, adjust after the first runs"
  type        = number
  default     = 1
}

variable "extract_burst_limit" {
  description = "Throttling burst of POST /extract. Estimate, adjust after the first runs"
  type        = number
  default     = 3
}

variable "extract_error_alarm_seconds" {
  description = "Duration in seconds above which the extract alarm fires. Set below the extract timeout of 25 seconds"
  type        = number
  default     = 20
}
