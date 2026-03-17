# SaaS Starter

A modern Next.js starter for building SaaS applications with authentication, database, and storage.

## Tech Stack

- **Next.js** - React framework with App Router
- **shadcn/ui** - Modern component library
- **Supabase** - Database, authentication, and storage
- **TypeScript** - Type safety

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up your Supabase project and add environment variables

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## MQTT / HiveMQ

### Starting the broker

```bash
npm run hivemq:start   # starts HiveMQ in Docker
npm run hivemq:logs    # tail broker logs
npm run hivemq:stop    # stop the broker
```

### Environment variables

The broker reads from the root `.env` file via `env_file`. Key variables:

| Variable | Used by | Description |
|---|---|---|
| `TWINKLETAPS_AUTH_URL` | HiveMQ extension | URL the extension calls to verify credentials (e.g. `http://host.docker.internal:3000/api/mqtt/auth`) |
| `TWINKLETAPS_AUTH_SECRET` | HiveMQ extension | Bearer token sent to the auth endpoint |
| `MQTT_AUTH_SECRET` | Next.js app | Same secret — the app side validates it |
| `MQTT_BROKER_URL` | Next.js app | Broker connection string (e.g. `mqtt://localhost:1883`) |
| `MQTT_PUBLISHER_USERNAME` | Next.js app | Service account username for publishing to device topics |
| `MQTT_PUBLISHER_PASSWORD` | Next.js app | Service account password |

### Testing with mosquitto

Install: `brew install mosquitto`

Subscribe to a device topic:

```bash
mosquitto_sub -h localhost -p 1883 \
  -u "dev_XXXXXXXXXXXX" -P "DEVICE_PASSWORD" \
  -t "twinkletaps/devices/DEVICE_UUID"
```

Publish as the service account:

```bash
mosquitto_pub -h localhost -p 1883 \
  -u "$MQTT_PUBLISHER_USERNAME" -P "$MQTT_PUBLISHER_PASSWORD" \
  -t "twinkletaps/devices/DEVICE_UUID" \
  -m '{"color": "#ff0000"}'
```

Device credentials are generated during device registration and shown once in the UI.

## Features

- User authentication (login/signup)
- Account management
- Database setup with profiles table
- Modern UI components
- TypeScript throughout

## TODOs

Phase 1:

- teams and workspaces
- concept of documents - user or team owns documents
- left sidebar displays private documents
- left sidebar displays a list of teams and documents within teams
- left sidebar has buttons to add and edit teams (admin-only)
- left sidebar has buttons to add documents
- search can search through documents
- admin settings - workspace settings (general (name), teams, members, delete); nice composable UI 


At this point, the starter is ready to be used to build MVP-grade SaaS applications.

Phase 2:

- Admin dashboard
- Stripe payments - Subscriptions (monthly/yearly recurring) + token/credit-based purchases + mechanism to override and grant credits manually
- Feature flagging interface - Enable/disable features per workspace, team, or user
- Analytics integration - Pre-wired for Google Analytics or another provider
- Internationalization (i18n) - Multi-language and region support
- Help desk integration - Embedded support system with a chat widget

At this point, the starter is ready to be used to build production-grade SaaS applications.
