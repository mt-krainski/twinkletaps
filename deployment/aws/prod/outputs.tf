output "ec2_eip" {
  value = aws_eip.twinkletaps_instance_ip.public_dns
}
