from __future__ import annotations

import json
import re
from collections.abc import Iterable
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional, Union

import requests


def fetch_daily_papers(date: Optional[str] = None):
    url = "https://huggingface.co/api/daily_papers"
    params = {}
    if date:
        params["date"] = date  # e.g. "2025-10-17"
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    papers = resp.json()
    # Normalize to the simplified structure requested by the application and sort by upvotes desc
    normalized = [_normalize_record(item) for item in papers]
    return sort_by_upvotes(normalized)


def _resolve_target_date(target: Optional[str]) -> date:
    if target:
        return datetime.fromisoformat(target).date()
    return datetime.now().date()


def _fetch_papers_for_window(days: int, end_date: Optional[str] = None) -> list[dict]:
    """Fetch papers for the trailing window of `days` ending at `end_date` (inclusive)."""
    final_day = _resolve_target_date(end_date)
    papers: list[dict] = []
    for offset in range(days):
        current_day = final_day - timedelta(days=offset)
        iso_value = current_day.isoformat()
        try:
            daily = fetch_daily_papers(date=iso_value)
            papers.extend(daily)
        except requests.HTTPError as err:
            # Log failure but keep collecting other days
            print(f"Failed to fetch papers for {iso_value}: {err}")  # noqa: T201
    return papers


_ARXIV_NEW_STYLE = re.compile(r"^\d{4}\.\d{4,5}(v\d+)?$")
_ARXIV_OLD_STYLE = re.compile(r"^[a-z\-]+(?:\.[a-z\-]+)?/\d{7}(v\d+)?$", re.IGNORECASE)


def _looks_like_arxiv_id(value: str) -> bool:
    return bool(_ARXIV_NEW_STYLE.match(value) or _ARXIV_OLD_STYLE.match(value))


def derive_links(record: dict) -> dict:
    """Collect best-effort links (arXiv, Hugging Face page, GitHub, etc.)."""
    links: dict[str, str] = {}
    paper = record.get("paper") or {}

    paper_id = paper.get("id") or record.get("paperId")
    arxiv_url: Optional[str] = None
    huggingface_url: Optional[str] = None
    if paper_id:
        huggingface_url = f"https://huggingface.co/papers/{paper_id}"
        if _looks_like_arxiv_id(str(paper_id)):
            arxiv_url = f"https://arxiv.org/abs/{paper_id}"

    if arxiv_url:
        links["arxiv"] = arxiv_url
    if huggingface_url:
        links["huggingface"] = huggingface_url

    source_url = record.get("url") or record.get("paperUrl") or paper.get("url")
    if source_url:
        links["source"] = source_url

    pdf_url = paper.get("pdfUrl") or paper.get("arxivPdf")
    if pdf_url:
        links["pdf"] = pdf_url

    github_repo = paper.get("githubRepo") or record.get("githubRepo")
    if github_repo:
        repo_str = str(github_repo)
        github_url = repo_str if repo_str.startswith(("http://", "https://")) else f"https://github.com/{repo_str}"
        links["github"] = github_url

    return links


def _attach_links(record: dict) -> dict:
    enriched = dict(record)
    if isinstance(record.get("paper"), dict):
        enriched["paper"] = dict(record["paper"])
    links = derive_links(record)
    if links:
        enriched["links"] = links
        if isinstance(enriched.get("paper"), dict):
            enriched["paper"]["links"] = links
    return enriched


def _normalize_record(record: dict) -> dict:
    """Return a simplified view containing only the requested fields.

    Fields returned:
      - authors: list of author names, preferring user.fullname when available
      - title: title of the paper
      - publishedAt: ISO datetime when it was published
      - summary: summary/highlights text
      - upvotes: number of upvotes
      - githubrepo: canonical GitHub repo URL if present
      - ai_keywords: list of AI keywords
      - githubstart: GitHub star count (if provided by source)
    """
    paper_details = record.get("paper") or {}

    # Title
    title = (
        record.get("title")
        or paper_details.get("title")
        or record.get("paperTitle")
        or paper_details.get("paperTitle")
        or "Untitled"
    )

    # Authors (prefer fullname from nested user if available)
    authors_raw = (
        record.get("authors")
        or record.get("paperAuthors")
        or paper_details.get("authors")
        or paper_details.get("paperAuthors")
        or []
    )
    authors_list: list[str] = []
    if isinstance(authors_raw, str):
        authors_list = [authors_raw]
    elif isinstance(authors_raw, Iterable):
        for author in authors_raw:
            if isinstance(author, str):
                authors_list.append(author)
            elif isinstance(author, dict):
                name = author.get("name")
                if not name and isinstance(author.get("user"), dict):
                    user = author["user"]
                    name = user.get("fullname") or user.get("name") or user.get("user")
                if name:
                    authors_list.append(name)

    # Published date
    published_at = (
        record.get("publishedAt")
        or record.get("date")
        or paper_details.get("publishedAt")
        or paper_details.get("date")
        or None
    )

    # Summary/highlights
    summary = (
        record.get("summary")
        or record.get("highlights")
        or paper_details.get("summary")
        or paper_details.get("highlights")
        or None
    )

    # Upvotes
    upvotes = record.get("upvotes")
    if upvotes is None:
        upvotes = paper_details.get("upvotes")

    # GitHub repo (normalize to full URL)
    github_repo_raw = paper_details.get("githubRepo") or record.get("githubRepo")
    githubrepo = None
    if github_repo_raw:
        repo_str = str(github_repo_raw)
        githubrepo = repo_str if repo_str.startswith(("http://", "https://")) else f"https://github.com/{repo_str}"

    # AI keywords
    ai_keywords = paper_details.get("ai_keywords") or record.get("ai_keywords") or []
    if not isinstance(ai_keywords, list):
        ai_keywords = [str(ai_keywords)]

    # GitHub stars (map to requested field name 'githubstart')
    githubstart = paper_details.get("githubStars") or record.get("githubStars")

    return {
        "authors": authors_list,
        "title": title,
        "publishedAt": published_at,
        "summary": summary,
        "upvotes": upvotes,
        "githubrepo": githubrepo,
        "ai_keywords": ai_keywords,
        "githubstart": githubstart,
    }


def fetch_weekly_papers(end_date: Optional[str] = None, *, days: int = 7) -> list[dict]:
    """Fetch papers for the trailing window ending at `end_date` (inclusive)."""
    return sort_by_upvotes(_fetch_papers_for_window(days=days, end_date=end_date))


def fetch_monthly_papers(end_date: Optional[str] = None, *, days: int = 30) -> list[dict]:
    """Fetch papers for roughly the past month ending at `end_date` (inclusive)."""
    return sort_by_upvotes(_fetch_papers_for_window(days=days, end_date=end_date))


def sort_by_upvotes(papers: Iterable[dict]) -> list[dict]:
    """Return papers sorted descending by the 'upvotes' field."""
    return sorted(
        papers,
        key=lambda item: item.get("upvotes")
        or (item.get("paper") or {}).get("upvotes")
        or 0,
        reverse=True,
    )


def format_papers(papers: Iterable[dict]) -> str:
    """Build a readable multiline string for console output."""
    lines = []
    for index, record in enumerate(papers, start=1):
        paper_details = record.get("paper") or {}
        title = (
            record.get("title")
            or paper_details.get("title")
            or record.get("paperTitle")
            or paper_details.get("paperTitle")
            or "Untitled"
        )
        authors_raw = (
            record.get("authors")
            or record.get("paperAuthors")
            or paper_details.get("authors")
            or paper_details.get("paperAuthors")
            or []
        )
        if isinstance(authors_raw, str):
            authors_list = [authors_raw]
        elif isinstance(authors_raw, Iterable):
            authors_list = []
            for author in authors_raw:
                if isinstance(author, str):
                    authors_list.append(author)
                elif isinstance(author, dict):
                    name = author.get("name")
                    if not name and isinstance(author.get("user"), dict):
                        user = author["user"]
                        name = user.get("fullname") or user.get("name") or user.get("user")
                    if name:
                        authors_list.append(name)
        else:
            authors_list = []
        authors_text = ", ".join(authors_list) if authors_list else "N/A"

        date_value = (
            record.get("publishedAt")
            or record.get("date")
            or paper_details.get("publishedAt")
            or paper_details.get("date")
            or "Unknown date"
        )
        summary = (
            record.get("summary")
            or record.get("highlights")
            or paper_details.get("summary")
            or paper_details.get("highlights")
            or ""
        )
        upvotes = record.get("upvotes")
        if upvotes is None:
            upvotes = paper_details.get("upvotes")

        links = derive_links(record)
        preferred_order = ("arxiv", "huggingface", "source", "pdf", "github")
        primary_label = next((label for label in preferred_order if links.get(label)), None)
        primary_url = links.get(primary_label) if primary_label else None

        lines.append(f"{index}. {title}")
        lines.append(f"   Authors: {authors_text}")
        lines.append(f"   Date: {date_value}")
        lines.append(f"   URL: {primary_url or 'N/A'}")
        for label in preferred_order:
            url_value = links.get(label)
            if not url_value or label == primary_label:
                continue
            label_text = "GitHub" if label == "github" else label.upper()
            lines.append(f"   {label_text} URL: {url_value}")
        if upvotes is not None:
            lines.append(f"   Upvotes: {upvotes}")
        if summary:
            lines.append("   Summary:")
            for summary_line in str(summary).splitlines():
                lines.append(f"     {summary_line}")
        lines.append("")  # blank line between entries

    return "\n".join(lines).strip()


def save_papers_as_json(papers, path: Union[str, Path], *, include_links: bool = False) -> Path:
    """Persist the fetched papers to disk as pretty JSON."""
    target_path = Path(path)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    payload = list(papers)
    if include_links:
        payload = [_attach_links(item) for item in payload]
    with target_path.open("w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, indent=2)
    return target_path


if __name__ == "__main__":
    # Example usage
    papers_today = fetch_daily_papers()
    print("Daily papers (sorted by upvotes):\n")  # noqa: T201
    print(format_papers(sort_by_upvotes(papers_today)))  # noqa: T201

    weekly_papers = fetch_weekly_papers()
    weekly_sorted = sort_by_upvotes(weekly_papers)
    print("\nWeekly papers (top 20 by upvotes):\n")  # noqa: T201
    print(format_papers(weekly_sorted[:20]))  # noqa: T201

    monthly_papers = fetch_monthly_papers()
    monthly_sorted = sort_by_upvotes(monthly_papers)
    print("\nMonthly papers (top 50 by upvotes):\n")  # noqa: T201
    print(format_papers(monthly_sorted[:50]))  # noqa: T201

    daily_path = save_papers_as_json(
        papers_today, Path("data") / "huggingface_daily_papers.json", include_links=True
    )
    weekly_path = save_papers_as_json(
        weekly_papers, Path("data") / "huggingface_weekly_papers.json", include_links=True
    )
    monthly_path = save_papers_as_json(
        monthly_papers, Path("data") / "huggingface_monthly_papers.json", include_links=True
    )
    print(f"\nSaved daily payload to {daily_path.resolve()}")  # noqa: T201
    print(f"Saved weekly payload to {weekly_path.resolve()}")  # noqa: T201
    print(f"Saved monthly payload to {monthly_path.resolve()}")  # noqa: T201
