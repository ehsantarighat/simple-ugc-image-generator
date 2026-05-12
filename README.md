# Influencer UGC Generator

Generate hyperrealistic, creator-style UGC product images from a model
reference, a product reference, and a short scene description.

The user uploads two images and types a sentence; the app turns that into a
structured production prompt and calls GPT Image 2 with both references to
return a believable influencer-style product photo.

---

## What it does

1. Upload a **model reference image** (the creator whose identity you want to keep).
2. Upload a **product reference image** (the product whose packaging you want to keep).
3. Type a short **scene description**.
4. Pick aspect ratio, UGC tier, and quality.
5. Click **Generate**.
6. Get back a PNG that looks like a real creator shot — not a glossy ad.

The prompt builder explicitly steers away from plastic skin, distorted hands,
floating products, and altered branding.

---

## Project structure

```
influencer-ugc-generator/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app + endpoints + static mount
│   │   ├── config.py          # env-driven Settings
│   │   ├── schemas.py         # Pydantic models + enums
│   │   ├── prompt_builder.py  # 10-section structured prompt
│   │   ├── image_service.py   # GPT Image 2 (OpenAI SDK) integration
│   │   ├── file_utils.py      # safe streaming upload → tempfile
│   │   └── static/            # built frontend lands here in prod
│   ├── requirements.txt
│   └── tests/
│       ├── test_health.py
│       └── test_prompt_builder.py
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles/index.css
│       ├── lib/api.ts
│       └── components/
│           ├── UploadCard.tsx
│           ├── SettingsPanel.tsx
│           ├── ResultPanel.tsx
│           └── PromptDetails.tsx
│
├── Dockerfile        # multi-stage: build frontend → bundle into backend
├── Procfile          # uvicorn entrypoint
├── railway.json      # Railway build + healthcheck config
├── .env.example      # env vars to copy into .env
├── .gitignore
└── README.md
```

---

## Local setup

You need:

- Python 3.11+ (3.12 recommended)
- Node 20+
- An `OPENAI_API_KEY`

```bash
# clone, then:
cp .env.example .env
# edit .env and paste your OPENAI_API_KEY
```

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Export env from the repo-root .env (one option):
export $(grep -v '^#' ../.env | xargs)

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is now at `http://127.0.0.1:8000`:
- `GET  /api/health` → `{ "status": "ok" }`
- `POST /api/generate` (multipart) → see below.

Run tests:

```bash
cd backend
pytest
```

### Frontend (Vite + React + TS + Tailwind)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite dev server proxies `/api/*` to the
FastAPI server on `:8000`, so you only need one origin in your browser.

### How to test locally

1. Have backend + frontend dev servers running.
2. Open `http://127.0.0.1:5173`.
3. Drop in a model photo and a product photo.
4. Type a scene like:
   > A bright home bathroom in the morning, the model holding the product
   > near her face, polished UGC style, natural window light, 4:5 Instagram post.
5. Hit **Generate** and wait 20–60 seconds.
6. Inspect the result, expand **Prompt used**, and **Download** the PNG.

You can also hit the API directly:

```bash
curl -s http://127.0.0.1:8000/api/health
```

```bash
curl -X POST http://127.0.0.1:8000/api/generate \
  -F "model_image=@/path/to/model.jpg" \
  -F "product_image=@/path/to/product.jpg" \
  -F "scene=Bright bathroom, morning window light, model holding the serum." \
  -F "aspect_ratio=4:5" \
  -F "ugc_tier=polished" \
  -F "quality=high"
```

---

## Environment variables

Defined in `.env` (copied from `.env.example`):

| Variable              | Required | Default        | Notes                                                  |
|-----------------------|----------|----------------|--------------------------------------------------------|
| `OPENAI_API_KEY`      | yes      | —              | Server-only. Never expose in the frontend.             |
| `APP_ENV`             | no       | `development`  | Set to `production` on Railway.                        |
| `MAX_UPLOAD_MB`       | no       | `20`           | Per-image hard cap, enforced while streaming.          |
| `DEFAULT_IMAGE_MODEL` | no       | `gpt-image-2`  | Override (e.g. `gpt-image-1`) without code changes.    |
| `CORS_ORIGINS`        | no       | `*`            | Comma-separated allowlist. Unneeded when same-origin.  |

---

## API reference

### `GET /api/health`

```json
{ "status": "ok" }
```

### `POST /api/generate`

`multipart/form-data` fields:

| Field           | Type   | Required | Default          |
|-----------------|--------|----------|------------------|
| `model_image`   | file   | yes      | —                |
| `product_image` | file   | yes      | —                |
| `scene`         | string | yes      | —                |
| `aspect_ratio`  | string | no       | `4:5`            |
| `ugc_tier`      | string | no       | `polished`       |
| `quality`       | string | no       | `high`           |
| `usage`         | string | no       | `Instagram post` |

Success:

```json
{
  "success": true,
  "image_base64": "...",
  "mime_type": "image/png",
  "used_prompt": "...",
  "metadata": {
    "model": "gpt-image-2",
    "aspect_ratio": "4:5",
    "quality": "high",
    "ugc_tier": "polished"
  }
}
```

Failure:

```json
{ "success": false, "error": "..." }
```

---

## Deploy on Railway

The repo is configured to deploy as a single Railway service using the
provided `Dockerfile`:

- Stage 1 builds the Vite frontend (`frontend/dist`).
- Stage 2 installs the Python deps and copies `frontend/dist` into
  `backend/app/static/`.
- FastAPI serves the API at `/api/*` and the built SPA at `/`, so the
  whole product runs from one origin.

Steps:

1. Push this repo to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo**, pick this repo.
3. Railway detects `railway.json` and builds with the `Dockerfile`.
4. Under the service **Variables**, add at minimum:
   - `OPENAI_API_KEY` = your key
   - `APP_ENV` = `production`
5. Railway exposes `$PORT` automatically; the start command already binds to it.
6. The healthcheck is wired to `GET /api/health`.
7. Once deployed, open the public URL — the SPA loads from `/` and calls
   `/api/generate` on the same origin (no CORS setup needed).

---

## TODOs / optional next improvements

- **Job queue:** image generation can take 20–60 seconds; for production
  scale, move it behind a background queue with progress polling.
- **Auth:** anyone with the URL can spend your OpenAI quota. Add at minimum
  a shared secret header, or front it with Clerk/Auth0/etc.
- **Rate limiting:** add per-IP throttling on `/api/generate`.
- **Persistent storage:** v1 uses tempfiles and returns base64. Consider
  uploading both inputs and outputs to S3 / R2 / Vercel Blob and returning
  signed URLs.
- **Server-side image preflight:** decode uploads with Pillow and validate
  dimensions before forwarding to the model.
- **Cost / latency telemetry:** log model + size + duration per request.
- **Multiple variants:** request `n>1` and let the user pick.
- **Prompt tuning UI:** expose the structured fields (lens, lighting,
  setting) instead of relying on a single scene string.
- **e2e tests:** add a Playwright smoke test for the full upload-and-generate flow.

---

## Implementation notes / assumptions

- **Model name:** the spec calls the model `gpt-image-2`. As of writing,
  OpenAI's multi-image-reference model ships under `gpt-image-1`. The model
  id is env-overridable via `DEFAULT_IMAGE_MODEL`, so you can flip to
  `gpt-image-1` without code changes.
- **Multi-image input:** the integration uses `client.images.edit(...)` and
  passes both files as a list under `image=[model, product]`, which is the
  documented way to send multiple references to the GPT Image family.
- **Aspect ratio → size mapping** follows the spec literally:
  `1:1 → 1024x1024`, `4:5 → 1024x1280`, `9:16 → 1024x1792`, `16:9 → 1536x864`.
  If you swap to a model that only supports its own size list, update
  `image_service._ASPECT_TO_SIZE`.
- **Same-origin deploy:** the Dockerfile copies the built frontend into
  `backend/app/static/`, so FastAPI serves the SPA itself. No separate
  frontend service needed on Railway.
- **No persistent storage in v1:** uploads go to OS tempfiles and are
  removed after each request. The output is returned inline as base64.
