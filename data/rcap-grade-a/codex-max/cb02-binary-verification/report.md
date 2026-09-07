# CB02 six-artifact binary promotion proof

## Verdict

`BINARY_PROMOTION_REPAIR_REQUIRED`

The requested proof cannot be performed from this checkout. The supplied
minimum ancestor `34ca308af92db091f0e702aff43f7b69de47652a` is not present as a
Git object, while the observed checkout is branch `work` at
`d95f5612af1df4081e5178195086c415d7c2693e`. No CB02 generator,
binary-artifact manifest, or set of three candidate hash files exists in the
tree.

The committed launch-control record is explicit that CB02 had no published
candidate bytes and directs verifiers not to create, infer, or reserve CB02
paths. Accordingly, this proof does not guess input or output paths, synthesize
hash expectations, or generate substitute PDFs.

## Results

| Gate | Result |
| --- | --- |
| Six expected PDFs located | FAIL (0/6) |
| Two clean builds | NOT RUN — generator absent |
| Identical paths and bytes | NOT ESTABLISHED |
| Hash matches | 0/6 |
| Length matches | 0/6 |
| Page-count matches | 0/6 |
| Candidate identity parsed | 0/6 |
| Canonical/boundary distinction explained | NOT ESTABLISHED |
| Promotion script run | NO |
| Binary files added | 0 |
| Commercial routes opened | 0 |
| Production touched | NO |

## Fail-closed promotion script

`promote-cb02-binaries.sh` is text-only and repository-connected. It reads the
committed verification proof and emits a machine-readable refusal receipt to
standard error while the verdict is repair-required. It installs nothing and
does not contain or alter candidate legal text. The script must not be made
operative by inventing paths: rerun the assignment on the actual CB02 branch,
replace the repair proof with measurements from two clean builds, and bind the
script to the real committed generator and six manifest destinations.

## Required repair

Provide a checkout containing the supplied minimum ancestor and actual CB02
candidate commit. Then read the real generator, manifest, and all three hash
files; build into two independent temporary roots; compare relative paths,
bytes, SHA-256 values, byte lengths, and parsed page counts; parse each PDF for
candidate identity; and record the fixture-backed reason each canonical output
differs from its boundary output. Only those measured facts can support
`BINARY_PROMOTION_READY`.
