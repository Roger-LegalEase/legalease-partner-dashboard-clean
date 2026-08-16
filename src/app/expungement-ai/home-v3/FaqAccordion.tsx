"use client";

import { useState } from "react";
import { useLandingCopy } from "./landing-copy-client";
import styles from "./ExpungementHomeV3.module.css";

const faqItems = [
  ["legit", "fq_q0", "fq_a0"],
  ["lawyer", "fq_q1", "fq_a1"],
  ["state", "fq_q2", "fq_a2"],
  ["price", "fq_q3", "fq_a3"],
  ["denial", "fq_q4", "fq_a4"],
  ["information", "fq_q5", "fq_a5"],
  ["law-firm", "fq_q6", "fq_a6"]
] as const;

export function FaqAccordion() {
  const copy = useLandingCopy();
  const [open, setOpen] = useState<(typeof faqItems)[number][0] | null>("legit");

  return (
    <div className={styles.faqList}>
      {faqItems.map(([id, questionKey, answerKey], index) => {
        const expanded = open === id;
        const panelId = `homepage-v3-faq-${id}`;
        return (
          <div key={id} className={styles.faqItem} data-open={expanded ? "true" : "false"}>
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : id)}
              >
                <span aria-hidden="true">0{index + 1}</span>
                <strong>{copy(questionKey)}</strong>
                <i aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} className={styles.faqAnswer} aria-hidden={!expanded}>
              <div>
                <p>{copy(answerKey)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
