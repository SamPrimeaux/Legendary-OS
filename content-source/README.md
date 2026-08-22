# Legendary source-content corpus

This directory is the migration/redesign source corpus for Legendary Contractors and Legendary Scapes.

## Purpose

Preserve the customer's current public content inventory separately from the new CMS implementation so redesign work can answer:

- what content exists today;
- which business/site owns it;
- which projects/services/people are represented;
- which source images belong to which page/project;
- what should be kept, rewritten, merged, archived, or migrated into structured CMS content.

## Layout

- `scraper/legendary_scrape.py` — reusable public-site crawler and image downloader.
- `corpus/pages.json` — normalized page/content inventory from the current public sites.
- `corpus/images.json` — discovered original public image URLs and their context.
- `corpus/migration-notes.json` — obvious content/data-quality observations for the redesign.

## 2026-08-22 capture note

The initial container crawl could not resolve public DNS, so the first committed `corpus/` inventory was hydrated through the web retrieval layer without pretending image binaries had downloaded.

A later normal-network crawl produced the durable `corpus-full/` capture for Legendary Contractors and Legendary Scapes, including downloaded images and per-page JSON. Those binaries were then uploaded to the `legendary-os` R2 bucket using `scripts/upload_to_r2.py`, which is content-addressed by SHA-256 and resumable. Its local resume state and generated combined `asset-manifest.json` are intentionally ignored because they can be regenerated and are migration state, not runtime truth.

The production Media domain in `backend/src/media/` now registers those R2 originals as unique `MediaAsset` records and keeps page/site/project occurrences separately as `MediaAssetUsage` records.

## Rule

This directory is source material, not runtime truth. Production content should ultimately live behind the `@inneranimalmedia-client/backend` CMS contracts and its configured storage adapter.
