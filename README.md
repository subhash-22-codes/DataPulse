<div align="center">

<img src="https://img.shields.io/badge/DataPulse-Live-22c55e?style=for-the-badge&logoColor=white" />
<img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
<img src="https://img.shields.io/badge/React-TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/Redis-Celery-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
<img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" />

<br /><br />

# DataPulse

### Real-Time Data & Schema Monitoring Platform

**DataPulse watches your data sources so you don't have to.**  
Connect an API, a database, or upload a CSV — and get notified the moment something changes, breaks, or drifts.

<br />

[**Live Platform →**](https://data-pulse-eight.vercel.app) &nbsp;&nbsp;·&nbsp;&nbsp; [**Report a Bug**](https://github.com/subhash-22-codes/datapulse/issues) &nbsp;&nbsp;·&nbsp;&nbsp; [**Request a Feature**](https://github.com/subhash-22-codes/datapulse/issues)

</div>

---

## The Problem

Data breaks silently. All the time.

A column gets renamed upstream and your pipeline starts failing with no error message.  
An API starts returning empty arrays and nobody notices for three days.  
A nightly job drops 40% of records and your dashboard shows nonsense on Monday morning.

Most teams find out when a user complains — not when it happens.

**DataPulse catches it the moment it happens.**

---

## What DataPulse Does

Connect DataPulse to any REST API or PostgreSQL database. Set a polling schedule. Walk away.

Every time new data arrives, DataPulse automatically:

- ✅ Detects **schema drift** — columns added, removed, or renamed
- ✅ Tracks **row count changes** — drops, spikes, and trends over time  
- ✅ Runs **statistical analysis** — mean, median, distribution per column
- ✅ Measures **data quality** — missing values, duplicates, outliers, constant columns
- ✅ Fires **threshold alerts** — notify your team the moment a metric crosses a limit you set
- ✅ Raises **incidents** — automatic severity classification for row drops, schema breaks, and quality failures
- ✅ Broadcasts **real-time notifications** — in-app via WebSocket and email to every workspace member

No manual checks. No scheduled reports. No Monday morning surprises.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                          │
│              React + TypeScript + Recharts               │
│         Auth-aware routing · Real-time WebSocket UI      │
└───────────────────────────┬─────────────────────────────┘
                            │  HTTPS + WebSocket
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      FastAPI Layer                       │
│   Auth · Workspaces · Uploads · Alerts · Notifications  │
│        CSRF Middleware · Rate Limiting · CORS            │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           │ Background Jobs          │ WebSocket Broadcast
           ▼                          ▼
┌─────────────────────┐   ┌──────────────────────────────┐
│  Background Engine  │   │      Connection Manager       │
│                     │   │  Workspace-scoped channels    │
│  Production:        │   │  User-scoped channels         │
│  APScheduler +      │   │  Real-time job status push    │
│  ThreadPool         │   └──────────────────────────────┘
│                     │
│  Development:       │
│  Celery + Redis     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Processing Layer                  │
│                                                          │
│  CSV Ingestion (chunked · OOM-safe · 500k row cap)       │
│  Statistical Analysis (describe · per-column stats)      │
│  Quality Engine (missing · duplicates · outliers · IQR)  │
│  Schema Diff (added · removed · type changes)            │
│  Incident Engine (row drop · schema break · quality)     │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL (Supabase)                  │
│   Users · Workspaces · Uploads · Alerts · Incidents      │
│   Notifications · Metrics · Login History · Tokens       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Storage                        │
│         Private object storage for CSV uploads           │
│              Signed URL access · Per-workspace           │
└─────────────────────────────────────────────────────────┘
```

---

## Core Features

### Data Ingestion

| Source | How It Works |
|---|---|
| **CSV Upload** | Each upload is a versioned snapshot — compared against the previous version automatically |
| **REST API** | Polls any HTTP/HTTPS endpoint on a schedule — open or secured with auth headers |
| **PostgreSQL** | Connects read-only to your database, runs your SELECT query, ingests the result as a snapshot |

### Monitoring & Detection

| What | How |
|---|---|
| Schema drift | Column additions and removals detected on every ingestion cycle |
| Row count change | Absolute and percentage delta tracked across versions |
| Statistical shift | Mean, median, std, min, max computed per column per upload |
| Data quality | Missing %, duplicate rows, IQR outliers, constant columns, column health score |
| Incidents | Automatic severity classification — low / medium / high — with open/resolve lifecycle |

### Alerting

- Define rules per workspace: column + metric + condition + threshold
- Conditions: greater than, less than, equals, not equals
- Alerts fire only when conditions are genuinely breached — not on every poll
- Idempotency-safe: no duplicate alerts on worker retry
- Batch email delivery: one email per event, not one per rule

### Authentication & Security

- Email + OTP registration with bcrypt-hashed OTP storage
- JWT access tokens (15-minute expiry) + rotating refresh tokens
- Session binding via device fingerprinting (user-agent hash)
- Token version invalidation for global logout across all devices
- Google and GitHub OAuth 2.0 via Authlib
- HttpOnly cookies with SameSite=None for cross-origin Vercel-Render deployment
- Login history tracking per user
- CSRF protection: Origin validation + X-CSRF-Token double submit
- Rate limiting on all auth endpoints via SlowAPI
- Field-level Fernet encryption for database passwords and API secrets

### Workspace Management

- Up to 3 active workspaces per user
- Soft delete with trash and restore (30-day recovery window)
- OTP-confirmed deletion to prevent accidental data loss
- Team collaboration — add members, per-user notification preferences
- Workspace-scoped incident tracking and alert rules

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| API Framework | FastAPI |
| ORM | SQLAlchemy |
| Auth | PyJWT · Passlib (bcrypt) · Authlib |
| Background Jobs | Celery + Redis (dev) · APScheduler + ThreadPool (prod) |
| Data Processing | Pandas · NumPy |
| Email | Brevo (transactional) |
| Security | SlowAPI · Fernet · CSRF Middleware |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Real-time | Native WebSocket |

### Infrastructure
| Layer | Technology |
|---|---|
| Database | PostgreSQL via Supabase |
| File Storage | Supabase Storage (private bucket) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Local Orchestration | Docker + Docker Compose |
| Scheduling | APScheduler (prod) · Celery Beat (dev) |

---

## Security Design

DataPulse treats security as a core system — not an afterthought.

**SQL Injection Prevention (5 independent layers)**
```
1. SELECT-only enforcement       — query must start with SELECT after comment stripping
2. Multi-statement blocking      — semicolons inside the query are rejected
3. Keyword blacklisting          — DROP, DELETE, INSERT, ALTER, VACUUM, and others blocked
4. Comment stripping             — inline and block comments removed before validation
5. Postgres-level sandboxing     — statement_timeout=30s · work_mem=4MB enforced at connection level
```

**Why 5 layers?**  
Bypassing one control must not compromise the rest. Each layer catches a different attack vector independently.

**Timing Attack Mitigation**
```python
# Login always runs bcrypt.verify — even when the user does not exist
# Response time cannot leak whether an email is registered
DUMMY_HASH = bcrypt.hash("dummy-password-for-timing-attack")
```

**Refresh Token Rotation**
- Every token use issues a new token and revokes the old one
- Reuse of a revoked token triggers global session invalidation
- Tokens are bound to session ID and device fingerprint

---

## Data Processing Pipeline

```
CSV / API Response / DB Query Result
           │
           ▼
   Chunked ingestion (50,000 rows/chunk)
   OOM protection (500k row cap · truncation with UI signal)
   Type inference per column
           │
           ▼
   Statistical analysis (describe · per-column)
   Sampled for performance (10k rows for stats · 50k for quality)
           │
           ▼
   Quality analysis
   ├── Missing value % per column
   ├── Duplicate row detection
   ├── IQR outlier detection per numeric column
   ├── Constant column detection
   └── Column health score (0–100)
           │
           ▼
   Schema comparison against previous upload
   ├── Added columns
   ├── Removed columns
   └── Type changes
           │
           ▼
   Incident engine
   ├── Row drop ≥ 20% → severity by drop %
   ├── Schema change > 3 columns → medium
   ├── Missing % ≥ 50 on any column → medium
   └── All-zero numeric column → low
           │
           ▼
   Alert rule evaluation
   Notifications → WebSocket + Email
```

---

## Project Status

| Area | Status |
|---|---|
| Core data pipeline | ✅ Live |
| Authentication system | ✅ Live |
| Real-time WebSocket notifications | ✅ Live |
| Alert engine | ✅ Live |
| Incident tracking | ✅ Live |
| Data quality engine | ✅ Live |
| Workspace management | ✅ Live |
| AI-powered chat assistant | 🔄 In Progress |
| Automated test suite | 🔄 Planned |
| Database migrations (Alembic) | 🔄 Planned |
| Custom domain | 🔄 Planned |
| Expanded data source support | 🔄 Planned |

---

## Team

DataPulse was designed and built collaboratively.

**Subhash Yaganti** — Project Creator & System Architect  
Backend systems · Authentication & security · Data pipeline · Background processing · Deployment  
[GitHub](https://github.com/subhash-22-codes) · [LinkedIn](https://linkedin.com/in/subhash-yaganti-a8b3b626a)

**Siri Mahalaxmi Vemula** — Backend Engineer  
API development · Database design · Auth integration · AI chat assistant (Gemini)  
[GitHub](https://github.com/armycodes) · [LinkedIn](https://linkedin.com/in/vemula-siri-mahalaxmi-b4b624319)

*Additional contributors across frontend, UI/UX, data processing, and infrastructure.*  
*Full contribution history available in the repository commit log.*

---

## Repository Notice

This repository was initially created under Subhash Yaganti's GitHub account.  
The project was designed, built, and documented collaboratively by the core team.  
Commit history reflects individual contribution areas across both authors and additional contributors.

---

## Development Notes

AI tools were used selectively as productivity aids — for brainstorming, validation, and documentation review.  
All system architecture, security design, core logic, and implementation decisions were independently  
designed, implemented, and reviewed by the project contributors.

---

## License

**Source Available — Restricted Use**

© 2025–2026 Subhash Yaganti, Siri Mahalaxmi Vemula. All rights reserved.

This repository is made publicly visible for **learning, evaluation, and portfolio review only.**

You may:
- View and read the source code
- Reference the architecture and design for educational purposes
- Fork the repository for private evaluation

You may **not**:
- Redistribute, sublicense, or publish this code or substantial portions of it
- Use this code or system design in your own projects, products, or portfolios without explicit written permission
- Present any part of this work as your own original work in academic or professional contexts

For permission requests or collaboration enquiries, contact **Subhash Yaganti** — subashyagantisubbu@gmail.com

---

<div align="center">

Built with intention. Designed for real systems.

**[Live Platform](https://data-pulse-eight.vercel.app)**

</div>

