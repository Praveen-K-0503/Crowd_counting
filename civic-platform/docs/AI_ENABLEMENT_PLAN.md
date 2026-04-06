# CivicPulse AI Enablement Plan

This phase adds an assistive AI layer that is safe to run in production today and easy to evolve into model-backed classification later.

## What Is Implemented Now

- Draft-time AI suggestions for citizens
- Operator-facing AI insight panel on complaint detail pages
- Voice-to-text using browser speech recognition where supported
- Rule-based domain suggestion
- Rule-based severity and priority suggestion
- Duplicate-risk analysis using nearby complaints plus text similarity
- Explainable routing and urgency reasons

## Why This Approach

The platform must keep working even if model infrastructure is unavailable. The current AI layer is therefore:

- assistive, not blocking
- explainable, not opaque
- safe to override
- compatible with future Hugging Face training and inference

## Recommended Hugging Face Track

### 1. Text Classification

Train a multi-class classifier for:

- domain
- sub-problem
- urgency band

Recommended dataset row shape:

```json
{
  "title": "Open manhole near bus stand",
  "description": "Large open manhole on the main road near the market",
  "address_line": "Temple Junction Road",
  "landmark": "Near city bus stand",
  "domain": "Public Infrastructure and Amenities",
  "sub_problem": "Open manhole",
  "priority": "P1"
}
```

### 2. Vision Classification

Use image datasets grouped by:

- pothole
- garbage overflow
- sewage overflow
- broken streetlight
- open manhole
- fallen tree
- fire
- flood

### 3. Speech Pipeline

Use audio complaint clips with transcript pairs for:

- speech-to-text benchmarking
- domain extraction from transcript
- multilingual complaint support later

## Suggested Repo Structure

```text
ai/
  datasets/
    text/
    vision/
    audio/
  evals/
  notebooks/
  schemas/
```

## Evaluation Targets

- domain classification accuracy
- urgency precision for P1/P2 complaints
- duplicate detection recall
- image category precision
- transcript word error rate

## Human-in-the-Loop Rules

- Operators must always be able to override AI output
- AI output should never auto-close, auto-reject, or auto-escalate without a rule-based safety gate
- Low-confidence predictions should be shown as suggestions only

## Next Model Integration Steps

1. Export labeled complaint data from PostgreSQL
2. Version datasets in GitHub or Hugging Face Datasets
3. Train baseline text and vision models
4. Benchmark against the current heuristic assistant
5. Replace or augment rule-based suggestions only when model metrics are clearly better
# CivicPulse AI Enablement Update

Image classification cannot be made perfect without a labeled civic image dataset. The current implementation now supports the practical foundations:

- photo GPS metadata extraction for JPEG images
- address lookup from photo GPS coordinates
- address search and map pin selection for users who do not know latitude/longitude
- visual signal handoff into the assistant for future model replacement

The recommended next AI milestone is to train a Hugging Face image classifier using the dataset format in:

- [civic-image-record.example.json](/C:/Users/Praveen/Documents/New%20project/civic-platform/ai/schemas/civic-image-record.example.json)
- [civic-image-labels.md](/C:/Users/Praveen/Documents/New%20project/civic-platform/ai/training/civic-image-labels.md)
- [training README](/C:/Users/Praveen/Documents/New%20project/civic-platform/ai/training/README.md)

