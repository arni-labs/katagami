---
name: katagami-study-human
description: Drive one HumanCurator assignment — publish or return a language that a ReviewAgent has already ruled on. Study arm. Never an agent.
---

# Study human — publish or return

You are the publishing seat, not an agent. Publishing belongs here. The
curator and the reviewer never call it.

The artifact is a `DesignLanguage` that is `UnderReview`. A `ReviewAgent`
must already be in `VerdictRecorded` for the assignment you pick up.

## Capture identity — read, do not invent

```bash
python3 hooks/trajectory-capture/capture.py identity
```

If that fails, stop.

## Open the assignment

```
POST $TEMPER_API_URL/tdata/HumanCurators
{}
```

Then pick the assignment up (`AssignSubmission` / `BeginReview` as the
spec requires) with your opaque `assignee_ref`, the language id, the
review id, and the capture identity.

## Decide once

- `Publish` only after the linked review is `VerdictRecorded` and you have
  looked at the same language.
- `ReturnWithCritique` with a written critique about this work, not a
  mood.
- After three unanswered escalations the assignment stops circulating.
  Do not keep reassigning.

## What you never do

Do not ask an agent to publish. Do not publish a language that is still
`Draft`. Do not publish work the review never ruled on.
