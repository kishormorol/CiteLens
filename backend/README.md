# CiteLens Backend

FastAPI backend for the CiteLens citation discovery and ranking system.

## Stack
- Python 3.11+
- FastAPI + Uvicorn
- Pydantic v2 + pydantic-settings
- httpx (async HTTP)
- networkx (local PageRank)

## Quick start

```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env — set OPENALEX_EMAIL and optionally SEMANTIC_SCHOLAR_API_KEY

# 4. Run
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs  
Health:   http://localhost:8000/health

## Mock mode

Set `USE_MOCK_DATA=true` in `.env` to skip all live API calls.
The backend returns realistic mock data (Attention Is All You Need + 10 citing papers).
This is the default for the test suite.

## Running tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | `development` or `production` |
| `DEBUG` | `false` | Enable debug logging |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `8000` | Bind port |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | Comma-separated CORS origins |
| `USE_MOCK_DATA` | `false` | Return mock data without API calls |
| `SEMANTIC_SCHOLAR_API_KEY` | — | Optional — raises rate limit from 1 to 10 req/s |
| `OPENALEX_EMAIL` | — | Recommended — enables polite pool (faster) |
| `ARXIV_USER_AGENT` | `CiteLens/1.0` | Sent in User-Agent header to arXiv |

## Deploying to Render

1. Create a new **Web Service** from this repo (or a fork)
2. Set **Root Directory** to `backend`
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in the Render dashboard
6. Set `ALLOWED_ORIGINS` to include your GitHub Pages URL:
   `https://yourusername.github.io`

## Deploying to Railway

1. Create a new project → **Deploy from GitHub repo**
2. Set the **Root Directory** to `backend` in Railway settings
3. Railway auto-detects the `Procfile` — no extra config needed
4. Add environment variables in the Railway dashboard

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service health check |
| POST | `/api/analyze-paper` | Full pipeline: resolve → fetch → rank |
| POST | `/api/resolve-paper` | Resolve seed paper metadata only |
| POST | `/api/citations` | Raw citing papers for a paper ID |
| POST | `/api/ranked-citations` | Alias for analyze-paper |

### POST /api/analyze-paper

```json
{
  "query": "1706.03762",
  "limit": 20
}
```

`query` accepts: arXiv ID, arXiv URL, DOI, DOI URL, Semantic Scholar URL, or paper title.

### Response shape

```json
{
  "seedPaper": { "id": "...", "title": "...", "authors": [], ... },
  "summary": { "totalCitingPapers": 1284, "rankedCandidates": 20, "mockMode": false, "sourcesUsed": [] },
  "results": [
    {
      "id": "...",
      "title": "...",
      "finalScore": 0.91,
      "impactScore": 0.95,
      "networkScore": 0.88,
      "relevanceScore": 0.82,
      "citationIntentScore": 1.0,
      "badges": ["Highly Influential", "High Impact"],
      "whyRanked": "Ranked here due to: ...",
      "breakdown": { "impact": "...", "network": "...", "relevance": "...", "context": "..." }
    }
  ]
}
```

## Architecture

```
app/
  main.py              — FastAPI app, CORS, exception handlers, router registration
  config.py            — Settings from environment (pydantic-settings)
  routes/
    health.py          — GET /health
    papers.py          — All /api/* endpoints, orchestrates the pipeline
  models/
    paper.py           — Internal RawPaper model (used between services)
    api.py             — Pydantic request/response models (camelCase JSON)
  services/
    input_parser.py    — Classify and normalise user input
    paper_resolver.py  — Resolve seed paper via SS / arXiv / OA
    semantic_scholar_service.py  — SS API: lookup, search, citations
    openalex_service.py          — OA API: normalised percentile, FWCI enrichment
    arxiv_service.py             — arXiv API: metadata fallback
    deduplication_service.py     — Merge duplicate records
    ranking_service.py           — Score all signals, compute FinalScore
    relevance_service.py         — Token-overlap similarity (embeddings later)
    formatter_service.py         — Convert internal models to API response
    mock_data_service.py         — Realistic mock data, no API calls
  utils/
    text_similarity.py  — Tokenisation, Jaccard/cosine similarity
    normalization.py    — minmax, log1p, weight renormalization
    graph_utils.py      — Local PageRank via networkx
    exceptions.py       — Domain exceptions + HTTP mapping
```

## Upgrading relevance scoring

The `relevance_service.py` module has a stable interface (`score_batch`).
To upgrade from token-overlap to embedding-based similarity:

1. Install `sentence-transformers` or configure an embedding API key
2. Replace the body of `_score_one` in `relevance_service.py`
3. Keep the function signature identical — no other files need to change
