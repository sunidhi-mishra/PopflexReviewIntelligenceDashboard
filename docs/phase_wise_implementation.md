# POPFLEX Review Intelligence Platform: Phase-Wise Implementation Plan

This document outlines the step-by-step implementation plan for building and deploying the **POPFLEX Review Intelligence Platform**. The platform is structured to ingest DTC Shopify reviews on a monthly cadence, process them using the Groq API, run lifecycle analysis, auto-export data to Google Docs, send monthly email overviews via a custom Vercel-hosted MCP server, and offer a conversational RAG chatbot for deeper analysis.

```
+-----------------------------------------------------------------------------------+
| Timeline Overview: 10-Week Implementation                                         |
+---------------------+---------------------+---------------------+-----------------+
| Phase 1: Ingestion  | Phase 2: Groq/NLP   | Phase 3: MCP Server | Phase 4: UI/RAG |
| (Monthly Sync)      | (AI Tagging Engine) | (Email & GDocs)     | (Chatbot Dev)   |
| Weeks 1-2           | Weeks 3-4           | Weeks 5-6           | Weeks 7-8       |
+---------------------+---------------------+---------------------+-----------------+
                                                                  | Phase 5: Rollout
                                                                  | Weeks 9-10
                                                                  +-----------------+
```

---

## Phase 1: Data Ingestion & Storage Pipeline (Weeks 1-2)
**Goal:** Establish a robust data pipeline to fetch, clean, and store direct-to-consumer (DTC) reviews from POPFLEX's e-commerce store (Shopify) on a monthly cadence.

### Key Activities
1. **Shopify API Integration:**
   * Develop a script to connect to POPFLEX’s Shopify reviews API.
   * Implement the automated **monthly cron/sync job** scheduler (using tools like Node-cron or AWS EventBridge) to trigger review collection on the 1st of every month.
2. **Review Database Schema Setup:**
   * Design a relational database schema (e.g., PostgreSQL or SQLite) to index reviews and monthly analytics metrics.
   * Schema attributes: `review_id`, `product_id`, `sku`, `rating`, `review_body`, `created_at`, `sync_cohort_month`, `sentiment_label`, `theme_tags`.
3. **Data Cleaning & Filtering:**
   * Clean formatting, filter out spam, duplicate submissions, and empty reviews.

### Key Deliverables
* Automated monthly ingestion script and cron scheduler.
* Database instance with schema tables configured.
* Historical review import capability for retroactively building baseline cohorts.

---

## Phase 2: Groq API Integration & NLP Categorization (Weeks 3-4)
**Goal:** Integrate the Groq API to run high-speed sentiment analysis and theme classification on ingested customer reviews.

### Key Activities
1. **Groq API Client Setup:**
   * Configure and integrate the **Groq Node.js/Python SDK** into the backend.
   * Establish secure API key rotation and request rate-limiting safeguards.
2. **Theme & Sentiment Prompt Engineering:**
   * Design optimized prompts for Groq’s Llama models to tag reviews with specific themes:
     * *Sizing & Fit*
     * *Fabric Quality*
     * *Durability*
     * *Comfort*
     * *Design & Utility*
     * *Shipping & Logistics*
   * Capture sentiment categories (`Positive`, `Neutral`, `Negative`) and polarity scores in the same analysis pass.
3. **Validation & Benchmarking:**
   * Create a manual validation dataset of 200 reviews to test Groq classification accuracy.
   * Fine-tune prompts until classification precision and recall achieve **>=90% accuracy**.

### Key Deliverables
* Integrated Groq API client module.
* NLP classification script that processes and tags ingested reviews.
* Validation report certifying classification accuracy targets.

---

## Phase 3: Vercel MCP Server Integration & Export Automation (Weeks 5-6)
**Goal:** Integrate the existing custom Model Context Protocol (MCP) server hosted on Vercel to automate Google Docs exports and monthly email reporting.

### Key Activities
1. **MCP Server Integration:**
   * Connect the application backend to the deployed **Vercel-hosted MCP Server**.
   * Configure authentication credentials (OAuth / API tokens) for Gmail and Google Docs inside the Vercel environment.
2. **Google Docs Auto-Export Module:**
   * Write helper functions to serialize monthly dashboard stats, catalog health indexes, and AI recommendations.
   * Program the backend to push these reports to a target Google Doc via the MCP server's Document API immediately after the monthly sync.
3. **Monthly Email Overview Dispatcher:**
   * Develop formatting templates for the monthly overview report.
   * Implement automation to fetch the recipient email configured on the dashboard, draft the monthly summary, and send it via the MCP Gmail connector.
4. **Integration Automation Orchestration:**
   * Connect the end of the Phase 1 & 2 sync pipeline to fire the MCP export and email scripts sequentially.

### Key Deliverables
* Operational connection between app backend and Vercel MCP server.
* Automate script triggers for Google Docs appending.
* Successful simulated email delivery of monthly summary reports.

---

## Phase 4: UI Dashboard & RAG Chatbot Development (Weeks 7-8)
**Goal:** Build the Next.js administration dashboard and construct the Retrieval-Augmented Generation (RAG) chatbot using the Groq API.

### Key Activities
1. **Web Dashboard Development:**
   * Build the UI displaying KPI cards, leaderboards, and category metrics.
   * Implement the **Target Email configuration field** and status lights for the monthly sync.
   * Create dashboard buttons for manually triggering the Google Docs export or the monthly email dispatch.
2. **RAG Vector Database Pipeline:**
   * Set up a vector index (e.g., pgvector, Milvus, or Pinecone) to hold embeddings of reviews and dashboard summaries.
   * Code the automated script to generate and store embeddings upon each monthly data sync.
3. **RAG Chatbot Backend (Groq API):**
   * Build the backend query route: receives user questions, performs semantic search over the vector database, formats the retrieved context, and prompts the Groq LLM to synthesize the final answer.
   * Ensure the chatbot cites the specific review sources and dates supporting its answer.
4. **Chatbot Frontend Integration:**
   * Add a floating chat drawer/window in the Next.js dashboard UI.

### Key Deliverables
* Complete frontend dashboard UI with interactive controls.
* Working vector storage and search database.
* Chatbot prototype answering queries based on imported reviews.

---

## Phase 5: Testing, Validation, & Rollout (Weeks 9-10)
**Goal:** Perform rigorous end-to-end integration testing, validate cron schedules, train users, and deploy the production system.

### Key Activities
1. **E2E Integration Auditing:**
   * Verify the **monthly automated cron/sync jobs** run reliably and successfully kick off the downstream NLP classification.
   * Validate the **RAG pipeline reliability**—checking query accuracy, response speeds under Groq API limits, and citation truthfulness.
   * Test **MCP integrations** by verifying Google Docs are appended cleanly and emails are delivered without format issues.
2. **Beta Testing & Refinements:**
   * Roll out the dashboard to a small group of internal PM and CX users.
   * Fix bugs, optimize UI loading times, and adjust RAG prompt parameters.
3. **Production Launch:**
   * Deploy the production builds of the frontend (e.g., Vercel) and backend (e.g., Render, Railway, or AWS).
   * Hand over documentation and target endpoints to administrators.

### Key Deliverables
* Signed-off QA test matrix covering cron, RAG, and MCP functionalities.
* Training guide for configuring dashboard targets and using the chatbot.
* Active production deployment url.

---

## Technical Architecture Overview
```
+-------------------+       +-------------------+       +--------------------+
|   Shopify API     | ----> |  Ingestion Cron   | ----> |   PostgreSQL /     |
|  (Monthly Sync)   |       |   (Node/Python)   |       |    Vector DB       |
+-------------------+       +-------------------+       +--------------------+
                                  |                                |
                                  v                                v
+-------------------+       +-------------------+       +--------------------+
|  Vercel MCP       | <==== |   App Backend     | <---> |   Groq API         |
|  (Gmail & GDocs)  |       |  (Express/Python) |       |  (NLP & RAG Chat)  |
+-------------------+       +-------------------+       +--------------------+
                                  |
                                  v
                        +-------------------+
                        |   Next.js UI      |
                        |   Dashboard       |
                        +-------------------+
```

---

## Phase-Wise Milestones & Gateways

| Phase | Milestone | Success Criteria / Gateway |
| :--- | :--- | :--- |
| **Phase 1** | Ingestion & Cron Live | Successful manual run of monthly sync importing historical review batches. |
| **Phase 2** | Groq NLP Pipeline | Classification pipeline completes in <2 minutes; accuracy hits >=90% target. |
| **Phase 3** | MCP Automation Live | Verified document updates in Google Docs and automated Gmail receipt via Vercel MCP. |
| **Phase 4** | Dashboard & Chat Ready | Chatbot responds correctly in <3s with accurate source review citations. |
| **Phase 5** | Production Rollout | End-to-end cron -> Groq -> MCP pipeline passes 100% of integration test cases. |
