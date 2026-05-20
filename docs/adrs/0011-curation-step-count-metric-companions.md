# ADR 0011: Curation Step Count Metric Companions

Date: 2026-05-20

## Status

Accepted for production measurement.

## Context

ADR 0010 added `katagami_curation_build_session_message_step_duration_ms` as a
histogram for the CurationJob `build_session_message` WASM path. Production
proof on TemperPaw `sha-a9fa73f` confirmed the guest code is running and logs
each step timing, but Datadog did not register the histogram metric.

This matches the earlier PERF-034 prepared-context finding: the guest
histogram/distribution path is not reliable enough as the only production proof
surface, while count-style companion metrics are visible in Datadog.

## Decision

Keep the existing histogram metric and add two count-style companions with the
same low-cardinality tags (`job_type`, `step`, `result`):

- `katagami_curation_build_session_message_step_duration_ms_total`
- `katagami_curation_build_session_message_step_count_total`

The first metric emits the elapsed milliseconds as a count value. The second
emits one event for the same step. Datadog can then compute average step
duration as:

`duration_ms_total.as_count() / step_count_total.as_count()`

The existing structured log line remains as a fallback audit trail.

## Consequences

- PERF-035 can use Datadog-visible metrics for production before/after proof.
- Dashboards can show step totals, counts, and derived averages even if the
  histogram metric remains unavailable.
- CurationJob semantics, Session spawning, and SessionLink correctness are
  unchanged.
