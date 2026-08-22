#!/usr/bin/env python3
"""
Upload scraped Legendary-OS content (images + page JSON) into the
`legendary-os` R2 bucket via `wrangler r2 object put`, and emit a
combined asset manifest mapping original scraped URLs -> R2 keys ->
worker-served asset paths for the frontend/CMS to consume.

Layout in the bucket:
  {target}/images/{sha256[:20]}{ext}   content-addressed -> automatic
                                        dedup + safe immutable caching
  {target}/pages/{page-slug}.json      stable per-page key, short
                                        mutable cache (re-scrapes change it)
  _meta/asset-manifest.json            combined manifest, all targets

Stdlib only. Idempotent/resumable via .r2_upload_state.json next to
the corpus. Failures are non-fatal -- the script keeps going and
reports everything that failed at the end.

Usage:
  python3 upload_to_r2.py                 # upload everything, resume from state
  python3 upload_to_r2.py --dry-run        # show the plan, upload nothing
  python3 upload_to_r2.py --force          # re-upload even if state says done
  python3 upload_to_r2.py --workers 12
  python3 upload_to_r2.py --corpus /path/to/corpus-full --bucket legendary-os
"""

import argparse
import concurrent.futures
import hashlib
import json
import mimetypes
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_BUCKET = "legendary-os"
IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
MUTABLE_CACHE = "public, max-age=300, stale-while-revalidate=3600"


def sha256_file(path: Path, chunk_size: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(chunk_size), b""):
            h.update(chunk)
    return h.hexdigest()


def ext_for(content_type, fallback_path: Path) -> str:
    guessed = mimetypes.guess_extension(content_type or "") if content_type else None
    if guessed == ".jpe":
        return ".jpg"
    return guessed or (fallback_path.suffix or ".bin")


class UploadState:
    """Resume-safe local record of what's already been pushed to R2."""

    def __init__(self, path: Path):
        self.path = path
        self.data = {}
        if path.exists():
            try:
                self.data = json.loads(path.read_text())
            except (json.JSONDecodeError, OSError):
                self.data = {}

    def done(self, key: str, sha256: str) -> bool:
        entry = self.data.get(key)
        return bool(entry) and entry.get("sha256") == sha256

    def mark(self, key: str, meta: dict) -> None:
        self.data[key] = meta

    def save(self) -> None:
        self.path.write_text(json.dumps(self.data, indent=2, sort_keys=True))


def wrangler_put(repo_root: Path, bucket: str, key: str, file_path: Path,
                  content_type: str, cache_control: str) -> None:
    cmd = [
        "npx", "wrangler", "r2", "object", "put", f"{bucket}/{key}",
        "--file", str(file_path),
        "--content-type", content_type,
        "--cache-control", cache_control,
        "--remote",
    ]
    result = subprocess.run(
        cmd, cwd=str(repo_root), capture_output=True, text=True, timeout=120
    )
    if result.returncode != 0:
        raise RuntimeError(f"wrangler put failed for {key}: {result.stderr.strip()[:500]}")


def build_image_plan(target: str, manifest: dict):
    for img in manifest.get("images", []):
        if not img.get("ok"):
            continue
        local_path = Path(img["file"])
        if not local_path.exists():
            continue
        content_type = img.get("content_type") or "application/octet-stream"
        digest = sha256_file(local_path)
        key = f"{target}/images/{digest[:20]}{ext_for(content_type, local_path)}"
        yield {
            "key": key,
            "local_path": local_path,
            "content_type": content_type,
            "cache_control": IMMUTABLE_CACHE,
            "sha256": digest,
            "original_url": img.get("url"),
            "bytes": img.get("bytes") or local_path.stat().st_size,
        }


def build_page_plan(target: str, manifest: dict):
    for page in manifest.get("pages", []):
        json_path = Path(page["json"])
        if not json_path.exists():
            continue
        digest = sha256_file(json_path)
        key = f"{target}/pages/{json_path.stem}.json"
        yield {
            "key": key,
            "local_path": json_path,
            "content_type": "application/json; charset=utf-8",
            "cache_control": MUTABLE_CACHE,
            "sha256": digest,
            "original_url": page.get("url"),
            "title": page.get("title"),
            "bytes": json_path.stat().st_size,
        }


def upload_one(repo_root, bucket, item, state: UploadState, force: bool, dry_run: bool):
    key = item["key"]
    if not force and state.done(key, item["sha256"]):
        return ("skipped", item)
    if dry_run:
        return ("planned", item)
    wrangler_put(repo_root, bucket, key, item["local_path"], item["content_type"], item["cache_control"])
    return ("uploaded", item)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--corpus", default=None, help="Path to corpus-full directory")
    parser.add_argument("--bucket", default=DEFAULT_BUCKET)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parents[1]  # content-source/scripts -> content-source -> repo root
    corpus_dir = Path(args.corpus) if args.corpus else repo_root / "content-source" / "corpus-full"
    if not corpus_dir.exists():
        print(f"ERROR: corpus dir not found: {corpus_dir}", file=sys.stderr)
        sys.exit(1)

    state = UploadState(corpus_dir / ".r2_upload_state.json")

    targets = sorted(p.parent.name for p in corpus_dir.glob("*/manifest.json"))
    if not targets:
        print(f"ERROR: no target manifests found under {corpus_dir}", file=sys.stderr)
        sys.exit(1)

    plan = []
    asset_manifest = {
        "bucket": args.bucket,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "targets": {},
    }

    for target in targets:
        manifest = json.loads((corpus_dir / target / "manifest.json").read_text())
        images = list(build_image_plan(target, manifest))
        pages = list(build_page_plan(target, manifest))
        plan.extend(images)
        plan.extend(pages)
        asset_manifest["targets"][target] = {
            "seed": manifest.get("seed"),
            "images": [
                {"original_url": i["original_url"], "r2_key": i["key"], "asset_url": f"/assets/{i['key']}",
                 "content_type": i["content_type"], "bytes": i["bytes"], "sha256": i["sha256"]}
                for i in images
            ],
            "pages": [
                {"url": p["original_url"], "title": p.get("title"), "r2_key": p["key"], "asset_url": f"/assets/{p['key']}"}
                for p in pages
            ],
        }

    print(f"Plan: {len(plan)} objects across {len(targets)} targets -> bucket '{args.bucket}'")

    results = {"uploaded": 0, "skipped": 0, "planned": 0, "failed": []}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(upload_one, repo_root, args.bucket, item, state, args.force, args.dry_run): item
            for item in plan
        }
        for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
            item = futures[future]
            try:
                status, item = future.result()
                results[status] += 1
                if not args.dry_run and status == "uploaded":
                    state.mark(item["key"], {"sha256": item["sha256"], "uploaded_at": time.time()})
                print(f"[{i}/{len(plan)}] {status:8s} {item['key']}")
            except Exception as exc:  # non-fatal: log and keep going
                results["failed"].append({"key": item["key"], "error": str(exc)})
                print(f"[{i}/{len(plan)}] FAILED   {item['key']}: {exc}", file=sys.stderr)

    if not args.dry_run:
        state.save()

    manifest_path = corpus_dir / "asset-manifest.json"
    manifest_path.write_text(json.dumps(asset_manifest, indent=2))
    print(f"\nWrote asset manifest: {manifest_path}")

    if not args.dry_run and (results["uploaded"] + results["skipped"]) > 0:
        try:
            wrangler_put(
                repo_root, args.bucket, "_meta/asset-manifest.json", manifest_path,
                "application/json; charset=utf-8", MUTABLE_CACHE,
            )
            print("Uploaded combined manifest -> _meta/asset-manifest.json")
        except Exception as exc:
            print(f"WARNING: failed to upload combined asset manifest: {exc}", file=sys.stderr)

    print(f"\nDone. uploaded={results['uploaded']} skipped={results['skipped']} "
          f"planned={results['planned']} failed={len(results['failed'])}")
    if results["failed"]:
        print("Failures:", file=sys.stderr)
        for f in results["failed"]:
            print(f"  - {f['key']}: {f['error']}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
