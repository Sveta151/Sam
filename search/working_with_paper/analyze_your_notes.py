import os
import hashlib
import importlib.util
from pathlib import Path
from typing import Optional, Tuple
from anthropic import Anthropic
import fitz  # PyMuPDF


def _sanitize_api_key(raw: str) -> str:
    s = (raw or "").strip()
    # Remove common non-ASCII quotes if copy-pasted
    s = s.replace("“", "").replace("”", "").replace("’", "").replace("‚", "").replace("‛", "")
    # Strip surrounding regular quotes
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()
    # Ensure ASCII-only for HTTP header safety
    try:
        s.encode("ascii")
    except UnicodeEncodeError:
        s = s.encode("ascii", "ignore").decode("ascii")
    return s


_client: Optional[Anthropic] = None


def _get_client() -> Anthropic:
    global _client
    if _client is not None:
        return _client
    api_key_raw = os.getenv("ANTHROPIC_API_KEY")
    if not api_key_raw:
        raise EnvironmentError("ANTHROPIC_API_KEY is not set in the environment")
    _client = Anthropic(api_key=_sanitize_api_key(api_key_raw))
    return _client

def _ensure_highlights(pdf_path: str, highlights_path: str) -> str:
    if os.path.exists(highlights_path):
        with open(highlights_path, "r", encoding="utf-8") as f:
            return f.read().strip()

    # Try to import sibling highlights_extraction.py
    extractor_path = os.path.join(os.path.dirname(__file__), "highlights_extraction.py")
    try:
        spec = importlib.util.spec_from_file_location("highlights_extraction", extractor_path)
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)  # type: ignore[attr-defined]
            entries = mod.extract_highlights(Path(pdf_path))  # type: ignore[attr-defined]
            text = mod.format_results(entries)  # type: ignore[attr-defined]
            with open(highlights_path, "w", encoding="utf-8") as f:
                f.write(text)
            return text
    except Exception:
        pass

    return ""


def extract_pdf_text(path: str) -> str:
    doc = fitz.open(path)
    try:
        parts = []
        for page in doc:
            parts.append(page.get_text("text"))
        return "\n\n".join(parts)
    finally:
        doc.close()


def analyze_notes(
    pdf_path: Optional[str] = None,
    highlights_path: Optional[str] = None,
    max_paper_chars: Optional[int] = None,
    force: bool = False,
) -> Tuple[str, bool, str]:
    base_dir = os.path.dirname(__file__)
    pdf_path_final = pdf_path or os.path.join(base_dir, "test_pdf.pdf")
    highlights_path_final = highlights_path or os.path.join(base_dir, "test_pdf_highlights.txt")

    if not os.path.exists(pdf_path_final):
        raise FileNotFoundError(f"PDF not found at {pdf_path_final}")

    # Ensure highlights exist; if missing, auto-extract using the sibling module
    highlights_text = _ensure_highlights(pdf_path_final, highlights_path_final)
    if not highlights_text or not highlights_text.strip():
        # No notes available; short-circuit without calling the model
        return "no notes taken", False, ""

    # Extract and truncate paper text
    effective_max_chars = int(max_paper_chars or int(os.getenv("MAX_PAPER_CHARS", "300000")))
    paper_text = extract_pdf_text(pdf_path_final)
    if len(paper_text) > effective_max_chars:
        paper_text = paper_text[:effective_max_chars]

    # Cache key
    def _sha256_text(value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    cache_dir = os.path.join(base_dir, ".cache")
    os.makedirs(cache_dir, exist_ok=True)

    model_name = "claude-3-5-sonnet-20241022"
    max_output_tokens = 400

    cache_key_material = "|".join(
        [
            model_name,
            str(max_output_tokens),
            str(effective_max_chars),
            _sha256_text(paper_text),
            _sha256_text(highlights_text),
        ]
    )
    cache_key = hashlib.sha256(cache_key_material.encode("utf-8")).hexdigest()
    cache_path = os.path.join(cache_dir, f"{cache_key}.txt")

    if os.path.exists(cache_path) and not force:
        with open(cache_path, "r", encoding="utf-8") as f:
            return f.read(), True, cache_key

    client = _get_client()
    message = client.messages.create(
        model=model_name,
        max_tokens=max_output_tokens,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "You are an assistant writing a memo based on research paper highlights.\n\n"
                            "You are provided:\n"
                            "1. The paper itself (full text below) for background context.\n"
                            "2. A list of extracted highlights and notes from the paper.\n\n"
                            "Your task:\n"
                            "- Write a structured, coherent memo based only on the given highlights and notes.\n"
                            "- You may consult the paper only for context (e.g., to clarify meaning or connect related points); "
                            "do not introduce any new facts, results, or interpretations that are not in the highlights.\n"
                            "- Paraphrase only slightly for fluency.\n"
                            "- Keep it concise and avoid verbosity.\n\n"
                            "== Begin Paper Text ==\n"
                            f"{paper_text}\n"
                            "== End Paper Text ==\n\n"
                        ),
                    },
                    {
                        "type": "text",
                        "text": (
                            "Here are the highlights and notes:\n\n"
                            "== Begin Highlights ==\n"
                            f"{highlights_text}\n"
                            "== End Highlights ==\n\n"
                            "Output format:\n"
                            "1. Key Ideas\n"
                            "2. Observations & Comments\n"
                            "3. Personal Reflection (based only on notes)\n\n"
                            "Constraints:\n"
                            "- Keep the entire memo under 180 words.\n"
                            "- Each section should be at most 3 short bullet points or 1–2 brief sentences.\n"
                        )
                    }
                ]
            }
        ]
    )

    output_text = message.content[0].text
    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(output_text)

    return output_text, False, cache_key


if __name__ == "__main__":
    try:
        memo, cached, _ = analyze_notes()
        if cached:
            print("\n📝 Main things for us (cached):\n")
        else:
            print("\n📝 Main things for us:\n")
        print(memo)
    except Exception as exc:
        raise
