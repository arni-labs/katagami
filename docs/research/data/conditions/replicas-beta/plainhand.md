The audit of the beacon-service logs closed on July 2. Every event for the past forty months appears in two streams, not one. The first stream holds a plain record: timestamp, lamp state, ignition hour, extinction hour. The second repeats each event with added narrative columns.

The cause is a duplicate writer. A 2022 migration introduced a new appender to a partner interface and left the original writer running beside it. Neither owner disabled the other. Both streams have persisted since.

Volume: the plain feed holds 5.1 million rows. Its twin holds 5.0 million, ninety-eight percent matched on shared keys. The prose columns add four gigabytes.

Three decisions follow. The plain feed becomes the system of record, because its schema already matches every downstream report and dashboard. The embellished copy stays read-only until analytics confirms nothing consumes its narrative. The extra appender shuts off after that confirmation, not before.

No data is deleted this quarter. The unmatched two percent traces to a clock skew filed under a separate ticket. Dashboards keep reading the plain feed and need no change.

Remaining work: confirm consumers by July 20, retire the appender by July 24, archive the copy for one year. The next review is scheduled for October 1.
