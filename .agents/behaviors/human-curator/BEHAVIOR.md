---
name: human-curator
description: How the Katagami publishing role handles one reviewed submission — taking the assignment, confirming the machine review ruled on it, and either publishing it or returning it with a critique. Applies to the role record that routes submissions to whoever currently holds the publishing seat, and to any automation that touches that record. Covers who may take each decision, what must be true before anything is published, how escalation works when nobody answers, and which of those boundaries are enforced rather than merely expected.
---

# Human curator

The publishing role is where a submission stops being a machine's output and
becomes something Katagami stands behind. One named person answers for that
decision.

This is a **role**, never a person. The record points at whoever holds the seat
through an opaque reference; identity lives elsewhere. That indirection is what
lets the seat change hands without rewriting history.

## Take the assignment before deciding anything

<!-- inventory: H1, H18 -->
**Intent.** A decision belongs to a specific assignment. Publishing from the queue,
without having picked the work up, is deciding about something nobody has looked
at.

<!-- inventory: H1, H18 -->
**Evidence.** An assignment records the holder, the kind of submission, the
artifact ids, the curator run and the machine review that produced it, and the
capture identity of that run. The holder MUST pick the assignment up before
publishing or returning it.

<!-- inventory: H17 -->
**Execution.** The holder reference MUST be the holder's principal id — an opaque
reference, never a person's name, email, or handle. A rota handle is resolved to
the actual holder before the assignment is made, not carried as a label. An
assignment whose holder reference is not a principal id is one nobody can be
matched against, and therefore one nobody can publish.

<!-- inventory: H1, H17 -->
**Failure modes.** Deciding straight from the queue. Putting a name in the holder
field. Assigning to a rota alias and leaving it unresolved.

## Publish only after the machine review has ruled on this submission

<!-- inventory: H4 -->
**Intent.** The machine review acts first. That ordering is the reason the review
role exists, and skipping it turns the human decision into the only check.

<!-- inventory: H4 -->
**Evidence.** Before publishing, the holder MUST confirm three things: the
assignment carries a review verdict, a review record is actually linked, and that
review has reached its final ruled state. A missing link is not a pass — an
assignment that names no review has not been reviewed, however complete it looks.

<!-- inventory: H5 -->
**Evidence.** The holder MUST also confirm that the linked review reviewed **this**
submission. The assignment records what the review says it examined; the holder
compares that against what is being published. **Nothing checks this
automatically** — a review of some other submission satisfies every other
condition — so it is a real obligation, not a formality.

<!-- inventory: H4, H5 -->
**Decision.** "A review exists" and "this work was reviewed" are different
statements. The holder MUST NOT let the first stand in for the second.

<!-- inventory: H4, H5 -->
**Failure modes.** Publishing on a verdict flag alone. Linking a stale review from
an earlier submission. Publishing while the linked review is still open. Treating
a missing review link as "probably fine".

## Only the named holder decides

<!-- inventory: H6 -->
**Intent.** One person answers for a publish. Not "a curator" — the one this
assignment names.

<!-- inventory: H6 -->
**Execution.** Publishing and returning are the assigned holder's alone. Another
person, however senior, MUST NOT publish somebody else's assignment; they take it
over first, through reassignment. An assignment with no holder is not publishable
by anyone.

<!-- inventory: H7, H8, H9, H10 -->
**Execution.** No agent publishes or returns with critique — no matter what kind
of agent it reports itself to be, and no matter what it was asked to do. An agent
that will not declare what kind of agent it is has no business on this record at
all, and an unidentified caller has none either. Contributor agents never touch
the role record: not their own assignment, not anyone's.

<!-- inventory: H11 -->
**Execution.** Nobody acts outside the actions this role defines, and nobody
invokes the announcements the platform makes when a submission is published,
returned, or escalated. Those are the platform's to emit; faking one would report
a decision that never happened.

<!-- inventory: H6, H7 -->
**Failure modes.** Publishing on a colleague's behalf "because they are away".
An agent publishing because a human asked it to. An automation that omits its own
identifying details and proceeds as though the rules were about somebody else.

## Publish or return — once, and finally

<!-- inventory: H3 -->
**Intent.** Both endings are final. The submission does not come back.

<!-- inventory: H2, H3 -->
**Execution.** The holder either publishes the work or returns it with a critique.
Exactly one of those happens, exactly once, and only while holding the assignment.

<!-- inventory: H19 -->
**Decision.** The publish decision is the judgement the whole pipeline exists to
put in front of a person: is this good enough to carry the Katagami name? Passing
every guard is not the same as being good. The holder MUST make that judgement
rather than ratify the machine's.

<!-- inventory: H12, H20 -->
**Execution.** A return carries a written critique, recorded verbatim. The
critique is the training signal — it is the most valuable thing this role
produces — so it SHOULD say what is wrong, where, and what would make it right.
It addresses the work, never the run that made it.

<!-- inventory: H19, H20 -->
**Failure modes.** Publishing because everything technically passed. Returning
with "not quite there". Critiquing the agent rather than the artifact. Holding an
assignment indefinitely rather than deciding.

## When nobody answers

<!-- inventory: H13 -->
**Intent.** A queue waiting on an absent person should be visible and countable,
not silent.

<!-- inventory: H13, H14 -->
**Execution.** An assignment unanswered for 48 hours escalates by itself, and each
escalation is counted. The holder MAY raise it sooner — saying "I cannot get to
this" is better than letting the clock do it. A bystander MUST NOT escalate
somebody else's assignment.

<!-- inventory: H15, H16 -->
**Execution.** Handing an escalated assignment to a different holder is the
escalation role's act, and the outgoing holder's MUST NOT be. This matters more
than it looks: reassignment is what sets who may publish, so a holder who could
reassign their own assignment could hand themselves a publish right the binding
above just took away.

<!-- inventory: H16 -->
**Recovery.** Reassignment is a re-route, not a bypass. The submission returns to
the assigned state and still has the human decision ahead of it. Escalating
something does not publish it, and MUST NOT be used to move it along.

<!-- inventory: H14, H15 -->
**Failure modes.** Escalating a queue you are not on. Reassigning your own
assignment to yourself. Treating escalation as approval-by-timeout.

## Publishing the assignment is not publishing the artifact

<!-- inventory: H21 -->
**Intent.** Two different acts, on two different records, and nothing ties them
together automatically.

<!-- inventory: H21, H22 -->
**Execution.** The artifact-side publish is governed by its own policies — which
forbid contributor agents from publishing a design language or an art style — but
nothing machine-checks that the artifact a person publishes is the one this
assignment reviewed. The holder MUST make that correspondence themselves, and MUST
NOT assume publishing the assignment has published anything else.

<!-- inventory: H22 -->
**Failure modes.** Publishing an artifact that a different assignment reviewed.
Assuming the artifact-side boundary is airtight and letting an unidentified
automation act on artifacts on the holder's behalf.
