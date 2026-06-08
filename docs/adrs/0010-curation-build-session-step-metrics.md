# ADR 0010: Curation Build-Session Step Metrics

Date: 2026-05-20

## Status

Accepted for production measurement.

## Context

TemperPaw PERF-035 first instrumented the reusable `paw-wiki` `WikiJob`
`build_session_message` WASM. Production evidence then showed that the live
Katagami curation path does not expose `WikiJobs`; it exposes
`Katagami.Curation.CurationJob` through `CurationJobs`.

The slow production spans that motivated PERF-035 are therefore in Katagami's
own `katagami-curation/wasm/build_session_message` module. Without the same
per-step metrics on that module, Datadog cannot distinguish whether the
multi-second tail is workspace resolution, Session creation, Session configure,
parent notification, or SessionLink setup.

## Decision

Instrument Katagami `build_session_message` with a histogram metric:

- `katagami_curation_build_session_message_step_duration_ms`

The metric records each stateful OData boundary and the total WASM path with
low-cardinality tags:

- `job_type`
- `step`
- `result`

The measured steps are:

- `ensure_workspace`
- `create_session`
- `configure_session`
- `session_spawned`
- `create_session_link`
- `configure_session_link`
- `total`

The metric is app-scoped rather than reusing the `paw-wiki` metric name so
Datadog dashboards can isolate Katagami production curation behavior from the
generic reusable wiki pattern.

## Consequences

- PERF-035 can run a production CurationJob proof and attribute the slow tail to
  exact OData boundaries.
- The next speed change can be selected from measured evidence instead of
  guessing which child-session spawn step dominates.
- This does not change CurationJob semantics or the existing Session/SessionLink
  correctness model.
