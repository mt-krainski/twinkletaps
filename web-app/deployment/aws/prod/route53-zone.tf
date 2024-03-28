resource "aws_route53_zone" "twinkletaps" {
  name = var.domain_prod
}