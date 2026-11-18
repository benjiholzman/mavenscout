"""Run Checkov with support for GitHub's immutable owner-ID subject format.

Checkov 3.3.30 rejects an @owner-ID before the repository separator. Extend
that one grammar rule before loading checks; keep all claim-order, wildcard
and missing-constraint checks enabled. Remove this adapter when upstream's
OIDC parser supports immutable subjects.
"""
import re


def enable_immutable_subjects():
    from checkov.common.util import oidc_utils

    original = r"(\$\{)?[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*(\})?/[^/]+"
    compatible = r"(\$\{)?[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*(\})?(?:@[0-9]+)?/[^/]+"
    if oidc_utils.gh_repo_regex.pattern not in (original, compatible):
        raise RuntimeError("Checkov's OIDC parser changed; review the compatibility adapter")
    oidc_utils.gh_repo_regex = re.compile(compatible)


if __name__ == "__main__":
    enable_immutable_subjects()
    from checkov.main import Checkov

    raise SystemExit(Checkov().run())
