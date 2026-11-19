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

# Read access for named roles. One action on the secrets this module creates, so
# the roles cannot read any other secret. The policy is attached to roles that the
# pipeline manages (the apply role cannot change Loop8-ReadOnly).
data "aws_iam_policy_document" "read" {
  count = length(var.reader_role_names) > 0 ? 1 : 0

  statement {
    sid       = "ReadEngineSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [for s in aws_secretsmanager_secret.this : s.arn]
    effect    = "Allow"
  }
}

resource "aws_iam_policy" "read" {
  count = length(var.reader_role_names) > 0 ? 1 : 0

  name        = "${var.name_prefix}-engine-secrets-read"
  description = "Allows secretsmanager:GetSecretValue on the engine secrets only"
  policy      = data.aws_iam_policy_document.read[0].json
}

resource "aws_iam_role_policy_attachment" "read" {
  for_each = toset(var.reader_role_names)

  role       = each.value
  policy_arn = aws_iam_policy.read[0].arn
}
