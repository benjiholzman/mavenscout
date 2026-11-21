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
  description = "Model id mapped to the input token count per hour that raises an alarm. Titan V2 is bounded by its quota, so its value is a wide safety margin. Luna and Sol were added on 2026-11-18, Nova Lite, Nova Pro and Nova 2 Lite on 2026-11-20"
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
    # Temporary models while Luna and Sol are blocked. Nova Lite takes the Fit load
    # and Nova Pro the text load, so the values follow Luna and Sol. Estimates, not
    # measured. Both ids are listed for the same reason as above.
    "us.amazon.nova-lite-v1:0" = 20000000
    "amazon.nova-lite-v1:0"    = 20000000
    "us.amazon.nova-pro-v1:0"  = 5000000
    "amazon.nova-pro-v1:0"     = 5000000
    # Nova 2 Lite is a comparison model for Fit, so its value follows Nova Lite.
    "us.amazon.nova-2-lite-v1:0" = 20000000
    "amazon.nova-2-lite-v1:0"    = 20000000
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
  description = "Foundation models that engineers may invoke through the US inference profile. GPT-6 Luna for Fit and GPT-6 Sol for extraction and summaries, confirmed on 2026-11-16. Nova Lite and Nova Pro were added on 2026-11-20 as temporary models while Luna and Sol are blocked for this account, and Nova 2 Lite the same day as a comparison model for Fit"
  type        = list(string)
  default     = ["openai.gpt-6-luna", "openai.gpt-6-sol", "amazon.nova-lite-v1:0", "amazon.nova-pro-v1:0", "amazon.nova-2-lite-v1:0"]
}

variable "invoke_profile_regions" {
  description = "Regions the US inference profile routes to, read from the account on 2026-11-18"
  type        = list(string)
  default     = ["us-east-1", "us-east-2", "us-west-2"]
}

variable "app_origins" {
  description = "Origins of the app that may call the API and read results. Add the deployed app URL when the customer gives it"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "api_rate_limit" {
  description = "API route throttling in requests per second. Estimate, adjust after the first runs"
  type        = number
  default     = 5
}

variable "api_burst_limit" {
  description = "API route throttling burst. Estimate, adjust after the first runs"
  type        = number
  default     = 10
}

variable "max_jobs_at_once" {
  description = "Most jobs the worker runs at once. Protects the model quotas. AWS allows a minimum of 2"
  type        = number
  default     = 2
}

variable "worker_memory_mb" {
  description = "Memory of the worker Lambda in MB, from the walking skeleton plan"
  type        = number
  default     = 1024
}

variable "worker_model_ids" {
  description = "Foundation models the worker may call directly. Titan V2 for embeddings"
  type        = list(string)
  default     = ["amazon.titan-embed-text-v2:0"]
}

variable "worker_profile_model_ids" {
  description = "Foundation models the worker may call through the US inference profile. Nova Lite is the temporary single model of variant A while GPT-6 Luna and Sol are blocked for this account (2026-11-20). A subset of invoke_profile_model_ids"
  type        = list(string)
  default     = ["amazon.nova-lite-v1:0"]
}

variable "engine_fit_model" {
  description = "Model id the API gives to every job for Fit. Variant A uses one model for everything. The code default is still GPT-6 Luna, so this must be set"
  type        = string
  default     = "us.amazon.nova-lite-v1:0"
}

variable "engine_text_model" {
  description = "Model id the API gives to every job for extraction and summaries. Same single model as Fit in variant A"
  type        = string
  default     = "us.amazon.nova-lite-v1:0"
}

variable "engine_embed_model" {
  description = "Model id the API gives to every job for embeddings. The index artifact must have been built with the same model"
  type        = string
  default     = "amazon.titan-embed-text-v2:0"
}

variable "index_artifact_key" {
  description = "Key of the gzipped index artifact in the jobs bucket, named after its index version. The object is uploaded by hand and is outside the 7 day expiry, which covers only inputs/ and results/. A new index goes under a new key and this default is changed in a pull request, which also restarts the worker so it reads the new index"
  type        = string
  default     = "index/index-13d7674312434864.json.gz"
}

variable "engine_mode" {
  description = "Engine the worker runs: semantic, stub, or empty to leave ENGINE out (the stub). The semantic engine calls Titan V2 and Nova Lite on every job, which the customer pays for. Set it to empty to turn the engine off"
  type        = string
  default     = "semantic"
}

variable "bedrock_throttle_alarm_models" {
  description = "Model ids whose Bedrock invocation throttles raise an alarm. The profile id and the model id of Nova Lite, as for the token alarms"
  type        = list(string)
  default     = ["us.amazon.nova-lite-v1:0", "amazon.nova-lite-v1:0"]
}
