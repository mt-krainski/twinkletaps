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
    profile = "lamp"
  }
}

provider "aws" {
  profile = "lamp"
  region  = var.region
}
