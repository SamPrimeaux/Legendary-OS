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

The scraper was executed in the ChatGPT container, but that runtime could not resolve public DNS, so the direct HTTP crawl recorded connection failures. The corpus committed here was therefore hydrated through the web retrieval layer instead. This means textual/page inventory is usable immediately, while image binaries were **not falsely marked as downloaded**.

The original CDN image URLs we could resolve are stored in `corpus/images.json`. Run the scraper from a normal networked workstation/CI job to download binaries into a local corpus, then intentionally decide whether those binaries belong in Git, R2, or the CMS asset store.

## Rule

This directory is source material, not runtime truth. Production content should ultimately live behind the `@inneranimalmedia-client/backend` CMS contracts and its configured storage adapter.
