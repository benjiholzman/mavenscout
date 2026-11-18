# Lets people call named foundation models. A managed policy and a role that
# carries it. The role trusts only the roles in trusted_role_names. The policy is
# not attached to those roles: a Loop8 guardrail denies any change to them, so the
# engineers assume this role when they need the models instead.

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "invoke" {
  statement {
    sid       = "InvokeNamedModels"
    actions   = ["bedrock:InvokeModel"]
    resources = [for id in var.model_ids : "arn:aws:bedrock:${var.region}::foundation-model/${id}"]
    effect    = "Allow"
  }
}

data "aws_iam_policy_document" "combined" {
  source_policy_documents = [
    data.aws_iam_policy_document.invoke.json,
    data.aws_iam_policy_document.invoke_profiles.json,
  ]
}

# Models called through a cross region inference profile. The call needs the
# profile and the foundation model in every region the profile routes to.
locals {
  profile_resources = flatten([
    for id in var.profile_model_ids : concat(
      ["arn:aws:bedrock:${var.region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.profile_prefix}.${id}"],
      [for r in var.profile_regions : "arn:aws:bedrock:${r}::foundation-model/${id}"],
    )
  ])
}

data "aws_iam_policy_document" "invoke_profiles" {
  dynamic "statement" {
    for_each = length(local.profile_resources) > 0 ? [1] : []

    content {
      sid       = "InvokeNamedModelsThroughProfile"
      actions   = ["bedrock:InvokeModel"]
      resources = local.profile_resources
      effect    = "Allow"
    }
  }
}

resource "aws_iam_policy" "invoke" {
  name        = "${var.name_prefix}-bedrock-invoke"
  description = "Allows bedrock:InvokeModel on the named foundation models only"
  policy      = data.aws_iam_policy_document.combined.json
}

data "aws_iam_policy_document" "trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = [for name in var.trusted_role_names : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${name}"]
    }
  }
}

resource "aws_iam_role" "invoke" {
  name               = "${var.name_prefix}-titan-invoke"
  description        = "Assumed by the engineers to call the named foundation models"
  assume_role_policy = data.aws_iam_policy_document.trust.json
}

resource "aws_iam_role_policy_attachment" "invoke" {
  role       = aws_iam_role.invoke.name
  policy_arn = aws_iam_policy.invoke.arn
}
