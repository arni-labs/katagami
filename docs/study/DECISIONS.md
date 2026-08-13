# Overnight decisions

Taken so the morning review is the contract, not a questionnaire.
Each row is a choice I made without you. Overrule any of them.

| # | Decision | Why |
|---|---|---|
| D1 | Escalation bound = **3**. Craft `revision_rounds` stays **12**. Review `repair_rounds` stays **6**. | HANDOFF said escalation ≤ 3, retry ≤ 3, revision ≤ N. N=3 would abandon a real language after three look-fix cycles (3 surfaces × 4 breakpoints). 12/6 are the craft contract's N. Escalation is the one that changes human permission: after 3, Reassign is blocked and the assignment stops circulating. |
| D2 | Exempt **C7, C9, C17, R13** from the prose-arm score. **C19 is not exempt** — craft specs now gate `revision_rounds` at 12, so it is real conduct. | Mechanism items still have no behavioural form. C19 changed when the craft machine landed. |
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

Last updated as work proceeds. New rows append; existing rows are not silently rewritten.
