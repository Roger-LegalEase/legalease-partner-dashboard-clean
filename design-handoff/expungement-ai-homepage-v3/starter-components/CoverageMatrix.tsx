"use client";

import { useState } from "react";
import styles from "./CoverageMatrix.module.css";

const jurisdictions = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"] as const;

const names: Record<(typeof jurisdictions)[number], string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"
};

type Jurisdiction = (typeof jurisdictions)[number];

type CoverageMatrixProps = {
  initial?: Jurisdiction;
  onSelect?: (jurisdiction: Jurisdiction) => void;
};

export function CoverageMatrix({ initial = "PA", onSelect }: CoverageMatrixProps) {
  const [selected, setSelected] = useState<Jurisdiction>(initial);
  const choose = (code: Jurisdiction) => { setSelected(code); onSelect?.(code); };

  return (
    <section className={styles.layout}>
      <article className={styles.reference} aria-live="polite">
        <header><strong>{names[selected]} at a glance</strong><span>Reference panel</span></header>
        <dl>
          <div><dt>What the check looks at</dt><dd>Record type, case outcome, timing, and the rules used for the selected jurisdiction.</dd></div>
          <div><dt>Packet availability</dt><dd>A supported self-help packet depends on the guided-check result and the court involved.</dd></div>
          <div><dt>Filing fees</dt><dd>Court fees and fee-waiver steps vary. Show verified details separately when available.</dd></div>
        </dl>
      </article>
      <div className={styles.matrix} role="group" aria-label="Choose a state or the District of Columbia">
        {jurisdictions.map(code => (
          <button
            key={code}
            type="button"
            className={selected === code ? styles.active : undefined}
            aria-pressed={selected === code}
            aria-label={names[code]}
            onClick={() => choose(code)}
          >{code}</button>
        ))}
      </div>
    </section>
  );
}
