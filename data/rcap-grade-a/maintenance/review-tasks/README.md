# Source-change review tasks

`<date>-<sourceId>.json` files land here **only through a person's reviewed
commit**. The nightly source monitor
(`.github/workflows/rcap-nightly-source-monitor.yml`) writes candidate review
tasks into its run artifact and opens a `source-change-review` issue; workflows
never commit into this directory.

A review task records an observation — a pinned official source changed or
vanished — plus the routes derived to use it. It approves nothing, invalidates
nothing, and places no hold. The response procedure is
`docs/rcap/EVERGREEN_ROUTE_MAINTENANCE.md`; holds go in
`../route-holds.json` and are verified by
`scripts/verify-rcap-route-holds.mjs`.
