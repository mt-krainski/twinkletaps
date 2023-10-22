# The One Lamp Project

This is a pretty silly, albeit fun project idea to build a lamp I could control via a website. And then perhaps, randomly, give access to it to everyone in the internet.

This has two components:

- the Lamp code, which is an Arduino based project in `arduino-main`
- the web-app code, which is a Python FastAPI based project, along with an AWS deployment manifests
  - For development, best use the `poetry-dotenv-plugin`

## Tricks

- `tail -f /var/log/cloud-init-output.log` to see user-data scripts logs on the EC2 instance
- `terraform apply -replace=aws_instance.one_lamp_instace` to force instance to be recreated
