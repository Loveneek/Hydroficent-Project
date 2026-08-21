# Hydroficient Operator Platform

Reusable water-monitoring dashboard and data pipeline for Hydroficient client properties.

## Structure

- `frontend/` - React/Vite operator dashboard. The same UI can run for different properties by changing `VITE_PROPERTY_ID`.
- `etl/` - Python processing pipeline for CSV telemetry, dashboard summary generation, and Supabase export.
- `configs/` - Property-specific ingestion configuration.
- `tests/` - Adapter tests for meter-specific normalization logic.

## Local Frontend

```bash
cd frontend
npm install
npm run dev:audi
npm run dev:save
```

The frontend reads dashboard data from Supabase using these environment variables:

```env
VITE_PROPERTY_ID=pfaff-audi-newmarket
VITE_SUPABASE_URL=https://iyztnkseuldlqflqivwp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=replace-with-publishable-key
```

Client-derived dashboard data is not committed to GitHub. Use the backend pipeline to regenerate summaries and export them to Supabase.

## Backend Pipeline

```bash
python -m venv .venv
.venv/bin/pip install -r Requirements.txt
.venv/bin/python -m pytest
.venv/bin/python -m etl.export_dashboard_to_supabase all --no-rebuild
```

Backend secrets belong in `.env`, which is ignored by git.
