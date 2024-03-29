resource "aws_route53_record" "server_record" {
  zone_id = aws_route53_zone.twinkletaps.zone_id
  name    = "app.twinkletaps.com"
  type    = "A"
  ttl     = "300"
  records = [aws_eip.twinkletaps_instance_ip.public_ip]
}