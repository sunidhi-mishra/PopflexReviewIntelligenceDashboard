# ReviewIQ — AI Product Health Monitor ✨

> A full-stack AI platform that ingests live POPFLEX reviews, classifies them across 6 quality dimensions, and surfaces a Product Health Index leaderboard with a RAG-powered chatbot 🤖

---

## Overview 🌈

ReviewIQ is a Voice-of-Customer intelligence tool built as a product management portfolio project. It was designed to answer one question: **can a small team detect product quality decline from public review signals before it compounds into brand damage?**

The project is grounded in real customer research across Trustpilot, Reddit (r/Blogilates), and POPFLEX's own product review feed — which revealed a two-wave complaint cluster in Jan–May 2026 converging on fabric quality decline and sizing inconsistency as the dominant pain points.

---

## Features 🚀

- **Live Review Sync** — Pulls product reviews from the Judge.me public CDN, ingesting real data across 6 seeded POPFLEX SKUs 📥
- **LLM-Powered Classification** — Automatically tags each review across 6 quality dimensions using Groq's `llama-3.1-8b-instant` 🧠
- **Product Health Index Leaderboard** — Ranks SKUs by weighted review score with OPTIMAL / NEEDS MONITORING / CRITICAL status signals and per-product primary issue detection 📊
- **RAG Chatbot** — Conversational AI assistant that retrieves the most relevant reviews via cosine similarity and synthesizes answers with traceable source citations (`[Source 1]`, `[Source 2]`) 💬
- **Theme Breakdown Heatmap** — Visual summary of classified complaint volume and average rating per quality category 🗺️
- **Manual Sync & Export Pipeline** — Trigger ingestion, classification, and report dispatch from the dashboard UI ⚙️
- **Settings Persistence** — Target report recipient email stored and fetched dynamically via SQLite 💾

---

## Tech Stack 🧱

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), CSS with glassmorphic dark theme |
| Backend | Next.js API Route Handlers |
| Database | SQLite (reviews, embeddings, settings) |
| LLM | Groq — `llama-3.1-8b-instant` |
| Embeddings | Deterministic 768-dim local vectors (embeddingService.js) |
| RAG Retrieval | Application-layer cosine similarity search over SQLite-stored embeddings |
| Data Source | Judge.me public CDN (Shopify review feed) |

---

## Quality Dimensions Tracked 🎯

1. Fabric Quality
2. Sizing & Fit
3. Comfort
4. Durability
5. Design & Utility
6. Shipping & Logistics

---

## Getting Started 🛠️

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/your-username/reviewiq-popflex
cd reviewiq-popflex
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Build

```bash
npm run build
```

---

## Project Structure 🧩

```
/src
  /app
    /api
      /chat          → RAG chatbot endpoint
      /analytics     → Dashboard KPIs and leaderboard data
      /settings      → Email recipient persistence
      /sync          → Manual ingestion and export pipeline
  /db
    db.js            → SQLite connection and schema setup
  /services
    embeddingService.js   → 768-dim deterministic vector generation
    ragService.js         → Retrieval, prompt construction, citation formatting
```

---

## Health Index Formula 📈

Each SKU's Health Index is calculated as the score used in the current codebase:

```
Health Index = (0.6 × avg_stars) + (0.4 × normalized_sentiment) - penalty
```

Where `normalized_sentiment` maps the average sentiment score from `-1..1` to `0..5`, and `penalty` deducts up to `1.0` based on negative reviews tagged with `Sizing & Fit`, `Fabric Quality`, or `Durability`.

**Status thresholds:**
- OPTIMAL: Health Index ≥ 4.0
- NEEDS MONITORING: Health Index 3.0–4.49
- CRITICAL: Health Index < 3.0

Primary Issue is derived from the most common negative theme for the selected month. If no negative themed review is present, the field shows `None`.

---

## Known Limitations ⚠️

- **Sample size:** The built demo uses a limited seeded POPFLEX review corpus, so it is sufficient to demonstrate the system architecture but not statistically representative of POPFLEX's full review volume. Confidence indicators should be interpreted accordingly.
- **Selection bias:** Public reviews on Trustpilot and Reddit skew toward dissatisfied customers. Satisfied customers are systematically underrepresented, meaning sentiment scores will read lower than internal data would show.
- **Deterministic embeddings:** `embeddingService.js` uses a hash-based local vector scheme rather than a trained semantic embedding model. This captures lexical similarity but not deep semantic relationships. At n=52, passing the full corpus as LLM context would produce equivalent retrieval quality — RAG architecture is included here to demonstrate the pattern at scale, not because it is strictly necessary at this volume.
- **Email dispatch:** The Integration Center currently persists the target recipient email to SQLite. Outbound email delivery via a mail provider is scoped as a next step.

---

## What This Demonstrates 🌟

This project was built as a product management portfolio artifact to show:

- **AI PM thinking** — Knowing when RAG is the right architecture vs. when full-context retrieval is sufficient
- **End-to-end execution** — From customer research and pain point prioritization to a shipped, working tool
- **Analytical honesty** — Explicit confidence bounds, stated assumptions, and documented limitations throughout
- **Product instrumentation** — Designing a monitoring system that surfaces actionable signals, not just raw data

---

## Research Foundation 🔎

| Source | Reviews Collected | Primary Signal |
|---|---|---|
| Trustpilot | 5 | Shipping failures, customer service breakdown |
| r/Blogilates | 5 | Fabric quality decline, sizing inconsistency across colors |
| POPFLEX website | 14 | Per-product fit issues, stitching defects, sizing complaints |
| Judge.me CDN (live) | Limited demo corpus | Cross-SKU health distribution |

---

## Author 👩‍💻

**Sunidhi Mishra**
Product Management Portfolio — 2026
[LinkedIn](https://linkedin.com/in/your-profile) · [Notion Portfolio](https://your-notion-link)