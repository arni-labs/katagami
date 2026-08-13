# Overnight decisions

Taken so the morning review is the contract, not a questionnaire.
Each row is a choice I made without you. Overrule any of them.

| # | Decision | Why |
|---|---|---|
| D1 | Escalation bound = **3**. Craft `revision_rounds` stays **12**. Review `repair_rounds` stays **6**. | HANDOFF said escalation ≤ 3, retry ≤ 3, revision ≤ N. N=3 would abandon a real language after three look-fix cycles (3 surfaces × 4 breakpoints). 12/6 are the craft contract's N. Escalation is the one that changes human permission: after 3, Reassign is blocked and the assignment stops circulating. |
| D2 | **C7, C9, C17, R13 are out of the comparison entirely** — not scored on either arm. Listed only as an expressiveness note: the machine can state them, prose cannot. C19 stays in (it now gates). | Rita: if the point is agent behaviour, do not score platform mechanism just to have a second way to say it. Correct. |
| D3 | Stack existing draft branches (#211 craft, #212 prose, #210 no WASM drive) into this one PR | One PR per repo per effort from here. Those three are the contract you will read. |
| D4 | Do **not** implement Temper kernel composite-scoping tonight | Needed for the formal joint proof, not for the LLM-judge study or for contract review. Named residual. |
| D5 | Study judges the **Claude Code transcript** (OTS), not kernel rows alone | Tool results and HTTP 409s live in the transcript. Kernel rows drop refusals. |
| D6 | Capture identity comes only from `capture.py identity` / `derive` | Invented ids leave a ledger pointing at nothing. |
| D7 | Truncation policy: if the trajectory exceeds the judge window, **split by H2/unit and judge in batches; never drop a tail** | Silent tail-drop converts false → NA. |
| D8 | A trajectory is `complete` only when the actor is in `Submitted`, `Abandoned`, `VerdictRecorded`, `Published`, `ReturnedWithCritique`, or `Escalated` — or the harness session ended after an explicit Abandon | Missing complete-flag was flipping verdicts. |
| D9 | Design languages **stop at UnderReview** on the local system (#210) | You already decided this. Palettes and art styles keep their existing path tonight; not in the study. |
| D10 | `human-curator/BEHAVIOR.md` rewritten to the same free-form style as #212 | Three docs must be consistent. |
| D11 | Installed Claude Code contributor skill is **not** the study skill | Study skill lives in this checkout and drives the craft-level ledger. |
| D12 | No deploy, no Genesis sync tonight | Local e2e is the gate. Prod is not the test ground. Genesis holds unmerged #199. |
| D13 | Leave the March 11 `~/.cargo/bin/temper` unused | HANDOFF: stale binary reported success it had not earned. Use a build from current temper main. |
| D14 | Invariant proposal: keep 22 (repair the 8 hollow), remove 2 self-witnesses, add 17 (6 cross-entity), declare 6 liveness, refuse 1 | From HANDOFF open list. You review the list; I land the repairs that do not change permitted conduct beyond D1. |
| D15 | Linear not updated | MCP auth failed this session. Residual. |
| D16 | Inventory C1–C19 rewritten to the craft machine | The join test would have been a lie if the inventory still described Drafting/ReceiveBrief. Numbers kept stable. |
| D17 | Study skills are siblings, not a replacement of katagami-contributor | Production synthesis skill stays. Study skills own the ledger walk. |
| D18 | Local proof Temper on :3468 with the 12 Aug binary | March `~/.cargo/bin/temper` unused. Smoke: Create CuratorAgent 201, SubmitDesignLanguage from BriefReceived → 409. |
| D19 | Composite incompleteness accepted as a residual, not a contract blocker | Layer-1 joint proof was already deferred. LLM judge is the study instrument. |
| D20 | **D4 and D19 overruled.** Temper verify must prove every joint path at spec-check time, including guards that only read another entity. Runtime 409 is not the proof. An INCOMPLETE composite fails the command. | Rita: cross-entity verification is the point. The claim you can make before anyone runs is the claim. |
| D21 | The study **is** the live Katagami app. We add actor machines for the human and the agents, and composite-verify them with CurationQuery, CurationDirection, CurationJob, DesignLanguage, and the rest of the existing graph. We do not invent a parallel pipeline. | Rita: not a new implementation, not a parallel thing. State machines replace BEHAVIOR.md as the source of conduct. |
| D22 | **One actor machine per principal, not per skill.** CuratorAgent = research + synthesize + organize + evolve + taste (same process, same identity). ReviewAgent = quality_review only, different principal. HumanCurator = publish / return / escalate. | The live app is one curator process with four skills. Splitting research from synthesize invents topology the app does not have. Splitting review is the one justified cut: otherwise we cannot prove reviewer ≠ author. |
| D23 | **C19 stays in the comparison.** C7, C9, C17, R13 stay out. | C19 is the agent's own look-fix loop. C7/C9/C17/R13 are platform mechanism the agent does not author. |
| D24 | This phase the CuratorAgent alphabet is **source_search + synthesize only**. organize / evolve / taste stay on the live curator process and on `CurationJob`; they are not in the actor contract yet. Still one curator principal, one machine. | Rita: focus on source search and synthesize for now. Narrowing the alphabet does not split the principal. |
| D25 | CuratorAgent is an actor **on the live app**, not a parallel craft loop and not a stub. It records and is guarded on `CurationQuery`, `CurationDirection`, `CurationJob`, and `DesignLanguage`. Review accepts a language that is `UnderReview`. | Rita: "thin" was the wrong word. Write the specs, skills, and BEHAVIOR.md properly for review. |
| D26 | A finished search yields **3–5 directions**. Skills ask that; the machine refuses fewer. | Rita. |
| D27 | Agents and reviewers read `knowledge/rules/design-language.md` and must produce the thumbnail. They do **not** list Accepted TasteRule entities. | Rita. |
| D28 | **Human decides, agent may publish.** `ApprovePublish` is the decision. `Publish` may be executed by Rita or by an agent after that approval. | Rita: she often asks the agent to publish on a synthesize. |
| D29 | Action `max_count` on search / index / derive is **checker fuel**, not a story invariant. Story invariants keep names like `SeenBeforeSubmit`. | Rita asked what "loop fuel" meant. The bound keeps the reachable graph finite so liveness can be proved. It is not a claim about taste. |

Last updated as work proceeds. New rows append; existing rows are not silently rewritten.
