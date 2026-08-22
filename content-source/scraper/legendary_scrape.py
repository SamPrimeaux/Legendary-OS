#!/usr/bin/env python3
"""Legendary public-site content scraper / redesign corpus builder.

Crawls Legendary Scapes and Legendary Contractors, extracts redesign-oriented
content, discovers image URLs (including Wix/CDN/lazy/srcset assets), downloads
public image binaries when the runtime has outbound network access, and writes
JSON/Markdown manifests.

This intentionally does not bypass authentication, paywalls, CAPTCHAs, or
access controls. robots.txt is respected by default.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import re
import time
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup, Tag

USER_AGENT = "InnerAnimalMedia-ClientContentAudit/1.0"
REQUEST_TIMEOUT = 30
TRACKING_PARAMS = {
    "fbclid", "gclid", "dclid", "msclkid", "utm_source", "utm_medium",
    "utm_campaign", "utm_term", "utm_content", "utm_id",
}
DEFAULT_SCAPES = "https://legendary-scapes.com/"
DEFAULT_CONTRACTORS_PORTFOLIO = "https://www.legendarycontractors.com/portfolio"
SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "data:", "#")
SKIP_EXTENSIONS = {
    ".pdf", ".zip", ".mp4", ".mov", ".avi", ".mp3", ".wav", ".doc",
    ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
}


@dataclass(frozen=True)
class Target:
    name: str
    seed: str
    crawl_mode: str


def clean_url(url: str, base: str | None = None) -> str:
    if base:
        url = urljoin(base, url)
    url = (url or "").strip()
    if not url or url.startswith(SKIP_SCHEMES):
        return ""
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        return ""
    query = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
             if k.lower() not in TRACKING_PARAMS]
    p = p._replace(fragment="", query=urlencode(query, doseq=True), netloc=p.netloc.lower())
    return urlunparse(p)


def canonical_host(url: str) -> str:
    host = urlparse(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def same_site(a: str, b: str) -> bool:
    return canonical_host(a) == canonical_host(b)


def safe_slug(url: str) -> str:
    p = urlparse(url)
    path = p.path.strip("/") or "home"
    raw = f"{p.netloc}_{path}"
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", raw).strip("-").lower()
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return f"{slug[:110]}-{digest}"


def text_clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def unique(items: Iterable[str]) -> list[str]:
    out, seen = [], set()
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def parse_srcset(value: str) -> list[str]:
    """Parse common srcset forms without splitting commas inside CDN URLs.

    Wix and GoDaddy transformation paths contain commas (for example
    ``w_640,h_480``). Splitting the entire attribute on every comma creates
    fake URLs such as ``/h_480``. Tokenize the URL separately from its optional
    ``640w``/``2x`` descriptor instead.
    """
    text = (value or "").strip()
    if not text:
        return []

    out: list[str] = []
    cursor = 0
    while cursor < len(text):
        while cursor < len(text) and (text[cursor].isspace() or text[cursor] == ","):
            cursor += 1
        if cursor >= len(text):
            break

        start = cursor
        while cursor < len(text) and not text[cursor].isspace():
            cursor += 1
        url = text[start:cursor].strip()

        # Descriptor-less candidates commonly look like ``a.jpg, b.jpg``.
        # Only trailing commas are delimiters; embedded CDN commas are kept.
        if url.endswith(","):
            url = url.rstrip(",")
            if url:
                out.append(url)
            continue

        while cursor < len(text) and text[cursor].isspace():
            cursor += 1
        while cursor < len(text) and text[cursor] != ",":
            cursor += 1
        if url:
            out.append(url)
        if cursor < len(text) and text[cursor] == ",":
            cursor += 1

    return out


def extract_background_urls(value: str) -> list[str]:
    return [m.strip(" \"'") for m in re.findall(r"url\(([^)]+)\)", value or "", flags=re.I)]


def best_image_urls(tag: Tag, page_url: str) -> list[str]:
    candidates = []
    for attr in ("src", "data-src", "data-lazy-src", "data-original", "data-image", "data-bg", "data-background-image"):
        value = tag.get(attr)
        if isinstance(value, str):
            candidates.append(value)
    for attr in ("srcset", "data-srcset"):
        value = tag.get(attr)
        if isinstance(value, str):
            candidates.extend(parse_srcset(value))
    style = tag.get("style")
    if isinstance(style, str):
        candidates.extend(extract_background_urls(style))
    return unique([clean_url(x, page_url) for x in candidates if clean_url(x, page_url)])


def extract_page(html: str, page_url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    for node in soup(["script", "style", "noscript", "template", "svg"]):
        node.decompose()

    title = text_clean(soup.title.get_text(" ", strip=True)) if soup.title else ""
    meta = {}
    for tag in soup.find_all("meta"):
        key, value = tag.get("name") or tag.get("property"), tag.get("content")
        if key and value:
            meta[str(key)] = text_clean(str(value))

    links = []
    for a in soup.find_all("a", href=True):
        href = clean_url(str(a["href"]), page_url)
        if href:
            links.append({"url": href, "text": text_clean(a.get_text(" ", strip=True))})

    by_url = {}
    for tag in soup.find_all(["img", "source"]):
        for url in best_image_urls(tag, page_url):
            rec = {"url": url, "alt": text_clean(str(tag.get("alt") or "")), "title": text_clean(str(tag.get("title") or ""))}
            if url not in by_url or (rec["alt"] and not by_url[url].get("alt")):
                by_url[url] = rec

    for tag in soup.find_all(style=True):
        for raw in extract_background_urls(str(tag.get("style") or "")):
            url = clean_url(raw, page_url)
            if url:
                by_url.setdefault(url, {"url": url, "alt": "", "title": "css-background"})

    for key in ("og:image", "og:image:url", "twitter:image", "twitter:image:src"):
        if meta.get(key):
            url = clean_url(meta[key], page_url)
            if url:
                by_url.setdefault(url, {"url": url, "alt": "", "title": key})

    content = []
    for tag in soup.select("h1,h2,h3,h4,h5,h6,p,li,blockquote,address"):
        text = text_clean(tag.get_text(" ", strip=True))
        if text:
            content.append({"type": tag.name, "text": text})

    return {
        "url": page_url,
        "title": title,
        "meta": meta,
        "content": content,
        "links": links,
        "images": list(by_url.values()),
    }


class Robots:
    def __init__(self, session: requests.Session):
        self.session = session
        self.cache = {}

    def allowed(self, url: str) -> bool:
        p = urlparse(url)
        root = f"{p.scheme}://{p.netloc}"
        if root not in self.cache:
            rp = RobotFileParser()
            try:
                response = self.session.get(root + "/robots.txt", timeout=REQUEST_TIMEOUT)
                if response.ok:
                    rp.parse(response.text.splitlines())
                    self.cache[root] = rp
                else:
                    self.cache[root] = None
            except requests.RequestException:
                self.cache[root] = None
        rp = self.cache[root]
        return True if rp is None else rp.can_fetch(USER_AGENT, url)


def fetch_html(session: requests.Session, url: str) -> tuple[str, str]:
    response = session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
    response.raise_for_status()
    if "text/html" not in response.headers.get("content-type", "").lower():
        raise ValueError("response is not HTML")
    return response.text, clean_url(response.url)


def likely_html_page(url: str) -> bool:
    suffix = Path(urlparse(url).path.lower()).suffix
    return not suffix or suffix not in SKIP_EXTENSIONS


def image_extension(content_type: str, url: str) -> str:
    mime = (content_type or "").split(";")[0].strip().lower()
    ext = mimetypes.guess_extension(mime) if mime else None
    if ext == ".jpe":
        ext = ".jpg"
    if ext:
        return ext
    suffix = Path(urlparse(url).path).suffix.lower()
    return suffix if re.fullmatch(r"\.[a-z0-9]{2,5}", suffix) else ".bin"


def download_image(session: requests.Session, url: str, image_dir: Path) -> dict:
    image_dir.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:20]
    try:
        with session.get(url, timeout=REQUEST_TIMEOUT, stream=True) as response:
            response.raise_for_status()
            ctype = response.headers.get("content-type", "")
            if not ctype.lower().startswith("image/"):
                return {"url": url, "ok": False, "error": f"not_image:{ctype}"}
            path = image_dir / f"{digest}{image_extension(ctype, url)}"
            if not path.exists():
                with path.open("wb") as handle:
                    for chunk in response.iter_content(chunk_size=131072):
                        if chunk:
                            handle.write(chunk)
            return {"url": url, "ok": True, "file": str(path), "bytes": path.stat().st_size, "content_type": ctype.split(";")[0]}
    except Exception as exc:
        return {"url": url, "ok": False, "error": f"{type(exc).__name__}: {exc}"}


def scrape_target(target: Target, root: Path, session: requests.Session, robots: Robots,
                  max_pages: int, delay: float, download_images: bool, ignore_robots: bool) -> dict:
    target_dir = root / target.name
    pages_dir, images_dir = target_dir / "pages", target_dir / "images"
    pages_dir.mkdir(parents=True, exist_ok=True)
    seed = clean_url(target.seed)
    queue, queued, visited = deque([seed]), {seed}, set()
    pages, all_images, errors = [], {}, []

    while queue and len(visited) < max_pages:
        url = queue.popleft()
        if url in visited:
            continue
        visited.add(url)
        if not ignore_robots and not robots.allowed(url):
            errors.append({"url": url, "error": "blocked_by_robots"})
            continue
        try:
            html, final_url = fetch_html(session, url)
            page = extract_page(html, final_url)
            slug = safe_slug(final_url)
            json_path = pages_dir / f"{slug}.json"
            json_path.write_text(json.dumps(page, indent=2, ensure_ascii=False), encoding="utf-8")
            pages.append({"url": final_url, "title": page["title"], "json": str(json_path), "images": len(page["images"])})
            for image in page["images"]:
                all_images.setdefault(image["url"], image)
            if target.crawl_mode == "domain":
                for link in page["links"]:
                    next_url = clean_url(link["url"])
                    if next_url and same_site(seed, next_url) and likely_html_page(next_url) and next_url not in queued and next_url not in visited:
                        queued.add(next_url)
                        queue.append(next_url)
        except Exception as exc:
            errors.append({"url": url, "error": f"{type(exc).__name__}: {exc}"})
        if delay:
            time.sleep(delay)

    image_results = []
    if download_images:
        for url in all_images:
            image_results.append(download_image(session, url, images_dir))
            if delay:
                time.sleep(min(delay, 0.25))

    result = {
        "target": target.name,
        "seed": seed,
        "crawl_mode": target.crawl_mode,
        "pages_scraped": len(pages),
        "unique_images_found": len(all_images),
        "pages": pages,
        "images": image_results if download_images else list(all_images.values()),
        "errors": errors,
    }
    (target_dir / "manifest.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="./legendary-content-corpus")
    parser.add_argument("--max-pages", type=int, default=200)
    parser.add_argument("--delay", type=float, default=0.35)
    parser.add_argument("--no-images", action="store_true")
    parser.add_argument("--contractors-all", action="store_true")
    parser.add_argument("--ignore-robots", action="store_true")
    args = parser.parse_args()

    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"})
    robots = Robots(session)

    targets = [
        Target("legendary-scapes", DEFAULT_SCAPES, "domain"),
        Target("legendary-contractors", DEFAULT_CONTRACTORS_PORTFOLIO, "domain" if args.contractors_all else "single"),
    ]
    results = [scrape_target(t, out, session, robots, max(1, args.max_pages), max(0, args.delay), not args.no_images, args.ignore_robots) for t in targets]
    (out / "summary.json").write_text(json.dumps({"targets": results}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"output": str(out), "targets": [{"name": x["target"], "pages": x["pages_scraped"], "images": x["unique_images_found"], "errors": len(x["errors"])} for x in results]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
