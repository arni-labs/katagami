The billing service has written two log streams since 2009. Both record the same events. One is plain: timestamp, account, amount, result. The other repeats each line with a rendered message, expanded fields, and a severity label. Nobody planned two streams; the second was added for a dashboard that was retired in 2014, and never turned off.

Two problems came up. The streams have drifted: about 3% of lines in the verbose stream no longer match the plain one, mostly rounding in the rendered amount. And storage: the verbose stream is 2.6 times the size of the plain one, at roughly $1,900 a month.

We are not deleting the verbose stream yet. Four downstream reports still read it, and two of them cannot read the plain format without work. Cutting it now would break them.

The plain stream is the system of record. Where the two disagree, the plain stream is correct; the verbose stream is derived, and should never have been trusted for amounts.

Remaining work: point the four reports at the plain stream, confirm no reader is left on the verbose one for thirty days, then stop writing it and expire the old data. The migration flag stays until all four reports are moved.
