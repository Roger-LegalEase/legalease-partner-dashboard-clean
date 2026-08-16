"use client";

import Image from "next/image";
import wilmaAvatar from "../../../../design-handoff/legalease-homepage/assets/wilma.png";
import { useLandingCopy } from "./landing-copy-client";
import styles from "./ExpungementHomeV3.module.css";

export function WilmaPreview() {
  const copy = useLandingCopy();

  return (
    <div
      className={styles.wilmaChat}
      data-wilma-conversation="true"
      aria-label={copy("wl_demo_aria")}
    >
      <header>
        <Image src={wilmaAvatar} alt="" width={52} height={52} sizes="52px" />
        <div><strong>Wilma</strong><span>{copy("wl_example")}</span></div>
      </header>
      <div className={styles.wilmaMessages}>
        <article className={styles.wilmaUserMessage} data-speaker="visitor">
          <span>{copy("wl_you")}</span>
          <p>{copy("wl_q")}</p>
        </article>
        <article className={styles.wilmaReply} data-speaker="wilma">
          <span>Wilma</span>
          <p>{copy("wl_a")}</p>
        </article>
      </div>
      <div className={styles.wilmaNote} data-wilma-footer="true">
        <strong>{copy("wl_illustrative")}</strong>
        <span>{copy("wl_safe")}</span>
      </div>
    </div>
  );
}
