# CB02 binary promotion

The six CB02 fixture PDFs are intentionally absent from this pull request because Codex PR creation does not support newly added binary files. The candidate legal work, templates, instructions, checklists, ledgers, completeness reports, deterministic renderer, and expected artifact identities remain committed as text. Nothing was discarded.

## Regeneration

From the repository root, run:

```sh
node scripts/codex-5h/cb02-custom-pleadings/build.mjs
```

The command generates one canonical and one boundary PDF for each of the three candidate families. Before committing them, compare all six files byte-for-byte with `data/rcap-grade-a/codex-5h/cb02-custom-pleadings/binary-artifact-manifest.json`. The expected SHA-256 values are:

| Candidate | Role | SHA-256 |
| --- | --- | --- |
| `cb02-al-ajic-de-novo-review` | canonical | `c2a7ecbb8d5278bd91a372207c995a2c5a7708afaa96166df54dfa0494bc8672` |
| `cb02-al-ajic-de-novo-review` | boundary | `3803ee4bc41f16276e08909a12cb9525147d4d53e52c49413a49b9a1144966f6` |
| `cb02-ny-160-55-legacy-1` | canonical | `117659003db3316ac52e2fe5f3baee95d4da9b22b7cadbd8ed1d8de49c439c1a` |
| `cb02-ny-160-55-legacy-1` | boundary | `78c5c6ebab6af0e68fbf8e5475d4a58074ae13f0bbbe46b81cb502d81259c7b4` |
| `cb02-ny-160-55-legacy-2` | canonical | `b546b6fd6b9c5d46573aac905ad4b40fb80c84ae0a5c892784e2e1844f600dce` |
| `cb02-ny-160-55-legacy-2` | boundary | `09c75578de47379b737500136646deeeb34784ba9755effd7e1a2a37f606fd9d` |

These remain noncanonical candidates with no commercial or filing authority. No candidate may advance to raster review or independent verification until a repository-connected promotion owner regenerates all six files and proves exact SHA-256 equality with the manifest.
