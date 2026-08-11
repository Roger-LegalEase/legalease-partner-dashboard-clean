# Official-source jobs — 3 open

Derived from `data/rcap-ledger/track-pathway-crosswalk.json` on every run. 3 unresolved subjects remain: `PA:path-k-human-trafficking-vacatur-expungement`, `SC:human-trafficking-survivor-expungement`, `MD:md_pardon_expungement`.

## PA — `path-k-human-trafficking-vacatur-expungement`

| Field | Value |
| --- | --- |
| Job kind | official_retrieval |
| Jurisdiction | PA |
| Pathway ID | `path-k-human-trafficking-vacatur-expungement` |
| Expected primary authority | 18 Pa.C.S. § 3019 |
| Authority scope | Within 18 Pa.C.S. ch. 30. The operative vacatur/expungement provision itself — a definitions or penalties section of ch. 30 does not close this. |
| Issuing body | Pennsylvania General Assembly, via the Legislative Reference Bureau |
| Required official text or form | Verbatim statutory text of the human-trafficking victim vacatur/expungement remedy: who may petition, for which offences, on what showing, and what relief the court orders. Any official petition form referenced by the section. |
| Repository destination | private/Nationwide Record Clearing/Pennsylvania/statutes/18-pacs-3019.(txt|pdf) with the citation recorded in src/lib/rcap/state-packs/pennsylvania/ |
| Source receipt | docs/record-clearing/source-receipts/PA-18-pacs-3019.md — retrieval URL, retrieval date, issuing body, and the SHA-256 of the committed file |
| Owner | external-retrieval lane (outbound access or law-library access required) |
| Stop condition | The committed text states the vacatur/expungement remedy operatively, OR the retrieved chapter is shown to contain no such remedy. A proven absence closes this as a crosswalk terminal classification just as well as a proven text. |
| Effect on Milestone 1 item 2 | Closes one of the two remaining pathway blockers, and closes the PA surplus — Pennsylvania is the only jurisdiction of seven whose compiled surplus is not fully explained, and this pathway is the reason. |

**Research exhaustion.** Repository-only research is already recorded as exhausted for this subject. Do not re-run it; every coding terminal in this sprint is egress-blocked to legislative hosts.

**Official sources.** `https://www.legis.state.pa.us — Pa. Consolidated Statutes, Title 18, ch. 30` · `https://www.palegis.us statute browser`

## SC — `human-trafficking-survivor-expungement`

| Field | Value |
| --- | --- |
| Job kind | official_retrieval |
| Jurisdiction | SC |
| Pathway ID | `human-trafficking-survivor-expungement` |
| Expected primary authority | S.C. Code § 16-3-2020 |
| Authority scope | Title 16, ch. 3. The section must be shown to grant or withhold record relief. |
| Issuing body | South Carolina Legislative Council |
| Required official text or form | Verbatim text of the trafficking-survivor relief provision, including any expungement or vacatur remedy it grants and the conditions on it. Any official form the section names. |
| Repository destination | private/Nationwide Record Clearing/South Carolina/statutes/sc-code-16-3-2020.(txt|pdf) with the citation recorded in src/lib/rcap/state-packs/south-carolina/ |
| Source receipt | docs/record-clearing/source-receipts/SC-16-3-2020.md — retrieval URL, retrieval date, issuing body, and the SHA-256 of the committed file |
| Owner | external-retrieval lane (outbound access or law-library access required) |
| Stop condition | The committed text grants record relief, OR § 16-3-2020 is shown to be definitional or penal only. Either outcome closes the obligation; the second closes it as a crosswalk terminal classification. |
| Effect on Milestone 1 item 2 | Closes the second of the two remaining pathway blockers. No committed source contains this section, so the current conclusion rests on an unverifiable citation. |

**Research exhaustion.** Repository-only research is already recorded as exhausted for this subject. Do not re-run it.

**Official sources.** `https://www.scstatehouse.gov — S.C. Code of Laws, Title 16, ch. 3` · `South Carolina Legislative Council code browser`

## MD — `md_pardon_expungement`

| Field | Value |
| --- | --- |
| Job kind | source_materialization |
| Jurisdiction | MD |
| Track ID | `md_pardon_expungement` |
| Expected primary authority | Md. Code, Crim. Proc. § 10-105(a)(8) and § 10-105(c)(4) |
| Authority scope | Already committed and cited in the registry projection. This job needs no retrieval — the gap is in the compiled runtime, not in the authority. |
| Issuing body | Maryland General Assembly (statute already held); Maryland Judiciary for the petition form |
| Required official text or form | The current Maryland petition form for expungement after a full and unconditional pardon, plus confirmation of the filing route. The statutory text is already committed. |
| Repository destination | A new top-level pathway in src/lib/rcap-engine/compiled/profiles/MD-maryland.json representing the § 10-105(a)(8) pardon route, with orderedDecisionRules rule-11-full-and-unconditional-governor-pardon-10-105-route-onl repointed at it. |
| Source receipt | docs/record-clearing/source-receipts/MD-10-105-pardon-pathway.md — form identifier, revision date, and the profile commit that adds the pathway |
| Owner | compiled-profile build lane (MD) |
| Stop condition | A pardoned-conviction participant is routed to a pathway that represents the § 10-105(a)(8) remedy, and the canonical generator classifies md_pardon_expungement as exact_current_pathway without a captain override. |
| Effect on Milestone 1 item 2 | Closes the one remaining registry-track blocker. Until then md_pardon_expungement stays unresolved by captain decision rather than being absorbed into missing_from_compiled_runtime. |

**Research exhaustion.** Not a research task at all. The MD profile was read directly: seven top-level pathways, none covering pardon, and rule-11 routes pardon applicants to four pathways that are not pardon-expungement vehicles.

**Official sources.** `https://mdcourts.gov/legalhelp/expungement — Maryland Judiciary expungement forms`
