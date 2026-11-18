provider "aws" {
  region = var.aws_region

  # Every resource carries the funding tag (loop8/CLAUDE.md section 9).
  default_tags {
    tags = {
      "aws-apn-id-916873233657" = "pc:8m1j53s4l98quhnwq6wgbhf0l"
      Project                   = "mavenscout"
      ManagedBy                 = "terraform"
    }
  }
}
