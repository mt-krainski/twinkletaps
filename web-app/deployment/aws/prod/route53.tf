resource "aws_route53_record" "server-record" {
  zone_id = aws_route53_zone.public_zone.zone_id
  name    = "app.twinkletaps.com"
  type    = "A"
  ttl     = "300"
  records = [aws_instance.one_lamp_instance.public_ip]
}