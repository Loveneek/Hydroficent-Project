# Vercel Deployment

Use the same GitHub repo and create separate Vercel projects for each operator dashboard.

## Audi Newmarket

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:

```env
VITE_PROPERTY_ID=pfaff-audi-newmarket
VITE_SUPABASE_URL=https://iyztnkseuldlqflqivwp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=replace-with-publishable-key
```

## Save-On-Foods Scottsdale Mall

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:

```env
VITE_PROPERTY_ID=save-on-foods-scottsdale-mall
VITE_SUPABASE_URL=https://iyztnkseuldlqflqivwp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=replace-with-publishable-key
```

Only use the Supabase publishable key in Vercel frontend projects. Do not add database URLs or secret keys to frontend environment variables.
