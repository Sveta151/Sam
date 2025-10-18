from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Tuple

import fitz  # PyMuPDF

BASE_DIR = Path(__file__).resolve().parent
PDF_PATH = BASE_DIR / "test_pdf.pdf"
OUTPUT_PATH = BASE_DIR / "test_pdf_highlights.txt"


def normalize_text(value: str) -> str:
    """Lowercase and strip non-alphanumeric characters for fuzzy matching."""
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def split_sentences(text: str) -> List[str]:
    """Split page text into sentences retaining punctuation."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in sentences if s.strip()]


def find_context(sentences: List[str], highlight_text: str) -> Tuple[str, str, str]:
    """Locate highlight text within sentences and return +/- context."""
    if not highlight_text:
        return "", "", ""

    target = normalize_text(highlight_text)
    best_idx = -1
    best_score = 0.0

    highlight_tokens = [t for t in re.findall(r"[a-z0-9]+", highlight_text.lower()) if t]

    for idx, sentence in enumerate(sentences):
        normalized_sentence = normalize_text(sentence)
        if target and target in normalized_sentence:
            best_idx = idx
            break

        # Fallback: compute token overlap ratio
        sentence_tokens = [t for t in re.findall(r"[a-z0-9]+", sentence.lower()) if t]
        if not highlight_tokens or not sentence_tokens:
            continue
        overlap = len(set(highlight_tokens) & set(sentence_tokens))
        ratio = overlap / max(len(highlight_tokens), 1)
        if ratio > best_score:
            best_score = ratio
            best_idx = idx

    if best_idx == -1:
        return "", "", ""

    prev_sentence = sentences[best_idx - 1] if best_idx > 0 else ""
    sentence = sentences[best_idx]
    next_sentence = sentences[best_idx + 1] if best_idx + 1 < len(sentences) else ""
    return prev_sentence, sentence, next_sentence


def extract_highlights(pdf_path: Path) -> List[Dict[str, str]]:
    doc = fitz.open(pdf_path)
    results: List[Dict[str, str]] = []

    for page_num, page in enumerate(doc, start=1):
        annots = page.annots()
        if not annots:
            continue

        page_sentences = split_sentences(page.get_text("text"))

        for annot in annots:
            subtype = annot.type[1]

            if subtype == "Highlight":
                text = ""
                quads = annot.vertices
                if quads and len(quads) % 4 == 0:
                    for i in range(0, len(quads), 4):
                        try:
                            rect = fitz.Quad(quads[i : i + 4]).rect
                            text += page.get_textbox(rect)
                        except Exception:
                            continue
                highlight_text = " ".join(text.split())
                prev_sentence, sentence, next_sentence = find_context(page_sentences, highlight_text)
                results.append(
                    {
                        "page": str(page_num),
                        "type": "highlight",
                        "highlight": highlight_text,
                        "context_previous": prev_sentence,
                        "context_sentence": sentence or highlight_text,
                        "context_next": next_sentence,
                    }
                )

            elif subtype == "Text":
                note = (annot.info.get("content") or "").strip()
                if note:
                    results.append(
                        {
                            "page": str(page_num),
                            "type": "note",
                            "note": note,
                        }
                    )
    return results


def format_results(entries: List[Dict[str, str]]) -> str:
    lines: List[str] = []
    for entry in entries:
        lines.append(f"Page {entry['page']} ({entry['type']})")
        if entry["type"] == "highlight":
            lines.append(f"Highlight: {entry.get('highlight', '')}")
            lines.append("Context:")
            lines.append(f"  Previous: {entry.get('context_previous') or '(none)'}")
            lines.append(f"  Sentence: {entry.get('context_sentence') or '(none)'}")
            lines.append(f"  Next: {entry.get('context_next') or '(none)'}")
        else:
            lines.append(f"Note: {entry.get('note', '')}")
        lines.append("")  # blank line between entries
    return "\n".join(lines).strip()


if __name__ == "__main__":
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found at {PDF_PATH}")

    extracted_entries = extract_highlights(PDF_PATH)
    formatted_output = format_results(extracted_entries)
    OUTPUT_PATH.write_text(formatted_output, encoding="utf-8")
    print(f"Saved highlights to {OUTPUT_PATH}")  # noqa: T201
