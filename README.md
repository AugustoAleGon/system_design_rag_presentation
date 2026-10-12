# System Design — building RAG systems

A 29-slide Astro presentation in English and Spanish, based on the supplied version-aware RAG outline. The design uses the reference poster's indigo, cyan, and white palette. The session has 40 minutes of teaching and 5 minutes of Q&A. The running example is Luma Store, a fictional online store whose support chatbot explains returns, refunds, and privacy policies from versioned PDFs.

## Run locally

Use Node.js 22.19 or newer and npm.

```sh
npm install
npm run dev
```

Open http://localhost:4321. English is also available at `/en/`; Spanish at `/es/`. The EN / ES switch preserves the current slide. A link such as `/es/#14` opens a specific slide.

## Present

- Left / right arrows, Page Up / Page Down, or Space: navigate.
- Home / End: first / last slide.
- O: slide overview. Select a slide to jump to it.
- N: speaker notes, including suggested time per slide.
- F: fullscreen (a focus layout is used if the browser rejects fullscreen).
- Esc: close a dialog or speaker notes.
- ?: keyboard help.
- On a phone, swipe horizontally to navigate and scroll vertically to read longer slides.

Speaker notes appear on the same screen. Close them before sharing the audience view. Fonts are bundled locally; the running deck does not require a CDN or external API. Print styles show all slides in landscape; browser printing can save a PDF.

## Edit

- `src/data/store-demo.ts`: deterministic policy resolver, bilingual scenario fixtures, and the interactive chatbot simulation on slide 27.
- `src/data/policies/catalog.json`: approved fictional policy metadata and source clauses.
- `src/data/policies/chunks.json`: text extracted from the generated PDFs, with page, source URL, and SHA-256 checksum.
- `public/policies/`: eight one-page fictional PDFs (four policies in two languages).
- `src/scripts/store-demo.ts`: scenario selection and service-by-service walkthrough.
- `src/data/visuals.ts`: visual layouts for slides 3, 4, 9, 10, 15, 16, 18, and 19, with bilingual captions and evidence annotations.
- `src/data/blueprint.ts`: merges the reviewed reference into 29 slides, including indexing, caching, monitoring, and service-specific fallbacks. It runs after the original visual layouts and before timing normalization.
- `src/styles/visuals.css`: responsive illustration, excerpt, timeline, and citation layouts.
- `src/scripts/visuals.ts`: accessible chunking-method controls on slide 10.
- `public/images/visuals/`: five locally bundled AI illustrations, generated with the built-in image tool. `prompts.json` records the original four prompts; `hnsw-prompt.json` records the indexing illustration.
- `src/data/deck.ts`: slide content, notes, timing, and interface strings in both languages. Each `p(English, Spanish)` pair keeps the translations together. The original outline is preserved in `src/data/source-outline.md`.
- `src/data/architecture.ts`: editable SVG schemas for the full system (slide 7), ingestion and publication (slide 8), and online retrieval (slide 21). Use “Expand diagram” to inspect connections; on phones, diagrams scroll horizontally. Spanish keeps established technical terms such as ingestion, retrieval, workers, and parsing.
- `src/data/i18n.ts`: isolated i18next instances and locale resources used to render `/en/` and `/es/` at build time. Language switching navigates between these generated routes, preserving the slide hash.
- `src/components/Deck.astro`: presentation layout.
- `src/styles/deck.css`: responsive slide styling and printing.
- `src/scripts/deck.ts`: navigation, dialogs, notes, and keyboard/touch behavior.
- `public/reference/event-poster.png`: original visual reference.

English is the default route. The title remains **System Design** in both languages as requested. Original outline topics are consolidated into 29 slides. The teaching timings are normalized to 40 minutes; Q&A stays at 5 minutes. Policy resolution distinguishes upload date, effective intervals, and the business event that selects the policy. Hybrid search uses rank fusion rather than summing unrelated raw scores.

## Build and verify

```sh
npm run build
npm run preview
npm test
```

`npm test` builds the production site and runs Playwright against it on port 4322. The browser checks use an installed Google Chrome. To use Playwright's bundled Chromium instead, remove `channel: 'chrome'` from `playwright.config.ts` and run `npx playwright install chromium`.

The checks cover bilingual content, session timing, deep links, navigation, notes, language switching, and slide overflow at desktop, laptop, and phone sizes. Static output is generated in `dist/` and can be served by any static host.

## Technical references

The source outline supplies the presentation content. Supplemental implementation references:

- [Astro documentation](https://docs.astro.build/)
- [i18next instance API](https://www.i18next.com/overview/api)
- [MiniLM model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) and [multilingual E5 model card](https://huggingface.co/intfloat/multilingual-e5-base): comparison on slide 12, with input-budget implications on slide 10. These are teaching candidates; the simulation uses no live embedding model.
- [BM25 scoring explained by Elastic](https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables): keyword versus semantic search on slide 16. Slide 17 connects both through RRF and cross-encoder reranking.
- [Reciprocal rank fusion](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion), also cited in the hybrid-search speaker notes.

## Luma Store teaching example

Slide 27 is an interactive, deterministic simulation. It does not call an LLM, vector service, order system, or payment API. Choose a scenario and step through Chat API → Resolver → Retrieval → Answer. The resolver really selects the policy using the fixture date and its effective interval; ranking and generated answers are illustrative. The cited passages were extracted from the linked PDFs. All source files and fonts work locally.

- Returns v1: purchases in `[2026-01-01, 2026-07-01)`, 30 calendar days.
- Returns v2: purchases from `2026-07-01`, 14 calendar days; uploaded on June 25, before it became effective.
- Refunds v1: selected by the verified approval date; expected processing is 5–7 business days after approval.
- Privacy v1: current-practice questions use the question date; historical requests need a relevant event date.

These are explicit rules of the fictional store, not universal legal or commerce rules. Dates use UTC calendar days in the fixtures. The June and July examples both ask about a return 20 days after purchase. Missing dates stop at clarification; zero or overlapping eligible policies are distinct resolver outcomes. Explaining a window does not approve a return, issue money, or disclose account data. Transaction facts and actions require separately authenticated APIs.

To rebuild the PDF fixtures, install `reportlab` and `pypdf` in a Python virtual environment, then run `python scripts/generate_policies.py`. It checks that each source clause survives PDF extraction and refreshes `chunks.json`. Rebuild Astro after updating fixtures.

## Visual walkthroughs

The presentation remains 29 slides in both languages. Slide 10 lets the presenter switch between Token, Semantic, and Agentic chunking, pairing a generated illustration with readable text and visible chunk boundaries. Each method preserves the same shortened teaching excerpt. The boundaries are illustrative, not outputs from live tokenizers, embeddings, or LLMs. Semantic and agentic approaches can produce the same grouping. Luma's proposed baseline follows PDF sections and paragraphs with a token cap; the chatbot demo continues to use pre-extracted PDF sections.

Slide 16 pairs a conceptual semantic neighborhood with highlighted keyword matches and BM25's scoring factors. The illustration is not a measured vector projection. Slides 9 and 19 show source provenance and matching citations using actual policy content or clearly shortened excerpts. Source links still open the fictional PDFs. Slide 15 displays version eligibility as a timeline, and slide 18 separates API facts from PDF evidence in the context packet.

Chunking reference: [Chroma's evaluation of chunking strategies](https://www.trychroma.com/research/evaluating-chunking). The detailed explanations and model-input limits remain in speaker notes.

## Blueprint comparison and merge

Reviewed all 14 raster pages of `/Users/augustoalegon/Downloads/RAG_Architecture_Blueprint.pdf` visually. The deck retains the indigo/cyan palette, portrait, existing AI artwork, security, policy versioning, interactive chatbot, and open Q&A with the GitHub action item. The reference contributes ruled comparisons and a clearer progression from mechanism to production tradeoffs.

| Reference pages | Merged into final slides |
| --- | --- |
| 2–4: knowledge gap, solution choices, core RAG | 3–5: Luma problem, illustrated RAG, prompting/fine-tuning/RAG comparison |
| 5–8: search, embeddings, indexing, chunking | 10, 12–13, 16: chunking explorer, model comparison, new HNSW explainer, hybrid search |
| 9: offline/online pipeline | 7–8, 21: architecture diagrams retain explicit service and storage connections |
| 10–11: latency and caching | 24: embedding, retrieval, and answer caches with scoped keys and invalidation |
| 12: failure handling | 26: different fallbacks for embedding, LLM, or eligibility/evidence failure |
| 13: production architecture and monitoring | 7, 21, 25: independent scaling, traces, operational signals, and evaluation |
| 14: recap | Consolidated into the architecture, production, and closing speaker notes |

To stay below 30, the separate version-comparison slide is folded into the timeline, the evaluation checklist into the evaluation/operations slide, and the recap into existing notes. Two new slides add vector indexing and caching. Final count: **29**, still **40 minutes of teaching + 5 minutes of questions**. Slide hashes follow the new sequence; the chatbot remains at 27 and Q&A moves to 29.

Technical adjustments to the reference: embedding dimensions depend on the model; similarity scores do not prove correctness; exact vector search can be practical; HNSW is approximate and requires recall/latency/memory evaluation; overlap does not guarantee complete sentences; no unmeasured 5 ms or 190× speedup is claimed. Query-answer caching and LLM response caching are consolidated because they duplicate the same artifact here. A BM25 fallback does not repair an LLM outage. Authorization, policy eligibility, and source access also apply to cached or degraded responses.

Indexing sources: [HNSW paper](https://arxiv.org/abs/1603.09320) and [pgvector documentation](https://github.com/pgvector/pgvector#hnsw). New production components remain architectural examples, not live services in the browser demo.
