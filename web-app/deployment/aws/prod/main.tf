terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
  backend "s3" {
    bucket  = "twinlketaps-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
    profile = "PowerUser"
  }
}

provider "aws" {
  profile = "PowerUser"
  region  = var.region
}
