"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import type { CoverageSummary } from "./coverage-types";
import { useLandingCopy } from "./landing-copy-client";
import styles from "./ExpungementHomeV3.module.css";

function format(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (value, [key, replacement]) => value.replaceAll(`{${key}}`, String(replacement)),
    template
  );
}

export function CoverageMatrix({ summaries }: { summaries: CoverageSummary[] }) {
  const copy = useLandingCopy();
  const { locale } = useLocalization();
  const [selectedCode, setSelectedCode] = useState("PA");
  const matrixRef = useRef<HTMLDivElement>(null);
  const selected = summaries.find((summary) => summary.code === selectedCode) ?? summaries[0];
  const selectedName = locale === "es" ? selected.nameEs : selected.name;
  const selectedTopics = selected.topics.map((topic) => topic[locale]);

  function selectAt(index: number) {
    const summary = summaries[index];
    if (!summary) return;
    matrixRef.current?.querySelector<HTMLButtonElement>(`button[data-state-code="${summary.code}"]`)?.focus();
    setSelectedCode(summary.code);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const columns = getComputedStyle(matrixRef.current ?? event.currentTarget).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
    let target = index;
    if (event.key === "ArrowLeft") target = Math.max(0, index - 1);
    else if (event.key === "ArrowRight") target = Math.min(summaries.length - 1, index + 1);
    else if (event.key === "ArrowUp") target = Math.max(0, index - columns);
    else if (event.key === "ArrowDown") target = Math.min(summaries.length - 1, index + columns);
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = summaries.length - 1;
    else return;
    event.preventDefault();
    selectAt(target);
  }

  return (
    <div className={styles.coverageLayout}>
      <article
        key={selected.code}
        className={styles.stateExplorer}
        data-coverage-state={selected.code}
        data-question-count={selected.questionCount}
        aria-labelledby="coverage-state-heading"
      >
        <header>
          <span>{copy("coverage_reference_label")}</span>
          <strong>{selectedName} <b>{selected.code}</b></strong>
        </header>
        <div className={styles.stateExplorerBody}>
          <h3 id="coverage-state-heading">{format(copy("coverage_guided_heading"), { state: selectedName })}</h3>
          <p className={styles.stateQuestionCount}>{format(copy("coverage_question_count"), { count: selected.questionCount })}</p>
          <h4>{copy("coverage_topics_heading")}</h4>
          <ul data-coverage-topics="true">
            {selectedTopics.map((topic) => <li key={topic}>{topic}</li>)}
          </ul>
          <Link className={styles.stateCheckLink} href={`/expungement-ai/screening/${selected.code.toLowerCase()}`} prefetch={false}>
            {format(copy("coverage_start_state"), { state: selectedName })}<i aria-hidden="true" />
          </Link>
        </div>
        <footer>
          <p>{copy("coverage_no_account")}</p>
          <p>{copy("coverage_packet_boundary")}</p>
        </footer>
      </article>
      <div ref={matrixRef} className={styles.coverageMatrix} role="listbox" aria-label={copy("coverage_matrix_label")}>
        {summaries.map((summary, index) => {
          const active = selected.code === summary.code;
          const name = locale === "es" ? summary.nameEs : summary.name;
          return (
            <button
              key={summary.code}
              type="button"
              role="option"
              aria-label={active ? `${name}, ${copy("coverage_selected")}` : name}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              data-state-code={summary.code}
              data-selected={active ? "true" : "false"}
              onClick={() => setSelectedCode(summary.code)}
              onKeyDown={(event) => handleGridKeyDown(event, index)}
            >
              {summary.code}
            </button>
          );
        })}
      </div>
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {format(copy("coverage_selected_announcement"), { state: selectedName, count: selected.questionCount })}
      </p>
    </div>
  );
}
