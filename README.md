# 🔍 CiteLens

**Find the follow-up papers that matter most.**

CiteLens helps researchers, students, and engineers quickly discover the most influential papers that cite a given research paper.

Paste a paper link → get a ranked list of the most important citing papers → understand *why* they matter.

---

## ✨ What is CiteLens?

CiteLens is a research discovery tool that answers:

> **"Which papers citing this work should I read next?"**

Instead of just showing all citations, CiteLens:

- ranks citing papers by **impact, relevance, and influence**
- explains **why each paper is important**
- helps you **prioritize reading**, not just explore

---

## 🚀 Features

- 🔗 Paste any paper link (arXiv, DOI, Semantic Scholar, or plain title)
- 🧠 Smart ranking using multiple signals:
  - field-normalized citation impact (FWCI, citation percentile)
  - citation network influence (local PageRank)
  - semantic relevance to the seed paper
  - citation intent (highly influential flag)
- 📊 Explainable scores — per-paper "Why ranked here" breakdown
- 🖼️ Three layout modes — Focus (hero cards), Split (list + detail), Stream (dense table)
- 🔀 Four sort modes — Most Influential, Most Relevant, Recent, Reviews
- 🔎 Filters — year range, relevance threshold, influential-only, reviews-only
- 📅 Timeline view — citation arc over time
- 📚 My Library — save and revisit papers with localStorage persistence
- 🌙 Dark mode — full token-driven palette
- 📱 Mobile-responsive — works on all screen sizes
- 🎨 Five accent color themes
- 🧪 Mock mode — full UI without any API keys

---

## 🧠 How it works

CiteLens uses a multi-signal ranking system:

### Ranking Signals

| Signal | Weight | Source |
|---|---|---|
| **Impact Score** | 45% | OpenAlex citation percentile + FWCI |
| **Network Score** | 25% | Local PageRank across candidate set |
| **Relevance Score** | 20% | Token-overlap with seed title/abstract |
| **Citation Intent Score** | 10% | Semantic Scholar "highly influential" flag |

### Final Score

```
FinalScore =
  0.45 × ImpactScore +
  0.25 × NetworkScore +
  0.20 × RelevanceScore +
  0.10 × CitationIntentScore
```

Weights are renormalized when a signal is unavailable for a given paper.
Each result includes a full breakdown and plain-language explanation.

---

## 🖥️ Live Demo

👉 **[kishormorol.github.io/CiteLens](https://kishormorol.github.io/CiteLens/)**

---

## 🏗️ Architecture

```
Frontend (React 18 + TypeScript + Vite + Tailwind CSS)
        ↓  POST /api/analyze-paper
Backend (FastAPI + Python 3.11)
        ↓
Data Sources
  ├── Semantic Scholar  (primary: paper lookup + citation fetch)
  ├── OpenAlex          (enrichment: FWCI, citation percentile)
  └── arXiv             (fallback: metadata)
```

---

## 📦 Project Structure

```
CiteLens/
  src/              → React + TypeScript frontend (Vite)
  backend/          → FastAPI service
    app/
      routes/       → HTTP endpoints
      services/     → input parsing, ranking, enrichment, mock data
      models/       → Pydantic request/response + internal models
      utils/        → normalization, graph, exceptions
    tests/          → pytest integration + unit tests
  public/           → static assets
  .github/workflows → CI + GitHub Pages deployment
```

---

## ⚙️ Local Development

### 1. Clone

```bash
git clone https://github.com/inexplainableai/CiteLens.git
cd CiteLens
```

### 2. Frontend

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173/CiteLens/`

### 3. Backend

```bash
cd backend
pip install -r requirements-dev.txt
cp .env.example .env   # set OPENALEX_EMAIL and optionally SEMANTIC_SCHOLAR_API_KEY
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`

---

## 🧪 Mock Mode

Run the full UI without any API keys:

```env
# backend/.env
USE_MOCK_DATA=true
```

Returns a sample seed paper (Attention Is All You Need) with 10 pre-scored citing papers.
The test suite uses mock mode automatically — no `.env` setup needed.

```bash
cd backend
pytest tests/ -v   # 42 tests, all pass without API keys
```

---

## 🔌 Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | `development` or `production` |
| `USE_MOCK_DATA` | `false` | Return mock data without any API calls |
| `FALLBACK_TO_MOCK_ON_ERROR` | `true` | Fall back to mock when upstream APIs fail |
| `SEMANTIC_SCHOLAR_API_KEY` | — | Optional — raises rate limit from 1 to 10 req/s |
| `OPENALEX_EMAIL` | — | Recommended — enables polite pool (faster responses) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | Comma-separated CORS origins |

### Frontend (`.env`)

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🌐 Deployment

### Deploy order

Deploy the **backend first**, then the **frontend**. The frontend build bakes
in the backend URL at compile time, so the URL must exist before running CI.

---

### Backend → Render (recommended)

**Option A — Render Blueprint (one-click)**

1. Fork or push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Blueprint**
3. Connect your GitHub repo — Render finds `render.yaml` automatically
4. Click **Apply** — the service `citelens-api` is created
5. Open the service → **Environment** tab → fill in:
   - `OPENALEX_EMAIL` — your email for the OA polite pool
   - `SEMANTIC_SCHOLAR_API_KEY` — optional, raises SS rate limit to 10 req/s
6. Trigger a manual deploy (or push to `main`)
7. Copy the service URL: `https://citelens-api.onrender.com` (example)

**Option B — Manual**

1. **New Web Service** → connect repo → **Root Directory**: `backend`
2. **Runtime**: Python 3
3. **Build command**: `pip install -r requirements.txt`
4. **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment variables**:

   | Key | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `ALLOWED_ORIGINS` | `https://kishormorol.github.io` |
   | `FALLBACK_TO_MOCK_ON_ERROR` | `true` |
   | `OPENALEX_EMAIL` | your@email.com |
   | `SEMANTIC_SCHOLAR_API_KEY` | *(optional)* |

6. Health check path: `/health`

---

### Backend → Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select this repo
3. Click **Settings** → set **Root Directory** to `backend`
4. Railway detects the `Procfile` automatically; `railway.toml` provides health check config
5. **Variables** tab → add:

   | Key | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `ALLOWED_ORIGINS` | `https://kishormorol.github.io` |
   | `FALLBACK_TO_MOCK_ON_ERROR` | `true` |
   | `OPENALEX_EMAIL` | your@email.com |
   | `SEMANTIC_SCHOLAR_API_KEY` | *(optional)* |

6. Copy the public domain from the Railway dashboard (e.g. `https://citelens-api.up.railway.app`)

---

### Frontend → GitHub Pages

The workflow (`.github/workflows/deploy.yml`) runs automatically on every push to `main`.

**One-time setup:**

1. In your GitHub repo → **Settings → Pages**
   - Source: **Deploy from a branch** → branch: `gh-pages` / root
2. In **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `VITE_API_BASE_URL`
   - Value: your production backend URL (e.g. `https://citelens-api.onrender.com`)
3. Push any commit to `main` — the workflow builds and deploys automatically

**Without a backend secret:**
The frontend builds in demo-data mode (no secret required). The "Demo data" badge
appears in the seed card to indicate bundled mock results are being shown.

Live at: **`https://kishormorol.github.io/CiteLens/`**

---

## 🧩 API Overview

### `POST /api/analyze-paper`

```json
{ "query": "1706.03762", "limit": 20 }
```

`query` accepts: arXiv ID, arXiv URL, DOI, DOI URL, Semantic Scholar URL, or paper title.

```json
{
  "seedPaper": { "id": "...", "title": "...", "authors": [], "citationCount": 142318 },
  "summary":   { "totalCitingPapers": 1284, "rankedCandidates": 20, "mockMode": false },
  "results": [
    {
      "title": "BERT: ...",
      "finalScore": 0.96,
      "impactScore": 0.97,
      "networkScore": 0.95,
      "relevanceScore": 0.91,
      "citationIntentScore": 1.0,
      "badges": ["Highly Influential", "High Impact"],
      "whyRanked": "Ranked here due to: high normalized citation impact, ...",
      "breakdown": { "impact": "Top 0% cited in field. FWCI 145.2×.", ... }
    }
  ]
}
```

Other endpoints: `POST /api/resolve-paper`, `POST /api/citations`, `POST /api/ranked-citations`, `GET /health`

---

## 🎯 Why CiteLens?

Existing tools help you explore research.

CiteLens helps you **decide what to read next**.

---

## 🛣️ Roadmap

- [x] Four-signal ranking (Impact, Network, Relevance, Intent)
- [x] Explainable scores with per-paper breakdowns
- [x] My Library with localStorage persistence
- [x] Timeline view
- [x] Frontend ↔ backend API integration (set `VITE_API_BASE_URL` secret to go live)
- [ ] Better semantic relevance (embeddings)
- [ ] Citation context snippets
- [ ] Graph visualization
- [ ] Export to BibTeX / CSV
- [ ] Alerts for new influential papers

---

## 🤝 Contributing

Contributions are welcome — open an issue, suggest improvements, or submit a PR.

---

## 📄 License

MIT License

---

## 💡 Inspiration

Inspired by [scite.ai](https://scite.ai), [Connected Papers](https://www.connectedpapers.com), and [ResearchRabbit](https://www.researchrabbit.ai).

---

> Turn the overwhelming world of research papers into clear, ranked, and explainable reading paths.
