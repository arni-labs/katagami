# Live research result — 2026-08-13

Temper: `http://127.0.0.1:3472` tenant `default`

## Ledger

- CuratorAgent `en-019ffcc3-09ce-7700-af9f-e271c904bd55` → Idle after CompleteResearch
- trajectory_id `traj-100e66766f2e23a94cf97e5f`
- searches_run 3, sources_indexed 8 (machine cap), directions_derived 5 (machine cap)

## Query / job

- CurationQuery `en-019ffcc1-42f6-7ca0-8f49-34abe81d35f0` Researching
- CurationJob `en-019ffcc1-e540-73f3-a6cc-6d2545ff642a` **Completed** source_search
  (Configure+Start, no Paw session)

## Sources (Indexed)

| id | title |
|---|---|
| en-019ffcd0-eeb4-7023-90f7-41ef76b2632b | Met Museum — Woodblock Prints in the Ukiyo-e Style |
| en-019ffcd1-c76e-7090-8a63-09473c0436f9 | Ukiyo-e — Wikipedia |
| en-019ffcd1-c7ab-7232-a433-e844993130c6 | Swiss Style (design) — Wikipedia |
| en-019ffcd1-c7f6-7b22-9980-c06ccaf33194 | The Swiss Grid — Poster House |

## Directions spawned

SpawnDirection created 8 directions (Claude raced). All then **Failed** because the engine-created synthesize jobs ran `build_session_message` without `llm_model`. Vault secrets were set after. Research ledger still completed (job CompleteResearch + ledger CompleteResearch both 200).

## Live refusals (the machine)

- TakeQuery 409 — job_id not Running
- SearchTheWeb / IndexSources 409 from Idle
- IndexSources 409 at sources_indexed=8
- DeriveDirections 409 at directions_derived=5
- DesignSources POST 423 until DesignSource was merge-loaded alone
