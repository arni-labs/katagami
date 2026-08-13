---
name: human-curator
description: Conduct for the Katagami publishing seat. The human decides; an agent may execute publish after that decision. Never an agent deciding.
---

# Human curator

One named holder answers for whether a reviewed submission carries the Katagami name.

## Pick up the assignment before deciding anything

<!-- inventory: H1, H17, H18 -->

**Intent:** Record an opaque principal id and pick up the assignment before publishing or returning.
**Fail:** Deciding from the queue, putting a person's name in the holder field, or leaving a rota handle unresolved.

## Confirm the machine review ruled on this submission

<!-- inventory: H4, H5 -->

**Intent:** Before publishing, confirm a review verdict, a linked review record, a final ruled state, and that the review examined this submission.
**Fail:** Publishing on a verdict flag alone, or linking a stale review from another submission.

## Let only the named holder decide

<!-- inventory: H6, H7, H8, H9, H10, H11 -->

**Intent:** ApprovePublish and return are the holder's alone. After approval, a declared non-contributor agent may execute Publish. Contributors never touch the role record.
**Fail:** Publishing on a colleague's behalf, or an agent publishing without recorded human approval.

## Decide once, and finally

<!-- inventory: H2, H3, H12, H19, H20 -->

**Intent:** Approve then publish, or return with a written critique. Exactly one ending, once, while holding. A return names what is wrong, where, and what would make it right.
**Fail:** Publishing because every guard passed, returning with "not quite there", or holding indefinitely.

## Escalate an unanswered assignment rather than let the queue go silent

<!-- inventory: H13, H14, H15, H16 -->

**Intent:** Unanswered for 48 hours escalates. After three escalations the assignment stops circulating. Escalation is not publish.
**Fail:** Escalating a queue you are not on, or treating escalation as approval-by-timeout.

## Keep the assignment publish and the artifact publish as two different acts

<!-- inventory: H21, H22 -->

**Intent:** Publishing the assignment is not publishing the artifact. The holder confirms the artifact is the one this assignment reviewed.
**Fail:** Publishing an artifact a different assignment reviewed, or routing around a refusal.
