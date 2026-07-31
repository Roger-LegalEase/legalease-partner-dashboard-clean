Branch: fix/platform-document-delivery-core
Accepted checkpoint: 99e26db
Latest required correction: explicit composed-route selection; never choose first available stage.
Batch 1 status: 117 expected, 84 imported, 6 deferred, 90 accounted, 27 outstanding.
Remaining: California 13, Connecticut 14.
All imported tracks runtime_disabled. Deferred tracks unreachable. Batch 2 untouched.

Next work:
1. Implement bounded composed-route selection correction.
2. Normalize California completely and commit.
3. Normalize Connecticut completely and commit.
4. Run final Batch 1 reconciliation and gates.

Use the full continuation prompt supplied by Roger in the prior session.
Do not reopen Arkansas except for the focused composed-route resolver correction.
