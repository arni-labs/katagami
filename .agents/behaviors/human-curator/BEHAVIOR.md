---
name: human-curator
description: >
  Conduct for the Katagami publishing seat: pick up one reviewed submission,
  confirm the machine review ruled on these exact artifacts, and either publish
  or return it with a written critique. The seat is a role, never a person.
  After three unanswered escalations the assignment stops circulating.
  The human decides; an agent may execute publish after that decision.
---

# Human curator

The publishing seat is where a submission stops being a machine's output and
becomes something Katagami stands behind. One named holder answers for that
decision. The record points at whoever holds the seat through an opaque
reference; identity lives elsewhere, so the seat can change hands without
rewriting history.

## Pick up the assignment before deciding anything

<!-- inventory: H1, H17, H18 -->

A decision belongs to a specific assignment. The holder records who they are —
an opaque principal id, never a name or a rota alias left unresolved — and
picks the assignment up before publishing or returning it.

Deciding straight from the queue, putting a person's name in the holder field,
or assigning to a rota handle and leaving it unresolved, each fail this: an
assignment nobody can be matched against is one nobody can publish.

## Confirm the machine review ruled on this submission

<!-- inventory: H4, H5 -->

Before publishing, the holder confirms three things: the assignment carries a
review verdict, a review record is actually linked, and that review has
reached its final ruled state. A missing link is not a pass.

The holder also confirms the linked review examined **this** submission, not
some other one. "A review exists" and "this work was reviewed" are different
statements. Nothing checks the match automatically, so it is a real
obligation.

Publishing on a verdict flag alone, linking a stale review from an earlier
submission, or treating a missing review as probably fine, each fail this.

## Let only the named holder decide

<!-- inventory: H6, H7, H8, H9, H10, H11 -->

Approving a publish and returning with critique are the assigned holder's
alone. Another person, however senior, takes the assignment over first. An
assignment with no holder is not decidable by anyone.

No agent decides to publish or return — no matter what kind of agent it
reports itself to be. After the holder has approved, a declared
non-contributor agent may execute the publish on that decision. An
unidentified caller has no business on this record. Contributor agents never
touch the role record. Nobody invokes the announcements the platform makes
when a submission is published, returned, or escalated.

Publishing on a colleague's behalf because they are away, or an agent
publishing without a recorded human approval, fails this.

## Decide once, and finally

<!-- inventory: H2, H3, H12, H19, H20 -->

The holder either approves a publish and then publishes (or asks an agent
to execute that publish), or returns the work with a critique. Exactly
one of those endings happens, exactly once, and only while holding the
assignment. Both endings are final. A return reopens the work; it does
not archive it.

The publish decision is the judgement the pipeline exists to put in front of a
person: is this good enough to carry the Katagami name? Passing every guard is
not the same as being good.

A return carries a written critique, recorded verbatim. The critique is the
training signal. It says what is wrong, where, and what would make it right,
and it addresses the work, never the run that made it.

Publishing because everything technically passed, returning with "not quite
there", or holding an assignment indefinitely rather than deciding, each fail
this.

## Escalate an unanswered assignment rather than let the queue go silent

<!-- inventory: H13, H14, H15, H16 -->

An assignment unanswered for 48 hours escalates by itself, and each
escalation is counted. The holder may raise it sooner — saying they cannot
get to this is better than letting the clock do it. A bystander does not
escalate somebody else's assignment.

Handing an escalated assignment to a different holder is the escalation
role's act, not the outgoing holder's. After three escalations the
assignment stops circulating: it is a parked human problem, not a rota that
runs forever. Escalating something does not publish it.

Escalating a queue you are not on, reassigning your own assignment to
yourself, or treating escalation as approval-by-timeout, each fail this.

## Keep the assignment publish and the artifact publish as two different acts

<!-- inventory: H21, H22 -->

Publishing the assignment is not publishing the artifact. The artifact-side
publish is governed by its own policies, and contributor agents cannot
publish a design language or an art style. What those policies do not check
is that the artifact a person publishes is the one this assignment reviewed.
The holder makes that correspondence themselves.

Any automation acting on an artifact, a grant, a member record or an OAuth
client declares what kind of agent it is. Declining to say is refused
outright, not treated as unclassified.

Publishing an artifact that a different assignment reviewed, or reading those
refusals as an outage to route around, fails this.
