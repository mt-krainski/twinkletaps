resource "aws_route53_zone" "public_zone" {
  name = var.domain_prod
  comment = "${var.domain_prod} public zone"
  provider = aws
}