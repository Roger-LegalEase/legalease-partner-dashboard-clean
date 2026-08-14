# Handoff — Application to expunge (§ 17C-5-2b(g))

Stage-two secondary filing. See the route-level `handoff.md` for the full picture.

- **Authority**: § 17C-5-2b(g) (the application), (g)(1) (the clock), (a),(b) (deferral predicate), and
  § 61-11-25(a) read with (g)(1) (the DMV limit the relief must respect).
- **Clock**: not less than one year, running from the *expiration of the term of probation*, not from the
  dismissal. Carried as counsel flag `wv-dui-deferral-probation-expiry-clock`, proven by the boundary
  fixture, and the reason the supporting timeline exists.
- **Hard bar**: any prior felony conviction bars this motion outright under (g)(1). The controlling review
  does not record the bar at all — the registry raises it as a counsel question. This route treats it as
  excluding stage two only. See `wv-dui-deferral-felony-bar-not-in-controlling-review`.
- **Relief scope**: stated in the subsection's own words *including its own DMV exception*, so the
  application can never read as asking for the driving record. `recordCustodianLead` is null — the section
  names no custodian, and the § 61-11-26 five-recipient service list is not imported.
- **Notice line**: rendered with the hearing date blank. A hearing happens only if objections are filed and
  the court sets the date. See `wv-dui-deferral-hearing-date-left-blank`.
- **Stop condition**: the court's finding on probation violations. If objections produce a hearing,
  automated assistance ends. See `wv-dui-deferral-probation-violation-hearing`.
- **Open release blocker carried but not resolved**: whether relief here counts against the § 61-11-26(o)
  once-per-lifetime limit. No participant copy answers it either way.
