output "ec2_eip" {
  value = aws_eip.one_lamp_instance_ip.public_dns
}
