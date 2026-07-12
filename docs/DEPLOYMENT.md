# DEPLOYMENT.md - Production Deployment Manual

This document details the production deployment flow on Render, Supabase integration, and CI/CD parameters.

---

## 1. Production Architecture Overview

The production system splits deployment into separate frontend and backend instances:

```
[GitHub Repo] --(Push main)--> [Render CI/CD Pipeline]
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
  [Render Web Service]                        [Render Static Site]
     (Backend API)                               (Frontend SPA)
            |                                           |
    +-------+-------+                                   |
    |               |                                   | (HTTPS Client Call)
    v               v                                   v
[Supabase DB]   [Supabase Storage] <--------------------+
```

---

## 2. Backend Deployment (Render Web Service)

The Express API server is deployed as a Render Web Service.

- **Environment**: Node
- **Region**: Same region as the Supabase database (e.g. `us-east-1` or `ap-southeast-1`) to minimize latency.
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npx prisma migrate deploy && node dist/src/index.js`
- **Port**: `10000` (Render default port)

### Health Check Path
Configured to `GET /health` responding with `200 OK` once connection to the PostgreSQL database is verified.

---

## 3. Frontend Deployment (Render Static Site)

The React/Vite dashboard is compiled and deployed as a Render Static Site.

- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist` (Vite build folder)
- **Rewrite Routing Rules (Crucial)**:
  Since the dashboard uses React Router client-side routing, any page refresh on a route like `/shops/:id/orders` will return a 404 error from Render unless redirects are configured.
  - **Source**: `/*`
  - **Destination**: `/index.html`
  - **Action**: Rewrite (HTTP 200)

---

## 4. Supabase Configurations

### Database Migration
The start command executes `npx prisma migrate deploy` which applies all migrations to Supabase PostgreSQL before spawning the node process. This ensures zero-downtime updates if database columns are non-breaking.

### Storage Bucket Policies
Ensure you run SQL queries or use the Supabase dashboard to create the three buckets (`products`, `receipts`, `invoices`) and configure Row Level Security (RLS) policies matching the security definitions in `docs/STORAGE.md`.

---

## 5. GitHub CI/CD Action Pipeline

We use GitHub Actions to validate quality before Render pulls the code.

Create `.github/workflows/deploy.yml`:
```yaml
name: CI Quality Gate

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run Linter
        run: npm run lint
      - name: Run Compile Checks
        run: npm run build
      - name: Run Tests
        run: npm run test
```
Render is set to listen for successful commit hooks on the `main` branch.
