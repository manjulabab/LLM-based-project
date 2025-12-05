# RFP-AI — End-to-End AI-powered RFP Management (MySQL)

This repository is an MVP for an AI-powered RFP workflow:
- Create RFPs using natural language (LLM -> structured JSON)
- Manage vendors
- Send RFPs to selected vendors (SMTP)
- Ingest vendor responses (webhook/IMAP or manual POST)
- Parse proposals with LLM and compute deterministic scores
- Show comparison and recommend vendor with explanation

## Repo layout
- /backend — Node.js + Express + Sequelize + MySQL
- /frontend — React + Vite (simple UI)
- /backend/seed — SQL seed + sample vendor response

## Prerequisites
- Node.js 18+
- MySQL (or compatible)
- OpenAI API key (or any LLM)
- SMTP credentials for sending emails (e.g., SendGrid)

## Setup (Backend)
1. Create MySQL DB:
   - `CREATE DATABASE rfpdb;`
2. Copy `.env.example` -> `.env` and set values.
3. Install & run:
   ```bash
   cd backend
   npm install
   npm run dev
4. Install & run:
   ```bash
   cd frontend
   npm install
   npm run dev
5.For Gemini Key 
   1.Navigate to gemini and find API Key and create and Use it
6.For SMTP Key 
   1.Visit Twilio and create an API Key and authenticate the email ID that you want to use

7.Install MYSQL Installer and add the database that you want to use
