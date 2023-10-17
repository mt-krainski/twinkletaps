resource "aws_security_group" "sg_default" {
  name   = "sg_default"
  vpc_id = aws_vpc.vpc.id
  ingress {
    description = "ssh"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    # Restrict SSH access to only necessary IPs and ports.
    # Opening to 0.0.0.0/0 can lead to security vulnerabilities.
    cidr_blocks = ["${chomp(data.http.local_ip.response_body)}/32"]
  }
  ingress {
    description = "http"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "https"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    description = "open internet"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  lifecycle {
    create_before_destroy = true
  }
  timeouts {
    delete = "2m"
  }
  tags = {
    Env = var.environment_tag
  }
}
