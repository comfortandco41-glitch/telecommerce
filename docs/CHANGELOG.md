# CHANGELOG.md - Project Version History

All notable changes to the SuperBot SaaS project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-07-12

### Added
- **Project Foundation Documentation**:
  - `PROJECT.md` outlining tenant architecture and feature goals.
  - `PRD.md` mapping user journeys and core requirements.
  - `ARCHITECTURE.md` establishing Clean Service-Repository patterns.
  - `CODING_RULES.md` defining TypeScript, naming, and style constraints.
  - `AGENTS.md` outlining specific AI guidelines and constraints.
- **Backend & Database Specifications**:
  - `DATABASE.md` detailing the complete Prisma PostgreSQL Schema and indexing strategies.
  - `API.md` documenting REST endpoints and payload responses.
  - `AUTH.md` specifying JWT, bcrypt, and Telegram InitData validations.
  - `STORAGE.md` defining bucket configurations, file sizes, and presigned URLs.
  - `WEBHOOK.md` describing webhook register mechanisms and idempotency patterns.
- **Telegram Interaction & UX Specifications**:
  - `TELEGRAM.md` listing API payloads, commands, and callback constraints.
  - `BOT_FLOW.md` detailing customer state transitions and chat flows.
  - `NOTIFICATIONS.md` detailing status updates, admin alerts, and rate limits.
  - `INVOICE.md` mapping the HTML-to-PDF rendering and delivery pipeline.
- **Dashboard Frontend Specifications**:
  - `DASHBOARD.md` describing analytics views, sheets, and grid layouts.
  - `UI_UX.md` establishing color palettes, styling variables, and dark mode visuals.
  - `COMPONENTS.md` defining reusable component interfaces and properties.
- **Production & Security Protocols**:
  - `SECURITY.md` establishing IP rate limiters, SQL injection blocks, and CORS middleware.
  - `PERFORMANCE.md` setting target response times and LRU configurations.
  - `TESTING.md` outlining Jest mock patterns, Vitest UI setups, and Playwright workflows.
  - `DEPLOYMENT.md` defining Render build/start commands and GitHub action YAML triggers.
- **Release and Evolution Planning**:
  - `TASKS.md` separating implementation criteria across 7 phases.
  - `ROADMAP.md` mapping post-release milestones (localization, auto payments).
  - `CHANGELOG.md` this file tracking documentation initialization.
