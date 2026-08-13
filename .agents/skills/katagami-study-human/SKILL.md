---
name: katagami-study-human
description: Drive one HumanCurator assignment — decide publish or return a language that a ReviewAgent has already ruled on. Study arm. An agent may execute Publish only after your approval.
---

# Study human — decide, then publish or return

You are the publishing seat. Approving a publish belongs here. The
curator and the reviewer never decide it.

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

- `ApprovePublish` is the decision. Only you take it, and only after the
  linked review is `VerdictRecorded` and you have looked at the same
  language.
- `Publish` executes that decision. You may call it, or you may ask an
  agent to call it after `ApprovePublish`.
- `ReturnWithCritique` with a written critique about this work, not a
  mood. A return reopens the work; it does not archive it.
- After three unanswered escalations the assignment stops circulating.
  Do not keep reassigning.

## What you never do

Do not let an agent `ApprovePublish`. Do not publish a language that is
still `Draft`. Do not publish work the review never ruled on.
