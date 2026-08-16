"use client";

import { useState } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { useLandingCopy } from "./landing-copy-client";
import styles from "./ExpungementHomeV3.module.css";

const jurisdictions = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"] as const;
type Jurisdiction = (typeof jurisdictions)[number];

const names: Record<Jurisdiction, { en: string; es: string }> = {
  AL:{en:"Alabama",es:"Alabama"},AK:{en:"Alaska",es:"Alaska"},AZ:{en:"Arizona",es:"Arizona"},AR:{en:"Arkansas",es:"Arkansas"},CA:{en:"California",es:"California"},CO:{en:"Colorado",es:"Colorado"},CT:{en:"Connecticut",es:"Connecticut"},DE:{en:"Delaware",es:"Delaware"},DC:{en:"District of Columbia",es:"Distrito de Columbia"},FL:{en:"Florida",es:"Florida"},GA:{en:"Georgia",es:"Georgia"},HI:{en:"Hawaii",es:"Hawái"},ID:{en:"Idaho",es:"Idaho"},IL:{en:"Illinois",es:"Illinois"},IN:{en:"Indiana",es:"Indiana"},IA:{en:"Iowa",es:"Iowa"},KS:{en:"Kansas",es:"Kansas"},KY:{en:"Kentucky",es:"Kentucky"},LA:{en:"Louisiana",es:"Luisiana"},ME:{en:"Maine",es:"Maine"},MD:{en:"Maryland",es:"Maryland"},MA:{en:"Massachusetts",es:"Massachusetts"},MI:{en:"Michigan",es:"Míchigan"},MN:{en:"Minnesota",es:"Minnesota"},MS:{en:"Mississippi",es:"Misisipi"},MO:{en:"Missouri",es:"Misuri"},MT:{en:"Montana",es:"Montana"},NE:{en:"Nebraska",es:"Nebraska"},NV:{en:"Nevada",es:"Nevada"},NH:{en:"New Hampshire",es:"Nuevo Hampshire"},NJ:{en:"New Jersey",es:"Nueva Jersey"},NM:{en:"New Mexico",es:"Nuevo México"},NY:{en:"New York",es:"Nueva York"},NC:{en:"North Carolina",es:"Carolina del Norte"},ND:{en:"North Dakota",es:"Dakota del Norte"},OH:{en:"Ohio",es:"Ohio"},OK:{en:"Oklahoma",es:"Oklahoma"},OR:{en:"Oregon",es:"Oregón"},PA:{en:"Pennsylvania",es:"Pensilvania"},RI:{en:"Rhode Island",es:"Rhode Island"},SC:{en:"South Carolina",es:"Carolina del Sur"},SD:{en:"South Dakota",es:"Dakota del Sur"},TN:{en:"Tennessee",es:"Tennessee"},TX:{en:"Texas",es:"Texas"},UT:{en:"Utah",es:"Utah"},VT:{en:"Vermont",es:"Vermont"},VA:{en:"Virginia",es:"Virginia"},WA:{en:"Washington",es:"Washington"},WV:{en:"West Virginia",es:"Virginia Occidental"},WI:{en:"Wisconsin",es:"Wisconsin"},WY:{en:"Wyoming",es:"Wyoming"}
};

export function CoverageMatrix() {
  const copy = useLandingCopy();
  const { locale } = useLocalization();
  const [selected, setSelected] = useState<Jurisdiction>("PA");
  const selectedName = names[selected][locale];

  return (
    <div className={styles.coverageLayout}>
      <article className={styles.stateReference} aria-live="polite" aria-atomic="true">
        <header>
          <span>{copy("coverage_reference_label")}</span>
          <strong>{selectedName} {copy("coverage_glance_suffix")}</strong>
        </header>
        <dl>
          <div><dt>{copy("coverage_check_label")}</dt><dd>{copy("coverage_check_body")}</dd></div>
          <div><dt>{copy("coverage_packet_label")}</dt><dd>{copy("coverage_packet_body")}</dd></div>
          <div><dt>{copy("coverage_fees_label")}</dt><dd>{copy("coverage_fees_body")}</dd></div>
        </dl>
      </article>
      <div className={styles.coverageMatrix} role="group" aria-label={copy("coverage_matrix_label")}>
        {jurisdictions.map((code) => {
          const active = selected === code;
          return (
            <button
              key={code}
              type="button"
              aria-label={names[code][locale]}
              aria-pressed={active}
              data-selected={active ? "true" : "false"}
              onClick={() => setSelected(code)}
            >
              {code}
              {active ? <span className={styles.srOnly}>{copy("coverage_selected")}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
