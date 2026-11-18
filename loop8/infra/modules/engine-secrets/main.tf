# Secret containers for the engine. Terraform creates them empty. The value is
# added once by the person who holds it, with loop8/infra/scripts/put-secret.sh,
# so no secret value is in the repository, the plan or the state.

resource "aws_secretsmanager_secret" "this" {
  #checkov:skip=CKV_AWS_149:the default AWS managed key is enough for a temporary POC, a customer managed key adds cost and key policy work
  #checkov:skip=CKV2_AWS_57:the values are connection strings set by hand, automatic rotation does not apply
  for_each = var.secret_names

  name                    = "${var.name_prefix}/${each.key}"
  description             = "MavenScout ranking engine POC secret ${each.key}. Value set by hand, never by Terraform"
  recovery_window_in_days = 7
}
