The time fix on app-07 landed at 03:20, inside the maintenance slot. The host had run four minutes ahead for about three years. Its time daemon was switched off during a 2023 rebuild and never turned back on. The gap grew from there, unwatched.

Three systems felt it. Cron tasks fired early against two partners, and a pair of nightly exports left before the receiving side was ready. Log entries on app-07 also led the rest of the fleet, which bent the record in three earlier reviews. Signed tokens carried an early issue stamp, yet none aged past tolerance.

We re-enabled the daemon and jumped the offset to zero in one move. Scheduling was held during the correction, then released. A single jump beat a slow slew, since nothing could run mid-maintenance.

Stamps now track the reference within twenty milliseconds. Both stray exports were replayed against the right hour. The receiving partners re-processed them and reported no losses. The older timelines were tagged with the known skew. They stay closed.

An alert now trips when any node parts from its source by more than half a second. The next audit is set for August 3.
