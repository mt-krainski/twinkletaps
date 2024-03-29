resource "aws_eip" "twinkletaps_instance_ip" {
  instance = aws_instance.twinkletaps_instance.id
}

resource "aws_key_pair" "ec2key" {
  key_name   = "publicKey"
  public_key = file(var.public_key_path)
}

resource "aws_instance" "twinkletaps_instance" {
  ami                    = var.instance_ami
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.subnet_public.id
  vpc_security_group_ids = [aws_security_group.sg_default.id]
  key_name               = aws_key_pair.ec2key.key_name

  user_data = file("${path.module}/${var.install_docker_script}")

  tags = {
    Env = var.environment_tag
  }
}
