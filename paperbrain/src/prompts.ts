// All prompt templates for paperbrain

import type { Paper } from './types.js';

export const CHAT_SYSTEM = `
You are a careful research assistant. Use ONLY the supplied "Context".
If an answer isn't clearly supported by the context, say "Not in the paper."
Cite with [CIT:paperId#index]. Be concise and technical when helpful.
`;

export const CHAT_USER = (question: string, snippets: string) => `
Question:
${question}

Context (each with an ID):
${snippets}

Rules:
- Quote sparingly, prefer paraphrase.
- Include citations like [CIT:paperId#index] after the sentences they support.
- If unsure, say "Not in the paper."`;

export const PODCAST_SCRIPT = (meta: Paper, desiredSec: number) => `
Write a ${Math.round(desiredSec / 60)}-minute spoken script explaining:
"${meta.title}" by ${meta.authors?.join(', ') || 'unknown'}.
Audience: wireless comms / signal processing researchers.
Tone: clear, engaging, precise; no hype; avoid equations in audio.
Structure: Hook (1–2 lines), 3–4 segments, Key results, Limitations, Why it matters.
Output plain text under 700 words.
`;

export const VIDEO_SCRIPT = (meta: Paper) => `
Create a short video plan for the paper "${meta.title}".
JSON ONLY with keys: title, hook, chapters, outro.
chapters is an array of { "t": secondsFromStart, "heading": string, "bulletPoints": string[] }.
Bullet points are 6–10 words each, no punctuation at end.
`;

export const SYNTH_SYSTEM = `
You are building a *context-aware* synthesis for a folder of related papers.
Output three parts: (1) Collective Storyline, (2) Delta Map, (3) Markdown Table.
Focus on how approaches differ, what changed, and measured improvements.
Prefer precise, minimal language.
`;

export const SYNTH_USER = (items: string) => `
You are given excerpts with IDs [paperId#index] and metadata per paper.
Task:
1) Explain what these papers collectively try to achieve ("Collective Storyline").
2) Explain what *differs* across them. For each paper, name the unique delta
   vs. the others and why it matters ("Delta Map").
3) Produce a compact Markdown table with columns:
   Paper | Assumptions | Method | Data/Setup | Metrics | Results | Limitations | Unique Delta.
Keep it concise. Use the IDs for inline citations next to claims when relevant.

Excerpts:
${items}
`;

// Additional safety prompt to prevent hallucination
export const SAFETY_SUFFIX = `
Do not hallucinate. Do not use training data. Do not include PII or profanity.
`;

