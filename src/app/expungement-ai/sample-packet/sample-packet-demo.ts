// DEMO DATA ONLY — used exclusively by the "View sample packet" format preview.
//
// Nothing in this file is, or is derived from, a real user, a real matter, or a real
// packet job. It never touches packet generation, `packet_jobs`, Supabase, or payment.
// The persona ("Alex Rivera") and every case detail below are fabricated for illustration.
// Do NOT wire this into the live pipeline — it exists to show the FORMAT of a finished
// packet, not to produce a usable filing.

export const SAMPLE_BADGE = "SAMPLE — NOT A REAL PACKET";

export const samplePacketMatter = {
  petitioner: "Alex Rivera",
  caseNumber: "MC-51-CR-0004821-2019",
  court: "Philadelphia Municipal Court",
  judicialDistrict: "First Judicial District of Pennsylvania",
  county: "Philadelphia County, PA",
  offense: "Possession of a small amount of marijuana — 35 P.S. § 780-113(a)(31)",
  arrestDate: "March 14, 2019",
  disposition: "Dismissed / Nolle Prossed",
  dispositionDate: "August 2, 2019",
  pathway: "Petition for Expungement (Pa.R.Crim.P. 490 — non-conviction)"
} as const;

export type SamplePacketTab = {
  id: string;
  label: string;
  heading: string;
  // Each block renders as a labelled section inside the document body.
  blocks: Array<{ title?: string; lines: string[] }>;
};

export const samplePacketTabs: SamplePacketTab[] = [
  {
    id: "petition",
    label: "Petition",
    heading: "Petition for Expungement",
    blocks: [
      {
        lines: [
          "IN THE PHILADELPHIA MUNICIPAL COURT",
          "FIRST JUDICIAL DISTRICT OF PENNSYLVANIA — CRIMINAL DIVISION",
          ""
        ]
      },
      {
        title: "Caption",
        lines: [
          "Commonwealth of Pennsylvania",
          "        v.",
          `${samplePacketMatter.petitioner}, Petitioner`,
          `Case No. ${samplePacketMatter.caseNumber}`
        ]
      },
      {
        title: "Petition",
        lines: [
          `1. Petitioner, ${samplePacketMatter.petitioner}, respectfully petitions this Court to order the expungement of the criminal history record information described below.`,
          `2. On ${samplePacketMatter.arrestDate}, Petitioner was arrested and charged in the above-captioned matter with ${samplePacketMatter.offense}.`,
          `3. On ${samplePacketMatter.dispositionDate}, the charge was resolved by ${samplePacketMatter.disposition.toLowerCase()}. Petitioner was not convicted.`,
          "4. Because this matter ended without a conviction, Petitioner is eligible to seek expungement under Pa.R.Crim.P. 490 and 18 Pa.C.S. § 9122.",
          "WHEREFORE, Petitioner requests that this Court enter an Order directing expungement of the records in this matter."
        ]
      },
      {
        title: "Verification",
        lines: [
          "I verify that the statements made in this petition are true and correct to the best of my knowledge, information, and belief.",
          "",
          "_______________________________        Date: ____________",
          `${samplePacketMatter.petitioner}, Petitioner`
        ]
      }
    ]
  },
  {
    id: "filing-checklist",
    label: "Filing checklist",
    heading: "Your filing checklist",
    blocks: [
      {
        title: "Before you go",
        lines: [
          "☐ Sign and date the Petition and Verification.",
          "☐ Sign and date the Proposed Order (leave the judge's signature line blank).",
          "☐ Make 3 copies of the full packet — one for the court, one for the District Attorney, one for your records.",
          "☐ Bring a government-issued photo ID."
        ]
      },
      {
        title: "Where to file",
        lines: [
          `${samplePacketMatter.court} — Criminal Division, Clerk of Courts`,
          "1301 Filbert Street, Philadelphia, PA 19107",
          "File in the court that handled your case. If you have charges in more than one court, each court needs its own petition."
        ]
      },
      {
        title: "After you file",
        lines: [
          "☐ Ask the clerk to date-stamp your copy.",
          "☐ Serve a copy on the District Attorney's Office if the clerk does not.",
          "☐ Note any hearing date the clerk gives you.",
          "☐ Save your stamped copy in your Briefcase."
        ]
      }
    ]
  },
  {
    id: "fee-waiver",
    label: "Fee waiver",
    heading: "In Forma Pauperis (fee waiver) request",
    blocks: [
      {
        lines: [
          "If you cannot afford the filing fee, you can ask the court to waive it by filing a Petition to Proceed In Forma Pauperis (IFP) along with your expungement packet."
        ]
      },
      {
        title: "What to include",
        lines: [
          "☐ Completed IFP petition describing your income, expenses, and dependents.",
          "☐ A short statement that you cannot pay the filing fee without hardship.",
          "☐ Your signature and date."
        ]
      },
      {
        title: "Good to know",
        lines: [
          "Many courts waive or reduce the filing fee when a petitioner qualifies.",
          "Approval is up to the court — submitting an IFP request does not guarantee a waiver.",
          "If the waiver is denied, the clerk will tell you the amount due before your petition moves forward."
        ]
      }
    ]
  },
  {
    id: "court-instructions",
    label: "Court instructions",
    heading: "Court-specific instructions",
    blocks: [
      {
        title: "Your court",
        lines: [
          `${samplePacketMatter.court}`,
          `${samplePacketMatter.judicialDistrict}`,
          `${samplePacketMatter.county}`
        ]
      },
      {
        title: "How this court accepts filings",
        lines: [
          "Filings are accepted in person at the Clerk of Courts window during business hours.",
          "Some matters may also be mailed; call ahead to confirm the current process and any fee.",
          "Keep the date-stamped copy the clerk returns to you — it is your proof of filing."
        ]
      },
      {
        title: "What to expect",
        lines: [
          "The District Attorney is given a chance to respond to your petition.",
          "If there is no objection, many non-conviction expungements are granted without a hearing.",
          "If a hearing is scheduled, bring your packet, your ID, and your stamped copy."
        ]
      }
    ]
  },
  {
    id: "next-steps",
    label: "Next steps",
    heading: "What happens next",
    blocks: [
      {
        title: "After the order is signed",
        lines: [
          "1. The court sends the signed Expungement Order to the agencies that hold the record.",
          "2. Those agencies remove or seal the record according to the order.",
          "3. This can take several weeks to a few months depending on the agency."
        ]
      },
      {
        title: "Tracking it in your Briefcase",
        lines: [
          "Your Briefcase shows each step as Ready, Filed, or Waiting.",
          "Wilma can explain any step in plain English if something is unclear.",
          "You can download your packet again any time from your Briefcase."
        ]
      },
      {
        title: "If something looks complicated",
        lines: [
          "If your situation is unusual — multiple cases, a conviction that needs a pardon, or an objection from the DA — we will flag when speaking with a licensed attorney may be the better next step."
        ]
      }
    ]
  }
];
