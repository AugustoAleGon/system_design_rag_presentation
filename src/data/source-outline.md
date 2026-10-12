---
marp: true
title: "Designing a Version-Aware RAG Chatbot"
description: "45-minute system design presentation for an AI chatbot over product manuals"
paginate: true
---

# Designing a Version-Aware RAG Chatbot

### Building an AI assistant over many versions of product manuals

**Duration:** 45 minutes  
**Format:** ~40 minutes presentation + ~5 minutes Q&A

<!--
Speaker notes:
Introduce the scenario:
- We have many product manuals.
- Products may have multiple models, firmware versions, languages, and revisions.
- Users expect the chatbot to answer for the correct product/version.
The key idea is that this is not just “RAG”; it is version-aware RAG.
Timing: 1 minute
-->

---

# Agenda

1. What RAG is and why we need it
2. Requirements and constraints
3. High-level architecture
4. Document ingestion
5. Chunking and embeddings
6. Version-aware retrieval
7. Hybrid search and reranking
8. Prompting, citations, and guardrails
9. Scaling, reliability, and security
10. Evaluation and failure modes
11. End-to-end example
12. Q&A

<!--
Speaker notes:
Set expectations. Mention that the presentation focuses on system design rather than a specific vendor or framework.
Timing: 1 minute
-->

---

# 1. The Problem

Imagine a company has:

- Thousands of product manuals
- Several product models
- Multiple manual revisions
- Different firmware versions
- Different languages
- Historical manuals that must remain searchable

A user asks:

> "How do I reset Wi-Fi on my X200?"

The answer may be different for:

- X200 v1
- X200 v2
- X200 v3
- Firmware 3.2 vs 4.0

<!--
Speaker notes:
Emphasize the core risk:
A semantically relevant answer from the wrong version can be worse than no answer at all.

The biggest challenge is not generating fluent text.
The biggest challenge is retrieving the correct evidence.
Timing: 2 minutes
-->

---

# 2. What Is RAG?

## Retrieval-Augmented Generation

RAG combines:

1. **Retrieval**
   - Find relevant information from an external knowledge base.

2. **Augmentation**
   - Add that information to the LLM prompt.

3. **Generation**
   - Ask the LLM to answer using the retrieved evidence.

```text
Question
   ↓
Retriever
   ↓
Relevant document chunks
   ↓
LLM + Context
   ↓
Grounded answer
```

<!--
Speaker notes:
Explain that the LLM is not expected to “know” the manual.
We dynamically provide the information at question time.

This is different from training knowledge permanently into model weights.
Timing: 2 minutes
-->

---

# 3. Why RAG Instead of Fine-Tuning?

## RAG is a better fit for changing knowledge

| RAG | Fine-tuning |
|---|---|
| Updates quickly | Requires retraining |
| Easy to cite sources | Source attribution is difficult |
| Good for factual knowledge | Better for behavior/style |
| Supports private data | Knowledge becomes part of model behavior |
| Can preserve versions | Hard to reason about historical versions |

### Rule of thumb

> Use RAG to teach the model **what to know**.  
> Use fine-tuning to teach the model **how to behave**.

<!--
Speaker notes:
Fine-tuning can still be useful for tone, structured responses, or specialized behavior.
But for product manuals that change frequently, RAG is usually the core architecture.
Timing: 2 minutes
-->

---

# 4. Functional Requirements

The chatbot should:

- Answer natural-language questions
- Search product manuals
- Identify the correct product/model
- Identify the correct manual or firmware version
- Support historical versions
- Compare versions
- Support follow-up questions
- Show citations
- Say when evidence is insufficient

Example:

> "How do I factory-reset model X200 running firmware 3.2?"

Expected output:

- Correct instructions
- Correct version
- Manual section
- Page number
- Link/source

<!--
Speaker notes:
Mention that citations are important for trust, especially for technical or safety-related instructions.
Timing: 2 minutes
-->

---

# 5. Non-Functional Requirements

We also care about:

### Performance
- Low response latency
- Fast retrieval

### Reliability
- No partial indexes
- Retryable ingestion
- Graceful failure

### Accuracy
- High retrieval precision
- Avoid cross-version contamination

### Scalability
- Millions of chunks
- Large query volume

### Security
- Tenant isolation
- Access control
- No document leakage

### Observability
- Logs
- Metrics
- Retrieval traces
- Cost tracking

<!--
Speaker notes:
System-design interviews usually expect both functional and non-functional requirements.
Do not jump directly into vector databases.
Timing: 2 minutes
-->

---

# 6. High-Level Architecture

```text
                     OFFLINE / ASYNC
                     ───────────────

Product Manuals
      │
      ▼
 Object Storage
      │
      ▼
   Parser
      │
      ▼
   Chunker
      │
      ▼
 Metadata Enrichment
      │
      ▼
 Embedding Service
      │
      ├──────────────► Vector Index
      │
      └──────────────► Keyword Index


                     ONLINE / QUERY
                     ──────────────

User Question
      │
      ▼
Query Understanding
      │
      ▼
Version / Product Resolution
      │
      ▼
Metadata Filter
      │
      ▼
Hybrid Retrieval
      │
      ▼
Reranker
      │
      ▼
Context Builder
      │
      ▼
LLM
      │
      ▼
Answer + Citations
```

<!--
Speaker notes:
Split the architecture into two paths:

1. Offline ingestion
2. Online query path

This separation is important because parsing PDFs and generating embeddings are expensive and should not happen during user requests.
Timing: 3 minutes
-->

---

# 7. Document Ingestion Pipeline

When a manual is uploaded:

```text
Upload
  ↓
Validate
  ↓
Store original file
  ↓
Parse text and structure
  ↓
Normalize content
  ↓
Chunk document
  ↓
Attach metadata
  ↓
Generate embeddings
  ↓
Index chunks
  ↓
Mark version READY
```

### Make the pipeline asynchronous

Use a queue such as:

- SQS
- Kafka
- RabbitMQ
- Pub/Sub

Workers process ingestion independently.

<!--
Speaker notes:
A queue lets us scale workers and retry failures.

Each stage should be idempotent.
If an embedding worker retries, it should not create duplicate chunks.

A document should not become searchable until all required indexing steps complete.
Timing: 2 minutes
-->

---

# 8. Parsing Product Manuals

Manuals are more complicated than plain text.

They may contain:

- Headers and footers
- Tables
- Diagrams
- Warning boxes
- Multi-column layouts
- Error-code tables
- Images
- Scanned pages
- Step-by-step procedures

We should preserve:

```text
Document
 └── Chapter
      └── Section
           └── Subsection
                └── Paragraph / Table / Procedure
```

Useful metadata:

- Page number
- Section title
- Heading hierarchy
- Figure/table references

<!--
Speaker notes:
Explain why PDF extraction quality matters.
If the parser destroys tables or heading relationships, retrieval quality will suffer even if the embedding model is excellent.

For scanned manuals, OCR may be required.
Timing: 2 minutes
-->

---

# 9. Chunking Strategy

We do not embed the entire manual as one vector.

We divide it into **chunks**.

## Bad strategy

```text
Split every 500 characters.
```

This can cut:

- Procedures in half
- Warnings from instructions
- Tables from their descriptions

## Better strategy

Use semantic boundaries:

```text
Heading
  ↓
Paragraphs
  ↓
Procedure
  ↓
Table
```

Typical starting point:

- 300–800 tokens per chunk
- Small overlap
- Preserve section headings

<!--
Speaker notes:
There is no universally correct chunk size.

Small chunks:
+ precise
- may lose context

Large chunks:
+ preserve context
- can reduce retrieval precision and consume prompt tokens

The correct chunk size should be measured using retrieval evaluation.
Timing: 3 minutes
-->

---

# 10. Chunk Metadata

Each chunk should contain much more than text.

```json
{
  "chunk_id": "chunk_9812",
  "document_id": "manual_x200_v3",
  "product_id": "X200",
  "manual_version": "3.2",
  "firmware_min": "3.0",
  "firmware_max": "3.9",
  "language": "en",
  "section": "Network Settings > Wi-Fi",
  "page": 84,
  "text": "To reset network settings...",
  "is_current": true
}
```

### Metadata is critical

Without metadata, semantic search can retrieve:

> the perfect answer from the wrong manual version.

<!--
Speaker notes:
This slide contains one of the most important design ideas.

Embeddings encode semantic similarity.
They do NOT reliably enforce business constraints such as version, tenant, permissions, or language.

Those belong in structured metadata.
Timing: 2 minutes
-->

---

# 11. Embeddings and the Vector Database

An embedding converts text into a numerical vector.

```text
"How do I reset Wi-Fi?"
            ↓
Embedding model
            ↓
[0.12, -0.81, 0.42, ...]
```

Semantically similar text gets nearby vectors.

Possible storage options:

- Pinecone
- Weaviate
- Qdrant
- Elasticsearch / OpenSearch
- PostgreSQL + pgvector
- Managed cloud vector search

### Store

```text
vector + text + metadata
```

<!--
Speaker notes:
Avoid focusing too much on a vendor.

In an interview, say the choice depends on:
- scale
- filtering
- operational experience
- latency
- hybrid-search support
- cost

For moderate scale, PostgreSQL + pgvector can be a very reasonable solution.
Timing: 2 minutes
-->

---

# 12. Version-Aware Retrieval

This is the heart of the design.

### Version resolution priority

1. Explicit version in the question
2. Known device/account version
3. Version established earlier in the conversation
4. Current/latest version
5. Ask the user if ambiguity is dangerous

Example:

```text
User:
"How do I reset Wi-Fi on X200 v3?"

Resolved filters:

product_id = "X200"
manual_version = "3"
language = "en"
```

Then perform semantic search **inside that filtered corpus**.

<!--
Speaker notes:
Strong interview statement:

"Version selection should happen before semantic retrieval, not after generation."

Do not retrieve all versions and hope the LLM figures out which one applies.
Timing: 3 minutes
-->

---

# 13. Version Storage Strategy

Treat manual versions as immutable.

```text
Product
 ├── Manual v1
 ├── Manual v2
 ├── Manual v3
 └── Manual v4  ← current
```

Do not overwrite v3 when v4 is released.

Benefits:

- Historical questions
- Reproducible citations
- Auditing
- Rollback
- Version comparison
- Debugging retrieval behavior

Possible relational model:

```text
Product
  id
  name

Manual
  id
  product_id
  version
  language
  published_at
  is_current
  object_uri
  checksum

Chunk
  id
  manual_id
  page
  section
  text
```

<!--
Speaker notes:
Mention that the SQL metadata store and vector store have different responsibilities.

SQL:
- lifecycle
- relationships
- version identity
- ingestion state

Vector database:
- retrieval
Timing: 2 minutes
-->

---

# 14. Hybrid Retrieval

Vector search is not enough.

Consider this query:

> "What does error E103 mean on X200?"

Semantic search may struggle because:

```text
E103
```

is an exact identifier.

## Hybrid search

Combine:

### Semantic search
Good for:

- "The device keeps disconnecting from Wi-Fi."
- "How do I reset my network?"

### Lexical / BM25 search
Good for:

- E103
- X200-Pro
- Part #AC-1903
- Firmware 3.2.7

```text
Final retrieval score
      =
semantic score
      +
keyword score
```

<!--
Speaker notes:
Product documentation is an excellent example where hybrid search matters because exact technical identifiers are common.

This is a strong system-design talking point.
Timing: 3 minutes
-->

---

# 15. Reranking

Initial retrieval prioritizes speed.

Example:

```text
Vector/BM25 search
        ↓
Top 30 candidates
        ↓
Reranker
        ↓
Top 5–8 chunks
```

A reranker evaluates:

```text
(question, candidate chunk)
```

more precisely than approximate vector similarity.

### Why?

The embedding search asks:

> "Are these texts similar?"

The reranker asks:

> "Does this chunk actually answer this question?"

<!--
Speaker notes:
Explain the latency/quality trade-off.

ANN search is cheap and fast for many documents.
Reranking is more expensive, so we only rerank a small candidate set.

This two-stage retrieval architecture is common in production search systems.
Timing: 2 minutes
-->

---

# 16. Building the LLM Context

Do not simply paste every retrieved chunk.

The context builder should:

- Remove duplicates
- Merge useful neighboring chunks
- Preserve citations
- Enforce token budget
- Prefer higher-ranked evidence
- Avoid mixing versions

Example:

```text
SYSTEM:
Answer only from the provided manual excerpts.

PRODUCT:
X200

VERSION:
3.2

SOURCES:

[1] Network Settings, page 84
...

[2] Factory Reset, page 91
...

USER:
How do I reset my Wi-Fi settings?
```

<!--
Speaker notes:
Context quality matters more than context quantity.

Too much irrelevant context can make the answer worse.
Timing: 2 minutes
-->

---

# 17. Prompting, Citations, and Guardrails

The model should be instructed to:

1. Use only retrieved evidence
2. Identify the relevant product/version
3. Cite supporting sections
4. Avoid inventing steps
5. State when information is missing
6. Explain version conflicts explicitly

Example response:

```text
For X200 firmware 3.2:

1. Open Settings.
2. Select Network.
3. Choose Reset Network Settings.

Source:
X200 User Manual v3.2,
"Network Settings", page 84.
```

### Important

A prompt is **not** a replacement for correct retrieval.

<!--
Speaker notes:
Hallucination prevention should be layered:

- retrieval filters
- reranking
- prompt instructions
- confidence thresholds
- citations
- answer validation

Do not claim that a prompt alone eliminates hallucinations.
Timing: 3 minutes
-->

---

# 18. Comparing Manual Versions

Question:

> "What changed between X200 v2 and v3?"

Do two independent retrievals:

```text
                Question
                   │
            ┌──────┴──────┐
            ▼             ▼
      Filter v2       Filter v3
            │             │
        Retrieve       Retrieve
            │             │
            └──────┬──────┘
                   ▼
              Compare with LLM
```

This is safer than:

```text
Search all versions together
        ↓
Hope both versions appear
```

<!--
Speaker notes:
The system should keep evidence sets labeled by version.

The LLM can then produce:
- behavior in v2
- behavior in v3
- exact differences
- citations for each side
Timing: 2 minutes
-->

---

# 19. Handling Ambiguity

User:

> "How do I factory reset the device?"

But the product has different procedures across versions.

Possible strategy:

```text
Do we know the version?
       │
   ┌───┴───┐
  Yes      No
   │        │
retrieve   Is the answer
exactly    version-sensitive?
            │
        ┌───┴───┐
       No      Yes
        │        │
   latest +     ask:
 disclosure   "Which version?"
```

### Never silently mix incompatible instructions.

<!--
Speaker notes:
A good chatbot does not always answer immediately.

Sometimes asking one clarification question is the safest and most accurate behavior.
Timing: 2 minutes
-->

---

# 20. Scaling the System

At larger scale:

```text
API Gateway
     │
     ▼
Chat Service
     │
     ├────────► Query/Embedding Service
     │
     ├────────► Retrieval Service
     │               │
     │               ├── Vector Index
     │               └── Search Index
     │
     └────────► LLM Provider
```

### Scale independently

- Chat/API servers
- Retrieval workers
- Ingestion workers
- Embedding generation
- Vector database
- Search index

### Possible partition keys

- Tenant
- Product family
- Language
- Region

<!--
Speaker notes:
Be careful with over-sharding too early.

Metadata filtering may be sufficient initially.

At very large scale, partitioning reduces the search space and improves locality.
Timing: 3 minutes
-->

---

# 21. Reliability and Updating Manuals

Suppose manual v4 is uploaded.

We should not immediately expose it.

```text
UPLOADED
   ↓
PARSING
   ↓
CHUNKING
   ↓
EMBEDDING
   ↓
INDEXING
   ↓
VALIDATING
   ↓
READY
   ↓
CURRENT
```

Only after validation do we switch:

```text
current_version = v3
        ↓
atomic update
        ↓
current_version = v4
```

### Also use

- Retries
- Idempotency
- Dead-letter queues
- Checksums
- Index reconciliation
- Health metrics

<!--
Speaker notes:
This prevents users from searching a partially indexed manual.

The old version remains available throughout deployment, giving us effectively zero-downtime knowledge updates.
Timing: 3 minutes
-->

---

# 22. Security

RAG introduces an important rule:

> Authorization must happen during retrieval.

A user should never retrieve chunks they cannot access.

Metadata may include:

```text
tenant_id
organization_id
product_scope
region
role
access_level
```

Retrieval:

```text
semantic search
WHERE
tenant_id = current_user.tenant
AND permissions match
```

### Do not rely on the LLM to enforce permissions.

<!--
Speaker notes:
If restricted content reaches the prompt, the security boundary has already failed.

Security filtering must happen before retrieved text is sent to the model.
Timing: 2 minutes
-->

---

# 23. Evaluating RAG

Evaluate retrieval separately from generation.

## Retrieval metrics

- Recall@K
- Precision@K
- MRR
- NDCG

Question:

> Did we retrieve the correct manual section?

## Generation metrics

- Faithfulness
- Answer relevance
- Citation correctness
- Completeness

Question:

> Did the model answer correctly from the evidence?

<!--
Speaker notes:
A poor answer can come from two very different problems:

1. Retrieval failed.
2. Retrieval succeeded, but generation failed.

If we measure only final answer quality, debugging becomes much harder.
Timing: 2 minutes
-->

---

# 24. Golden Evaluation Dataset

Create a test dataset:

```text
Question
        ↓
Expected product
        ↓
Expected version
        ↓
Expected manual section(s)
        ↓
Reference answer
```

Example:

```yaml
question: "What does E103 mean?"
product: "X200"
version: "3.2"
relevant_pages:
  - 144
expected_answer:
  "E103 indicates..."
```

Run this suite whenever you change:

- Chunking
- Embedding model
- Search configuration
- Metadata filtering
- Reranking
- Prompt
- LLM model

<!--
Speaker notes:
Treat the RAG pipeline like software.

You should have regression tests before changing core retrieval components.
Timing: 2 minutes
-->

---

# 25. Common Failure Modes

### 1. Wrong version retrieved
Fix: metadata filters.

### 2. Exact error code not found
Fix: hybrid search.

### 3. Procedure split across chunks
Fix: semantic/structural chunking.

### 4. Too much irrelevant context
Fix: reranking + token budget.

### 5. Broken tables
Fix: better parsing / structured table extraction.

### 6. Partial new-version index
Fix: staged ingestion state.

### 7. Hallucinated answer
Fix: grounding + confidence + refusal behavior.

### 8. Cross-tenant data leak
Fix: retrieval-time authorization.

<!--
Speaker notes:
Use this slide as a checklist in system-design interviews.

It demonstrates that you are thinking about real production behavior, not just the happy path.
Timing: 2 minutes
-->

---

# 26. End-to-End Example

User asks:

> "What does error E103 mean on my X200 running firmware 3.2?"

### Step 1 — Resolve context

```text
product = X200
firmware = 3.2
language = en
```

### Step 2 — Build metadata filter

```text
product_id = X200
firmware_min <= 3.2
firmware_max >= 3.2
language = en
```

### Step 3 — Hybrid retrieval

Search:

```text
"E103"
+
semantic meaning of the full question
```

<!--
Speaker notes:
Walk slowly through the request as if answering a system-design interviewer.
Timing: 1 minute
-->

---

# 27. End-to-End Example — Continued

### Step 4 — Retrieve candidates

```text
30 chunks
```

### Step 5 — Rerank

```text
30 → 6 chunks
```

### Step 6 — Build context

```text
Error Codes, page 144
Troubleshooting, page 145
Network Module, page 61
```

### Step 7 — LLM response

```text
Error E103 indicates a network-module connection failure.

Recommended steps:
1. ...
2. ...
3. ...

Source:
X200 Manual v3.2,
Error Codes, page 144.
```

<!--
Speaker notes:
Highlight that the LLM is the final component in a long pipeline.
Most of the system-design work is about getting trustworthy evidence into the model.
Timing: 1 minute
-->

---

# 28. Mental Model

Remember this pipeline:

```text
DOCUMENT SIDE

Manual
  ↓
Parse
  ↓
Chunk
  ↓
Metadata
  ↓
Embed
  ↓
Index


QUESTION SIDE

User
  ↓
Resolve product/version
  ↓
Filter
  ↓
Hybrid retrieve
  ↓
Rerank
  ↓
Build context
  ↓
LLM
  ↓
Answer + citations
```

### The most important principle

> **Retrieve the right version before asking the LLM to reason about the answer.**

<!--
Speaker notes:
If you remember only one architecture diagram, remember this one.
Timing: 1 minute
-->

---

# 29. Strong System-Design Summary

A concise interview answer:

> I would separate ingestion from the online query path. Manuals are stored in object storage and parsed asynchronously. We preserve document structure, create semantic chunks, enrich them with product and version metadata, generate embeddings, and index both vector and lexical representations.
>
> At query time, I first resolve the user's product and version. I apply those constraints before retrieval, use hybrid semantic and keyword search, rerank the candidates, and provide only the best evidence to the LLM.
>
> The model is instructed to answer from the evidence, cite its sources, and refuse when the evidence is insufficient. Manual versions remain immutable so historical questions and comparisons are supported. Retrieval and generation quality are evaluated independently.

<!--
Speaker notes:
This is the answer you should be able to deliver in roughly 60–90 seconds in an interview.

Then let the interviewer choose where to go deeper:
- chunking
- scalability
- embeddings
- versioning
- evaluation
- security
Timing: 2 minutes
-->

---

# 30. Questions an Interviewer May Ask

Be ready for:

1. Why RAG instead of fine-tuning?
2. How do you choose chunk size?
3. Why hybrid search?
4. How do you prevent the wrong version from being retrieved?
5. What if the user does not know their version?
6. How do you compare two versions?
7. How do you update manuals without downtime?
8. What happens if vector search returns poor results?
9. How do you handle tables and diagrams?
10. How do you prevent hallucinations?
11. How do you measure retrieval quality?
12. How would the system change at 100M+ chunks?
13. How do you secure private manuals?
14. What would you cache?

<!--
Speaker notes:
Use these questions for self-study after the presentation.
Timing: 1 minute
-->

---

# 31. Q&A

## Key takeaway

RAG quality depends much more on:

- document quality
- metadata
- retrieval
- version filtering
- reranking
- evaluation

than on simply choosing a more powerful LLM.

```text
Good RAG =
Good data
+ Good retrieval
+ Good context
+ Good generation
```

### Questions?

<!--
Speaker notes:
Reserve approximately 5 minutes for Q&A.

If there are no questions, use the time to discuss:
- pgvector vs dedicated vector DB
- hybrid search implementation
- chunk-size trade-offs
- evaluation strategies
- scaling to millions/billions of chunks
Timing: 5 minutes
-->
