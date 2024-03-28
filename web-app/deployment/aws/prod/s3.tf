resource "aws_s3_bucket" "terraform-state" {
  bucket = var.tf_state_bucket
}
