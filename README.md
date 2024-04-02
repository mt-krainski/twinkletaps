# TwinkleTaps

This is a pretty silly, albeit fun project idea to build a lamp I could control via a website. And then perhaps, randomly, give access to it to everyone in the internet.

This has a few components:

- the Lamp code, which is an Arduino based project in `arduino-main`
- the web-app code, which is a Python FastAPI based project, along with an AWS deployment manifests
  - For development, best use the `poetry-dotenv-plugin`
- the UI which is using Vue.js and Nuxt
- the deployment to AWS using Terraform

## Some plans for the near future

This section describes what I plan to work on in the near future.

- [ ] Actual Login functionality, e.g. with Ory
- [ ] Hook up email, e.g. from SES to Ory for account management
- [ ] Backend to receive "user created" event
- [ ] User profile page
  - [ ] Support User avatar as Gravatar
  - [ ] Support User avatar
- [ ] UX workflow - what happens after the user signs up
  - [ ] Welcome to TwinkleTaps
  - [ ] No tap-receiving devices yet! Click "here" to add one
  - [ ] Logic for sending an invite code for someone to be able to tap on your device
- [ ] Backend for CRUD on tap-receiving devices
- [ ] Backend for link between user and tap-receiving devices
- [ ] API key based auth for machine connections for tap-receiving devices
- [ ] Backend for CRUD on taps
- [ ] Very basic queue mechanism for sending taps out
- [ ] UI for displaying taps on charts, e.g. https://vue-chartjs.org/
  - [ ] UI for displaying current recorded tap
  - [ ] history UI for showing past taps

## Tricks

- `tail -f /var/log/cloud-init-output.log` to see user-data scripts logs on the EC2 instance
- `terraform apply -replace=aws_instance.one_lamp_instace` to force instance to be recreated
