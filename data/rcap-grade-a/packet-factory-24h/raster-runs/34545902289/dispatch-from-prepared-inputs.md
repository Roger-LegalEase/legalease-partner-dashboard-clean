# Hawaii exact-input dispatch

Run this in the integration checkout with an Actions-write credential. It sends only the four supported workflow inputs from the existing prepared JSON, so the long family list is never copied from a truncated message. Captain has not executed this dispatch.

```bash
python3 - <<'PYDISPATCH'
import json, subprocess
p = "data/rcap-grade-a/packet-factory-24h/raster-runs/34542054952/prepared-inputs.json"
x = json.load(open(p))
keys = ("commit_sha", "raster_manifest_path", "family_batch", "requested_scale")
assert len(x["commit_sha"]) == 40
assert len(x["family_batch"].split(",")) == 5
subprocess.run(["gh", "workflow", "run", "rcap-packet-raster-acceptance-batch.yml", "--repo", "Roger-LegalEase/legalease-partner-dashboard-clean", "--ref", "claude/legalease-sprint-captain-utucnw", "--json"], input=json.dumps({k:x[k] for k in keys}), text=True, check=True)
PYDISPATCH
```

The previous failures retained the correct commit but omitted the route manifest and truncated the family list. Re-running either failed run repeats those incorrect inputs. Start a new dispatch with the exact input object above.
