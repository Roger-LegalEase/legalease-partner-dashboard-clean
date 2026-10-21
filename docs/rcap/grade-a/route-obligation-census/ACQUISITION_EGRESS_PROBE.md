# Acquisition Egress Probe — Route Obligation Census V1

**Probe date (UTC):** 2026-08-30T00:09:29Z – 2026-08-30T00:09:31Z
**Probe agent:** RCAP official-source acquisition probe
**Branch:** `claude/census-v1-acquisition-probe`
**Base:** `claude/legalease-sprint-captain-utucnw`
**Environment label under test:** "trusted network access"

## VERDICT

**EGRESS_REFUSED**

This environment does **not** reach official court or agency sources. The
"trusted network access" label does not correspond to actual reachability of
issuing-authority hosts. Acquisition (Step 2) was **not attempted**. No source
was acquired. No mirror, proxy, cache, or aggregator was used as a workaround.

## Raw results

Method: `curl -sS -o /dev/null -L --max-time 45 -w "%{http_code}"`, default
session proxy configuration (`HTTPS_PROXY=http://127.0.0.1:33971`, CA bundle
`/root/.ccr/ca-bundle.crt`). `http_code=000` means no HTTP response was ever
received — the CONNECT tunnel was refused before any request was sent.

| URL | HTTP status | Transport result |
| --- | --- | --- |
| https://www.courts.oregon.gov/ | `000` | `curl (56) CONNECT tunnel failed, response 403` |
| https://www.azcourts.gov/ | `000` | `curl (56) CONNECT tunnel failed, response 403` |
| https://www.courts.ca.gov/ | `000` | `curl (56) CONNECT tunnel failed, response 403` |
| https://example.com | `000` | `curl (56) CONNECT tunnel failed, response 403` |
| https://registry.npmjs.org/ | `200` | OK |
| https://www.uscourts.gov/ | `000` | `curl (56) CONNECT tunnel failed, response 403` |
| https://www.oregon.gov/ | `000` | `curl (56) CONNECT tunnel failed, response 403` |

The last two hosts were added beyond the required five to confirm the denial is
categorical across issuing authorities (federal judiciary, state government)
rather than specific to one host.

## Corroborating diagnostics

These rule out the benign explanations. They were run to characterise the
denial, not to circumvent it.

1. **The egress gateway itself is alive and selectively permissive.** Forcing
   `registry.npmjs.org` explicitly through the policy gateway
   (`NO_PROXY` cleared, `-x http://127.0.0.1:33971`) returns `http_code=200`.
   The gateway is working; it allows package registries and denies court and
   agency hosts. This is a policy decision, not an outage.

2. **Not a DNS failure.** `getent hosts www.courts.oregon.gov` resolves to
   `206.16.21.81 (or-prd-sp.oregon-gl.com)`. The name resolves; the connection
   is refused at the policy layer.

3. **Not merely a proxy configuration artifact.** A direct attempt bypassing
   the proxy entirely (`curl --noproxy '*' https://www.courts.oregon.gov/`)
   also returns `403`. There is no unproxied path to these hosts either.

4. **Gateway-side denial log.** `http://127.0.0.1:33971/__agentproxy/status`
   recorded, for each blocked host:

   ```
   kind:   "connect_rejected"
   detail: "gateway answered 403 to CONNECT (policy denial or upstream failure)"
   hosts:  www.courts.oregon.gov:443, www.azcourts.gov:443,
           www.courts.ca.gov:443, example.com:443
   ```

## Consequence for the census

`data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json`
carries 295 acquisition tasks:

| custodyClass | rows |
| --- | --- |
| SOURCE_ALREADY_HELD | 57 |
| SOURCE_REVISION_STALE | 0 |
| SOURCE_IDENTITY_UNRESOLVED | 166 |
| SOURCE_GENUINELY_MISSING | 72 |

The 72 `SOURCE_GENUINELY_MISSING` rows remain **unacquired and unattempted**.
Nothing about their status changed as a result of this probe. Zero sources were
retrieved; zero hashes were computed; no acquisition evidence file was produced,
because there is no acquisition evidence to record.

## What this means

Official-source acquisition for Route Obligation Census V1 cannot be performed
from any environment under the current egress policy. Both the Captain's
environment and this one — the environment specifically labelled as having
trusted network access — refuse the same hosts with the same gateway 403.

Acquisition is blocked pending an egress policy change that allows the issuing
authorities' own domains. Per the session proxy's operating guidance, a policy
denial is reported, not retried and not routed around. Obtaining these documents
via any non-authoritative copy would defeat the purpose of a custody
reconciliation, so no such copy was sought.

## Reproduction

```sh
for u in https://www.courts.oregon.gov/ https://www.azcourts.gov/ \
         https://www.courts.ca.gov/ https://example.com \
         https://registry.npmjs.org/; do
  echo "$u => $(curl -sS -o /dev/null -L --max-time 45 -w '%{http_code}' "$u" 2>&1)"
done
```
