variable "cidr_vpc" {
  description = "CIDR block for the VPC"
  default     = "10.1.0.0/16"
}
variable "cidr_subnet" {
  description = "CIDR block for the subnet"
  default     = "10.1.0.0/24"
}
variable "availability_zone" {
  description = "availability zone to create subnet"
  default     = "us-east-1a"
}
variable "region" {
  description = "AWS region for the deployment"
  default     = "us-east-1"
}
variable "public_key_path" {
  description = "Public key path"
  default     = "~/.ssh/id_ed25519.pub"
}
variable "install_docker_script" {
  description = "Install and configure docker for Ubutnu"
  default     = "scripts/install-docker.sh"
}
variable "instance_ami" {
  description = "AMI for aws EC2 instance"
  default     = "ami-053b0d53c279acc90"
}
variable "instance_type" {
  description = "type for aws EC2 instance"
  default     = "t2.micro"
}
variable "environment_tag" {
  description = "Environment tag"
  default     = "prod"
}
variable "tf_state_bucket" {
  description = "Bucket used for managing the TF state"
  default     = "twinlketaps-terraform-state"
}