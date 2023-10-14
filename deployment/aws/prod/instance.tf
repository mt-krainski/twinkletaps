resource "aws_eip" "one_lamp_instance_ip" {
  instance = aws_instance.one_lamp_instance.id
}

resource "aws_key_pair" "ec2key" {
  key_name   = "publicKey"
  public_key = file(var.public_key_path)
}

resource "aws_instance" "one_lamp_instance" {
  ami                    = var.instance_ami
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.subnet_public.id
  vpc_security_group_ids = [aws_security_group.sg_default.id]
  key_name               = aws_key_pair.ec2key.key_name

  user_data = <<-EOL
  #!/bin/bash -xe

  # Install Docker - https://docs.docker.com/engine/install/ubuntu/
  sudo apt update
  sudo apt install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  # Add the repository to Apt sources:
  echo \
    "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt update

  sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Post-install configuration - https://docs.docker.com/engine/install/linux-postinstall/
  sudo groupadd -f docker
  sudo usermod -aG docker ubuntu
  newgrp docker
  sudo systemctl enable docker.service
  sudo systemctl enable containerd.service
  EOL

  tags = {
    Env = var.environment_tag
  }
}
