Discovery: the beacon service has written every event twice for forty years. One stream is terse. The other is verbose. Both were found intact during the legacy audit on July 6.

The terse stream holds the operational fields: wind, sea state, lamp-on, lamp-off. The verbose stream repeats each event as prose. It carries no field the terse stream lacks. We sampled the 1874 partition. 361 of 365 days are doubled. The four gaps match a recorded operator absence.

Cause: the original keeper ran a second writer by hand. No config records it. It was never wired to a consumer, so nothing downstream ever read it.

Decisions. The terse stream stays the system of record; it is complete and machine-readable. The verbose stream moves to cold archive; we keep it because it is unique, not because anything depends on it. No reader is repointed. The audit flag clears once both streams are checksummed.

Storage: the verbose stream is 3.1x the terse one and holds no queryable value. We do not delete it. The maintainers asked that it be preserved, and the cost is small.

No new spend requested. Next legacy audit: October 5.
