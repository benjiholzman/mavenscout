terraform {
  required_version = ">= 1.14.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }

  # Native S3 locking, no DynamoDB table. The bucket is created by
  # loop8/infra/bootstrap/bootstrap.yaml.
  backend "s3" {
    bucket       = "mavenscout-poc-tfstate"
    key          = "poc/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
