# POC environment root. Each block is a module in modules/, following the Loop8
# infrastructure layout. There is one environment, so there is no envs/ layer.

module "cost_guard" {
  source = "./modules/cost-guard"

  name_prefix          = "mavenscout-engine"
  monthly_budget_usd   = var.monthly_budget_usd
  engineer_role_names  = var.engineer_role_names
  bedrock_alarm_models = var.bedrock_alarm_models
}
