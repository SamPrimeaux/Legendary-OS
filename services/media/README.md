# Media service

Reserved for heavy asynchronous processing only.

The canonical Legendary media runtime now lives in `backend/src/media/`. Do not create a second CRUD/storage implementation here.

Promote work into this service only when it genuinely needs a separate Worker/runtime, for example video inspection, expensive transcoding, background derivatives, or optional AI enrichment. The service must consume the same `MediaAsset` / `MediaAssetUsage` contracts and write through the canonical media persistence boundary.
