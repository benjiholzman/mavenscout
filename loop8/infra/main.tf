# POC environment root. Each block is a module in modules/, following the Loop8
# infrastructure layout. There is one environment, so there is no envs/ layer.

module "cost_guard" {
  source = "./modules/cost-guard"

  name_prefix          = "mavenscout-engine"
  monthly_budget_usd   = var.monthly_budget_usd
  engineer_role_names  = concat(var.engineer_role_names, [module.bedrock_invoke.role_name])
  bedrock_alarm_models = var.bedrock_alarm_models

  worker_role_names             = [module.engine_api.worker_role_name, module.engine_api.extract_role_name]
  bedrock_throttle_alarm_models = var.bedrock_throttle_alarm_models
}

module "bedrock_invoke" {
  source = "./modules/bedrock-invoke"

  name_prefix = "mavenscout-engine"
  region      = var.aws_region
  model_ids   = var.invoke_model_ids

  profile_model_ids = var.invoke_profile_model_ids
  profile_prefix    = "us"
  profile_regions   = var.invoke_profile_regions

  trusted_role_names = var.engineer_role_names
}

module "engine_data" {
  source = "./modules/engine-data"

  name_prefix      = "mavenscout-engine"
  app_origins      = var.app_origins
  alerts_topic_arn = module.cost_guard.alerts_topic_arn
}

module "engine_api" {
  source = "./modules/engine-api"

  name_prefix = "mavenscout-engine"
  region      = var.aws_region
  dist_dir    = "${path.module}/../engine/dist"

  bucket_name = module.engine_data.bucket_name
  bucket_arn  = module.engine_data.bucket_arn
  table_name  = module.engine_data.table_name
  table_arn   = module.engine_data.table_arn
  queue_url   = module.engine_data.queue_url
  queue_arn   = module.engine_data.queue_arn

  app_origins      = var.app_origins
  api_rate_limit   = var.api_rate_limit
  api_burst_limit  = var.api_burst_limit
  max_jobs_at_once = var.max_jobs_at_once
  worker_memory_mb = var.worker_memory_mb

  alerts_topic_arn = module.cost_guard.alerts_topic_arn

  # The worker role may call these models and read this secret and nothing else
  worker_model_ids         = var.worker_model_ids
  worker_profile_model_ids = var.worker_profile_model_ids
  profile_prefix           = "us"
  profile_regions          = var.invoke_profile_regions
  secret_arns              = [module.engine_secrets.secret_arns["supabase"]]
  supabase_secret_id       = module.engine_secrets.secret_ids["supabase"]
  index_artifact_key       = var.index_artifact_key
  engine_mode              = var.engine_mode

  # The extract Lambda may call this model and nothing else
  extract_model             = var.extract_model
  extract_profile_model_ids = var.extract_profile_model_ids
  extract_memory_mb         = var.extract_memory_mb
  extract_rate_limit        = var.extract_rate_limit
  extract_burst_limit       = var.extract_burst_limit

  # Settings the API gives to every job
  fit_model   = var.engine_fit_model
  text_model  = var.engine_text_model
  embed_model = var.engine_embed_model
}

module "engine_secrets" {
  source = "./modules/engine-secrets"

  name_prefix  = "mavenscout"
  secret_names = ["supabase"]

  # The engineers assume this role, so they read the secrets through it
  reader_role_names = [module.bedrock_invoke.role_name]
}
