# DataPulse

**Real-Time Data & Schema Change Monitoring System**

DataPulse is a backend-heavy data monitoring platform designed to track **schema evolution, structural changes, and metric shifts** between dataset versions and live data sources.

Unlike static dashboards, DataPulse treats **data change as a first-class problem** and focuses on detecting *what changed, when it changed, and why it matters*.

---

## Why DataPulse Exists

Most academic and hobby data projects assume:

* schemas are stable
* datasets are static
* uploads are one-time events

In real systems, none of that is true.

DataPulse is built around the assumption that:

* schemas evolve
* metrics drift
* data sources change silently
* teams need early visibility into those changes

This project was built to explore **how real data systems behave as data changes across versions**, not just how to visualize a dataset once.

---

## Core Capabilities

* Monitor recurring datasets via manual CSV uploads (daily / monthly) with version-to-version comparison
* Securely connect to **external PostgreSQL and MySQL databases** (read-only)
* Detect:

  * schema drift
  * structural changes
  * metric shifts
* Ingest data from:

  * file uploads
  * open APIs
  * secured APIs with authorization headers
* Asynchronous processing so UI never blocks
* Configurable alerts with email notifications
* Strong authentication and account security model

---

## High-Level Architecture

```
┌──────────────┐
│   Frontend   │  React + TypeScript
└──────┬───────┘
       │
       │ Authenticated API calls
       ▼
┌──────────────┐
│  FastAPI API │
│ (Auth + Core)│
└──────┬───────┘
       │
       │ Background execution
       ▼
┌──────────────┐
│  Background  │
│  Execution   │
│ (Env-Aware)  │
└──────┬───────┘
       │
       │ Schema / data comparison
       ▼
┌──────────────┐
│ PostgreSQL   │
│ (Supabase)   │
└──────────────┘
```

The API layer is kept **thin and responsive**.
All heavy work is pushed into **background execution**.

---

## Data Sources Supported

### 1. CSV Uploads

* Designed for recurring datasets (daily / monthly)
* Each upload is treated as a new version
* Compared against the immediately previous version

### 2. External Database Connections

* PostgreSQL
* MySQL

Connections are:

* read-only
* isolated
* credential-safe

### 3. API-Based Sources

* Open APIs
* Secured APIs using headers (e.g., Authorization, API keys)
* Secrets are encrypted at rest

---

## External Database Connectivity (Deep Dive)

This is a **core feature** of DataPulse.

### Design Goals

* Never mutate external data
* Avoid exposing credentials in plaintext
* Fail safely by surfacing errors and preserving system usability
* Reduce SQL injection risk through strict query validation
* Keep schema inspection isolated from source systems

### How It Works (Conceptual)

* Users provide DB connection details
* Credentials are **encrypted at rest** using Fernet (AES-based)
* Encryption keys are loaded from environment variables
* Connections are established using **read-only access**
* Schema metadata is extracted using:

  * SQLAlchemy inspection
  * database system catalogs
* Only metadata is stored — never actual table data

Tracked changes include:

* table creation / deletion
* column additions / removals
* column type changes

This allows DataPulse to monitor **schema evolution over time** without compromising source databases.

---

## Authentication & Security Model

Authentication is treated as a **core system**, not a bolt-on.

### Supported Methods

* Email/password login
* OAuth (Google, GitHub)

### Key Security Features

* JWT-based authentication (Access + Refresh tokens)
* HTTP-only cookies for sensitive tokens
* Secure account linking across auth methods
* Token versioning for **global logout across devices**
* MFA for sensitive operations (e.g., account deletion)
* GDPR-style account deletion:
  * data export
  * full account scrubbing
* Additional platform safeguards include request rate limiting and strict CORS controls
  to protect public APIs and prevent unauthorized cross-origin access.

---

## Background Processing & Async Execution

DataPulse avoids blocking user requests by offloading all heavy work
to background execution outside the request lifecycle.

### Local / Controlled Environments

* Celery + Redis
* Worker-based execution with isolated jobs
* Failure in one job does not affect others

### Cloud-Constrained Environments

* Execution adapts using:
  * a process-level scheduler (APScheduler) backed by database state
  * bounded in-process execution (ThreadPool)
* Job execution is state-gated and failure-aware
* Same functional guarantees, different runtime model

This dual approach allows the system to remain usable
even on limited free-tier infrastructure.

### Performance & Safety Considerations

To avoid resource exhaustion and runaway jobs, DataPulse enforces
explicit limits on dataset size and processing scope.
Large inputs are truncated safely with clear UI feedback,
and polling is automatically disabled on repeated failures.

---

## Change Detection Logic

DataPulse compares incoming data against historical versions to detect:

### Schema-Level Changes

* New / removed tables
* New / removed columns
* Column type changes

### Structural Changes

* Row count deltas
* Null density shifts
* Presence / absence of key fields

### Metric Shifts

* Percentage-based changes
* Threshold-based alerts
* Trend comparison across versions

The goal is **signal**, not noise.

---

## AI-Assisted Change Explanation

DataPulse uses AI in a **supporting, non-decision-making role** to help explain detected changes.

When a schema or structural change is identified by deterministic logic,
AI is used to generate a human-readable explanation describing
*possible reasons* and *potential impact* of the change.

AI-assisted explanations are generated using a large language model (Gemini),
used strictly for interpretive summaries and contextual insights.

Examples include:
- explaining newly added columns
- describing how additional fields may affect downstream analysis

All change detection, alerting, and enforcement logic remains
system-driven and deterministic.

---

## Alerts & Notifications

* Users define alert rules per dataset
* Alerts trigger when defined conditions are met
* Notifications are delivered via email (Brevo)
* Alerting logic is designed to minimize false positives

---

## Frontend & UX

* Built with **React + TypeScript**
* Auth-aware routing and protected views
* Processing states are clearly communicated
* Data visualizations built using **Recharts**
* Focus is on **understanding change**, not decorative charts
* Fully responsive UI

---

## Technology Stack

### Backend

* Python – core language for data processing and job orchestration
* FastAPI – thin API layer with strict request validation and auth
* SQLAlchemy – ORM and schema inspection for versioned comparisons
* Celery – worker-based execution for local / controlled environments
* Redis – broker and transient state store for Celery jobs

### Frontend

* React – authenticated UI and async job state handling
* TypeScript – strict API contracts and state safety
* Recharts – focused visualizations for change deltas and trends

### Database & Storage

* PostgreSQL (Supabase) – source of truth for users, datasets, and job state
* Encrypted fields – credential and secret storage at rest

### Infrastructure

* Docker – local orchestration of API, workers, and Redis
* APScheduler – process-level scheduling in cloud environments
* Vercel – frontend hosting
* Environment-based configuration

---

## Current Status

DataPulse is **live, functional, and under active development**.

Planned improvements:

* Multi-tenant workspaces
* Expanded role-based access control (beyond read-only team members)
* More granular alert rules
* Additional data sources
* Performance optimizations for large datasets


## What This Project Demonstrates

* Secure authentication design
* Background job orchestration
* Schema-aware data comparison
* Real-world tradeoffs under infra limits
* End-to-end system thinking
* Clean separation of concerns

---

## Live Demo

- **Application:** https://data-pulse-eight.vercel.app  
  (Frontend served via Vercel, backed by deployed APIs)

---

## Authors

**Subhash Yaganti**  
Full-stack development, backend systems, and security  
Contributed across backend architecture, API design, frontend integration, and UI/UX.  
GitHub: https://github.com/subhash-22-codes

**Siri Mahalaxmi Vemula**  
Backend engineering and database design  
Contributed to backend logic, data modeling, and UI/UX.  
GitHub: https://github.com/armycodes

---

## Repository Notice

This repository was initially created under Subhash Yaganti’s GitHub account and later forked for collaboration purposes.

Forking does not indicate sole ownership.  
The project was designed, developed, and documented collaboratively by both authors.

---

## Final Note

DataPulse is intentionally built as a **system**, not a showcase app.

It assumes data will change, failures will happen, and infrastructure will be imperfect — and it is designed accordingly.

---

## Development Notes

Modern AI tools were used selectively as productivity aids
(for brainstorming, validation, and documentation).

All system architecture, core logic, security design,
and implementation decisions were independently designed, 
implemented, and reviewed by the project contributors.

---

## License & Usage

© 2026 Subhash Yaganti, Siri Mahalaxmi Vemula. All rights reserved.

This repository is shared publicly for **learning, evaluation, and portfolio review**.

The code and system design may not be reused, redistributed, or presented
as original work for academic submissions, personal portfolios, or
commercial purposes without explicit permission from the authors.

For permission requests or collaboration inquiries, please contact
**Subhash Yaganti** or **Siri Mahalaxmi Vemula**.

---


