# Node.js Webhook Gateway Server (Elysia Version)

![Node.js](https://img.shields.io/badge/node-%3E%3D22-green)
![Elysia](https://img.shields.io/badge/elysia-1.4.x-purple)
![JWT](https://img.shields.io/badge/jwt-enabled-blue)
![Tailwind](https://img.shields.io/badge/tailwind-styled-yellow)
![Render](https://img.shields.io/badge/render-deployed-brightgreen)

A **lightweight, real-time webhook gateway** built with **Node.js**, **Elysia.js**, and **Tailwind CSS**, supporting JWT authentication, in-memory queueing with retry logic, and a monitoring dashboard.

This project is designed for testing, development, and small-scale production webhook handling with an interactive SPA dashboard.

---

## Features

* **Webhook Receiver**

  * Accepts POST requests with JSON payloads.
  * Validates JWT signature for secure authentication.
  * Supports in-memory queueing with retry logic (configurable max retries: 3).

* **In-memory Queue**

  * Items are retried up to `MAX_RETRIES` before being dropped.
  * Processed events are stored in a rolling history (max 20 events) for monitoring.

* **Monitoring Dashboard**

  * Interactive SPA built with Tailwind CSS.
  * Real-time stats: queue length, processed events, recent event history.
  * Quick preset buttons for common webhook events.
  * Live cURL example updated with current JWT token and payload.
  * Client-side token management with auto-refresh.

* **JWT Authentication**

  * Validates incoming webhook signatures using JWT tokens.
  * Provides `/generate-test-token` endpoint for development/testing.
  * Supports valid, invalid, or no signature modes for testing error handling.

* **Health Check**

  * `/health` endpoint returning server status, uptime, and queue info.

* **TypeScript**

  * Strong typing for payloads, queue items, and processed events.
  * Schema validation for incoming webhook requests.

---

## Technology Stack

* **Node.js >=22** – Runtime environment
* **Elysia.js 1.4.x** – Lightweight HTTP framework
* **@elysiajs/node** – Node.js adapter
* **@elysiajs/html** – Middleware for serving HTML
* **jsonwebtoken 9.x** – JWT signing & verification
* **Tailwind CSS (CDN)** – Modern responsive UI styling
* **TypeScript 5.9.x** – Type safety for server & client
* Vanilla **JavaScript SPA** served directly by the backend
* No frontend build tools required

---

## Installation & Running Locally

1. Clone the repository:

```bash
git clone https://github.com/smart-developer1791/nodejs-webhook-gateway-elysia
cd nodejs-webhook-gateway-elysia
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm run dev
```

4. Open the dashboard:

[http://localhost:8080](http://localhost:8080)

5. Health check:

```bash
curl http://localhost:8080/health
```

---

## Endpoints

| Path                   | Method | Description                                                     |
| ---------------------- | ------ | --------------------------------------------------------------- |
| `/`                    | GET    | Serves the monitoring dashboard SPA                             |
| `/webhook`             | POST   | Accepts incoming webhook payloads with JWT signature validation |
| `/generate-test-token` | GET    | Returns a JWT token for testing (expires in 1 hour)             |
| `/queue-status`        | GET    | Returns current queue metrics and recent events for dashboard   |
| `/health`              | GET    | Returns server status, uptime, and queue statistics             |

### Webhook Payload Structure

```ts
interface WebhookPayload {
  event: string; // Event type, e.g., "user.created"
  data: any;     // Arbitrary JSON payload
}
```

### Queue Item Structure

```ts
interface WebhookQueueItem {
  payload: WebhookPayload;
  retries: number;   // Number of processing attempts
  addedAt: number;   // Timestamp (Unix ms)
}
```

### Processed Event Structure

```ts
interface ProcessedEvent {
  event: string;
  status: "success" | "failed";
  timestamp: number;
}
```

---

## Client Dashboard

* Built with **Tailwind CSS CDN** and **vanilla JS SPA**.
* Features:

  * Event presets for testing (`user.created`, `order.completed`, etc.)
  * JSON payload editor with timestamp auto-injection
  * Signature mode selector (`valid`, `invalid`, `none`)
  * Real-time queue & processed stats
  * Recent events history with color-coded success/failure
  * Dynamic cURL command generator with live JWT token
  * Copy-to-clipboard and token refresh support

---

## Security

* JWT signature validation protects endpoints from unauthorized requests.
* `/generate-test-token` is **for development only**; disable or secure in production.
* Secret key should be stored in environment variable (`process.env.JWT_SECRET`) for production.
* Client-side tokens are cached in memory for SPA cURL examples.
* Consider adding HMAC payload signing and replay protection for production-grade security.

---

## Queue & Processing Logic

* Incoming webhooks are added to an **in-memory queue**.
* Queue is processed immediately via `processQueue()`:

  * On success: added to `processedEvents` history, removed from queue.
  * On failure: retries incremented.
  * After `MAX_RETRIES` failures: webhook dropped and logged.
* History capped to 20 events to prevent memory bloat.
* In production, replace in-memory queue with **Redis, RabbitMQ, or AWS SQS** for durability and scaling.

---

## Usage Examples

### Sending a Webhook

```bash
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: <JWT_TOKEN>" \
  -d '{"event":"user.created","data":{"userId":12345,"email":"user@example.com"}}'
```

### Fetch Queue Status

```bash
curl http://localhost:8080/queue-status
```

### Health Check

```bash
curl http://localhost:8080/health
```

---

## Future Improvements

* [ ] Replace in-memory queue with persistent message queue (Redis/SQS/RabbitMQ)
* [ ] Implement async worker processing for heavy webhook payloads
* [ ] Secure `/generate-test-token` endpoint in production
* [ ] Add replay attack prevention and HMAC payload signing
* [ ] Store processed event history in database for audit trail
* [ ] Enhance SPA with charts & detailed analytics
* [ ] Add rate limiting and IP throttling

---

## Notes

* Designed as a **developer playground** for webhook testing and monitoring.
* Single-file frontend served by backend — zero build setup required.
* Dashboard is **mobile-friendly and responsive**.
* Ideal for **testing webhook integrations, debugging, and prototyping**.

---

## Deploy in 10 seconds

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
