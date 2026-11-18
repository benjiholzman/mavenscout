# POC environment root. Each block is a module in modules/, following the Loop8
# infrastructure layout. There is one environment, so there is no envs/ layer.

module "cost_guard" {
  source = "./modules/cost-guard"

  name_prefix          = "mavenscout-engine"
  monthly_budget_usd   = var.monthly_budget_usd
  engineer_role_names  = concat(var.engineer_role_names, [module.bedrock_invoke.role_name])
  bedrock_alarm_models = var.bedrock_alarm_models
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
