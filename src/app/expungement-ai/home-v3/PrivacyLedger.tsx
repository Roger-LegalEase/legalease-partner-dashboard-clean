"use client";

import { useState } from "react";
import { useLandingCopy } from "./landing-copy-client";
import styles from "./ExpungementHomeV3.module.css";

const practices = [
  ["begin", "pv0", "pv0_detail"],
  ["payment", "pv1", "pv1_detail"],
  ["policy", "pv2", "pv2_detail"],
  ["choice", "pv3", "pv3_detail"],
  ["sale", "pv4", "pv4_detail"],
  ["support", "pv5", "pv5_detail"]
] as const;

export function PrivacyLedger() {
  const copy = useLandingCopy();
  const [selected, setSelected] = useState<(typeof practices)[number][0]>("begin");
  const practice = practices.find(([id]) => id === selected) ?? practices[0];

  return (
    <div className={styles.privacyLedger}>
      <div className={styles.privacyRows} role="group" aria-label={copy("privacy_practices_label")}>
        {practices.map(([id, labelKey], index) => (
          <button
            key={id}
            type="button"
            aria-pressed={selected === id}
            data-selected={selected === id ? "true" : "false"}
            onClick={() => setSelected(id)}
          >
            <span aria-hidden="true">0{index + 1}</span>
            <strong>{copy(labelKey)}</strong>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className={styles.privacyExplanation} aria-live="polite" aria-atomic="true">
        <span>{copy("privacy_practice_label")}</span>
        <strong>{copy(practice[1])}</strong>
        <p>{copy(practice[2])}</p>
      </div>
    </div>
  );
}
