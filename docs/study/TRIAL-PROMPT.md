# Trial sessions — one job, one Claude Code session

Research is **one** Claude Code session, start to finish.
Each synthesize direction is **its own** Claude Code session, start to finish.
Do not mix them. Each session creates its **own** `CuratorAgent` ledger,
records capture, does only that job, and stops.

Judge **each session** twice: BEHAVIOR.md and `curator_agent.ioa.toml`.
See `JUDGE.md`.

| Session | Give Claude | Marks | Stop |
|---|---|---|---|
| Research | `SESSION-RESEARCH.md` + `research-direction/SKILL.md` | TakeQuery … CompleteResearch | search job Completed, 3–5 directions |
| Synthesize (per direction) | `SESSION-SYNTH.md` + `synthesize-language/SKILL.md` | TakeDirection … CompleteSynthesis | language UnderReview |

Never `katagami-contributor`. Never publish. Never `ApprovePublish`.
Never list Accepted TasteRule entities.

Live Temper: `http://127.0.0.1:3472` — `X-Tenant-Id: default`,
`Authorization: Bearer test-local-key`. Actions: `Temper.<Name>`.
