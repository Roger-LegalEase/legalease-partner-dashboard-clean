# Missouri native-packet discovery repair

Family: `mo-610-145-mistaken-identity-set`.
Inspected Captain: `a25db5034ab8ff3ed1466fa8028c63d0558e809d`.
Shared reader Git blob: `95f695c83c6d6a0cb110d82075b4abf5b49452a4`.

## Delivered

A 3,215-byte source-specific discovery helper, 17 passing Node checks, and a guarded two-edit installer. No packet, source, map, counter, verdict, registry, active Captain file, workflow, or production setting is changed by these additive commits. The shared reader is not yet wired: its owner must apply the supplied integration after reviewing current preimages.

The current reader's `looksBuilt` returns false without a `fixtures/` directory. This family instead declares its root-level `.packet.pdf` files in `packet-manifest.json` and `reports/rendered-artifacts.json`. The existing archive contains 13 selected outputs and 108 declared pages. Discovery must not require moving, duplicating or regenerating those packets.

The helper recognizes only this exact family/path. It checks approval/map/manifest/report family identity, unique declared variant identities and paths, matching inventories and digests, actual PDF bytes, and refuses symlinks, unsafe paths, malformed metadata, missing files and mismatches. This establishes discoverability only. It does not prove full required-variant coverage, current source authority, correct field contents, visual quality, full completeness or terminal status. The existing audit and independent acceptance must still decide those.

## Actual execution

- 17 Node tests passed; 0 failed/skipped. The exact observed old/new `looksBuilt` fragments were exercised against the actual retained candidate, not a fake PDF stand-in for Missouri. Old fragment returned false; corrected fragment returned true. Unrelated fixture-folder discovery stayed unchanged.
- All 77 original retained family files were rehashed and preserved. All 13 selected PDF digests matched their manifest. No PDF renderer or new packet review ran.
- 10 installer/transform checks passed: exact-fragment transformation/reversal and refusals; production CLI whole-source mismatch rejection; synthetic-wrapper install/repeat; helper mismatch; and preservation of a pre-existing staging file. Filesystem-installation checks use a disclosed test-only in-memory pin for the synthetic wrapper. The distributed CLI retains its fixed real-reader blob pin.
- The full current shared reader was NOT materialized or executed locally. No full-reader application/replay, all-nine-zero result, successful integrated matrix, independent review or restored admission is claimed.

Source archive: Drive `1gYyezv75mo6Dli4ppPvqMI5hDiEv_fKe`, 22,788,146 bytes, SHA-256 `5047604c25a4ce266a788c7f5b16303cc729565a8baa657b6399f9fd9d27996b`.

The retained manifest and report were compared to actual GitHub file identities at the Captain anchor:
- `packet-manifest.json`: Git blob `dc35068b83b59b0c6a873eac97252ecf0b2b91c1`.
- `reports/rendered-artifacts.json`: Git blob `c77d2a68896061362da8005459ef18c915a29c5a`.
Both match the locally rehashed archive member exactly. This is not a claim of independently downloading every current remote PDF.

Executed code identities:
- Helper Git blob `46110bd80e3660ad5b09ac983e420d5c0f000e00`; SHA-256 `d191540ad145e9b0aad1c4fabcb41de0c25141e95c4a14aad6eb20fa37d69c2e`.
- Node tests Git blob `a04038cd32fe961a8616713deb65aa5a12a29a0f`; SHA-256 `50734f10fde1732aa9db2b2914bf499083712921987d8a79dec2e42d15b3d806`.
- Installer Git blob `5f752c1c1747d3a30677c1ab6546189a0098064f`; SHA-256 `a99aa5154eef9eb539571eba4f239d91b1d8de97a516970d95ffdb1da1a9f26a`.

## Captain integration

Reconcile current ownership before touching the shared reader. Reuse a newer equivalent correction if already installed; do not overwrite or reset Captain. In an isolated task worktree with these additive files and the actual candidate:

```sh
python3 scripts/rcap-packet-recovery/chat1/apply-mo-native-discovery.py --root "$PWD"
python3 scripts/rcap-packet-recovery/chat1/apply-mo-native-discovery.py --root "$PWD" --apply
MO_DISCOVERY_REPO="$PWD" node --test scripts/rcap-packet-completeness/test-mo-declared-packet-discovery.mjs
node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family mo-610-145-mistaken-identity-set
```

The installer requires the exact observed whole-reader Git blob, preserves every byte except the import and missing-fixture fallback, and refuses changed or symlinked preimages. Unexpected successor code needs deliberate reconciliation, not weakening that pin. Do not treat the command's exit code alone as a completeness PASS; read the actual audit result and counters.

After the full existing audit and appropriate engineering review pass, refresh the aggregate through its existing scoped/merge-preserving procedure. Do not overwrite the national matrix with a one-family `--write` or rerender unchanged packets. Consume valid existing source/visual/independent/raster evidence only where it remains bound to the exact inputs. Derive any terminal delta normally. No state should be manually restored by this repair.
