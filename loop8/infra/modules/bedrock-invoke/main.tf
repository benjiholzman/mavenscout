# Lets people call named foundation models. It is only a managed policy. Nothing
# is attached here: the apply role may not attach policies to roles that belong
# to people, so the project lead attaches it once to the engineer role by hand
# (see loop8/docs/runbooks/poc-environment.md).

data "aws_iam_policy_document" "invoke" {
  statement {
    sid       = "InvokeNamedModels"
    actions   = ["bedrock:InvokeModel"]
    resources = [for id in var.model_ids : "arn:aws:bedrock:${var.region}::foundation-model/${id}"]
    effect    = "Allow"
  }
}

resource "aws_iam_policy" "invoke" {
  name        = "${var.name_prefix}-bedrock-invoke"
  description = "Allows bedrock:InvokeModel on the named foundation models only"
  policy      = data.aws_iam_policy_document.invoke.json
}
