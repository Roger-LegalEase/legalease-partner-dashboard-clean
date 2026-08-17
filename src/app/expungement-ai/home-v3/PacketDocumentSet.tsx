"use client";

import { useState } from "react";
import { useLandingCopy } from "./landing-copy-client";
import styles from "./ExpungementHomeV3.module.css";

const documents = [
  ["petition", "pc_h0", "pc_p0"],
  ["proposed-order", "pc_h1", "pc_p1"],
  ["filing-checklist", "pc_h2", "pc_p2"],
  ["court-instructions", "pc_h4", "pc_p4"],
  ["fee-waiver", "pc_h3", "pc_p3"]
] as const;

export function PacketDocumentSet() {
  const copy = useLandingCopy();
  const [selected, setSelected] = useState<(typeof documents)[number][0]>("petition");
  const selectedDocument = documents.find(([id]) => id === selected) ?? documents[0];

  return (
    <div className={styles.documentSet}>
      <div className={styles.documentLayers} role="group" aria-label={copy("document_set_label")}>
        {documents.map(([id, titleKey], index) => {
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              className={styles.documentLayer}
              data-selected={active ? "true" : "false"}
              aria-pressed={active}
              onClick={() => setSelected(id)}
            >
              <span className={styles.documentNumber} aria-hidden="true">0{index + 1}</span>
              <strong>{copy(titleKey)}</strong>
              <span className={styles.syntheticLines} aria-hidden="true"><i /><i /><i /></span>
              <span className={styles.documentTerminus} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className={styles.documentExplanation} aria-live="polite" aria-atomic="true">
        <span>{copy("document_selected_label")}</span>
        <strong>{copy(selectedDocument[1])}</strong>
        <p>{copy(selectedDocument[2])}</p>
      </div>
    </div>
  );
}
