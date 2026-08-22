# Client backend media extraction boundary

Legendary OS consumes media through `backend/src/media/`. This directory is provenance/staging only for the future shared `@inneranimalmedia/client-backend/media` package.

Canonical runtime rules proven here:

- `Asset` is one unique stored binary/logical media item.
- `AssetUsage` records every site/page/section/project occurrence.
- R2 owns durable originals.
- D1 owns asset identity, metadata, and relationships.
- Cloudflare Images is optional transform/delivery infrastructure, never the asset database.
- CMS references `asset_id`; CMS does not download, hash, optimize, or physically store binaries.
- `tools/agentsam-site-scrape` / migration manifests feed the media import API rather than becoming a second media product.

Do not add a second R2 browser, media picker, or separate CMS asset store here.
