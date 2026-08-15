// DEMO DATA ONLY — used exclusively by the "View sample packet" format preview.
//
// Nothing in this file is, or is derived from, a real user, a real matter, or a real
// packet job. It never touches packet generation, `packet_jobs`, Supabase, or payment.
// The persona ("Alex Rivera") and every case detail below are fabricated for illustration.
// Do NOT wire this into the live pipeline — it exists to show the FORMAT of a finished
// packet, not to produce a usable filing.

export const SAMPLE_BADGE = "SAMPLE: NOT A REAL PACKET";

export const samplePacketMatter = {
  petitioner: "Alex Rivera",
  caseNumber: "MC-51-CR-0004821-2019",
  court: "Philadelphia Municipal Court",
  judicialDistrict: "First Judicial District of Pennsylvania",
  county: "Philadelphia County, PA",
  offense: "Possession of a small amount of marijuana, 35 P.S. § 780-113(a)(31)",
  arrestDate: "March 14, 2019",
  disposition: "Dismissed / Nolle Prossed",
  dispositionDate: "August 2, 2019",
  pathway: "Petition for Expungement (Pa.R.Crim.P. 490, non-conviction)"
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
          "FIRST JUDICIAL DISTRICT OF PENNSYLVANIA, CRIMINAL DIVISION",
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
          "4. This request is made under Pa.R.Crim.P. 490 and 18 Pa.C.S. § 9122 because the case ended without a conviction.",
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
          "☐ Make 3 copies of the full packet: one for the court, one for the District Attorney, and one for your records.",
          "☐ Bring a government-issued photo ID."
        ]
      },
      {
        title: "Where to file",
        lines: [
          `${samplePacketMatter.court}, Criminal Division, Clerk of Courts`,
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
          "Many courts waive or reduce the filing fee when a petitioner meets the court's fee-waiver rules.",
          "Approval is up to the court. Submitting an IFP request does not guarantee a waiver.",
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
          "Keep the date-stamped copy the clerk returns to you. It is your proof of filing."
        ]
      },
      {
        title: "What to expect",
        lines: [
          "The District Attorney is given a chance to respond to your petition.",
          "The court will decide whether a hearing is needed.",
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
          "3. Timing varies by agency."
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
          "If your situation involves multiple cases, a conviction that may require a pardon, or an objection from the District Attorney, speaking with a licensed attorney may be the better next step."
        ]
      }
    ]
  }
];

export const SAMPLE_BADGE_ES = "EJEMPLO: NO ES UN PAQUETE REAL";

export const samplePacketMatterEs = {
  petitioner: "Alex Rivera",
  caseNumber: samplePacketMatter.caseNumber,
  court: "Tribunal Municipal de Filadelfia",
  judicialDistrict: "Primer Distrito Judicial de Pensilvania",
  county: "Condado de Filadelfia, PA",
  offense: "Posesión de una pequeña cantidad de marihuana, 35 P.S. § 780-113(a)(31)",
  arrestDate: "14 de marzo de 2019",
  disposition: "Desestimado / Nolle Prossed",
  dispositionDate: "2 de agosto de 2019"
} as const;

export const samplePacketTabsEs: SamplePacketTab[] = [
  {
    id: "petition",
    label: "Petición",
    heading: "Petición de expurgación",
    blocks: [
      {
        lines: [
          "EN EL TRIBUNAL MUNICIPAL DE FILADELFIA",
          "PRIMER DISTRITO JUDICIAL DE PENSILVANIA, DIVISIÓN PENAL",
          ""
        ]
      },
      {
        title: "Encabezado del caso",
        lines: [
          "Commonwealth de Pensilvania",
          "        contra",
          `${samplePacketMatterEs.petitioner}, Peticionario`,
          `Caso núm. ${samplePacketMatterEs.caseNumber}`
        ]
      },
      {
        title: "Petición",
        lines: [
          `1. El Peticionario, ${samplePacketMatterEs.petitioner}, solicita respetuosamente que este Tribunal ordene la expurgación de la información de antecedentes penales descrita a continuación.`,
          `2. El ${samplePacketMatterEs.arrestDate}, el Peticionario fue arrestado y acusado en este caso de ${samplePacketMatterEs.offense}.`,
          `3. El ${samplePacketMatterEs.dispositionDate}, el cargo terminó como ${samplePacketMatterEs.disposition.toLowerCase()}. El Peticionario no fue condenado.`,
          "4. Esta solicitud se presenta conforme a Pa.R.Crim.P. 490 y 18 Pa.C.S. § 9122 porque el caso terminó sin una condena.",
          "POR LO TANTO, el Peticionario solicita que este Tribunal emita una Orden para expurgar los registros de este caso."
        ]
      },
      {
        title: "Verificación",
        lines: [
          "Verifico que las declaraciones de esta petición son verdaderas y correctas según mi leal saber y entender.",
          "",
          "_______________________________        Fecha: ____________",
          `${samplePacketMatterEs.petitioner}, Peticionario`
        ]
      }
    ]
  },
  {
    id: "filing-checklist",
    label: "Lista de presentación",
    heading: "Su lista de presentación",
    blocks: [
      {
        title: "Antes de ir",
        lines: [
          "☐ Firme y feche la Petición y la Verificación.",
          "☐ Firme y feche la Orden propuesta. Deje en blanco la línea de firma del juez.",
          "☐ Haga 3 copias del paquete completo: una para el tribunal, una para el Fiscal de Distrito y una para sus archivos.",
          "☐ Lleve una identificación oficial con foto."
        ]
      },
      {
        title: "Dónde presentar",
        lines: [
          `${samplePacketMatterEs.court}, División Penal, Secretaría del Tribunal`,
          "1301 Filbert Street, Philadelphia, PA 19107",
          "Presente los documentos en el tribunal que atendió su caso. Si tiene cargos en más de un tribunal, cada tribunal necesita su propia petición."
        ]
      },
      {
        title: "Después de presentar",
        lines: [
          "☐ Pida al personal que selle su copia con la fecha.",
          "☐ Entregue una copia a la Fiscalía de Distrito si la secretaría no lo hace.",
          "☐ Anote cualquier fecha de audiencia que le den.",
          "☐ Guarde su copia sellada en su Maletín."
        ]
      }
    ]
  },
  {
    id: "fee-waiver",
    label: "Exención de tasas",
    heading: "Solicitud In Forma Pauperis para eximir las tasas",
    blocks: [
      {
        lines: [
          "Si no puede pagar la tasa de presentación, puede pedir al tribunal que la exima presentando una Petición para Proceder In Forma Pauperis (IFP) junto con su paquete."
        ]
      },
      {
        title: "Qué incluir",
        lines: [
          "☐ Petición IFP completa con información sobre sus ingresos, gastos y dependientes.",
          "☐ Una breve declaración que explique que pagar la tasa le causaría dificultades económicas.",
          "☐ Su firma y la fecha."
        ]
      },
      {
        title: "Información útil",
        lines: [
          "Muchos tribunales eximen o reducen la tasa cuando una persona cumple sus reglas.",
          "El tribunal decide. Presentar una solicitud IFP no garantiza una exención.",
          "Si se rechaza la exención, la secretaría le indicará cuánto debe pagar antes de que la petición continúe."
        ]
      }
    ]
  },
  {
    id: "court-instructions",
    label: "Instrucciones del tribunal",
    heading: "Instrucciones específicas del tribunal",
    blocks: [
      {
        title: "Su tribunal",
        lines: [
          samplePacketMatterEs.court,
          samplePacketMatterEs.judicialDistrict,
          samplePacketMatterEs.county
        ]
      },
      {
        title: "Cómo acepta documentos este tribunal",
        lines: [
          "Puede presentar los documentos en persona en la ventanilla de la Secretaría del Tribunal durante el horario de atención.",
          "Algunos documentos también pueden enviarse por correo. Llame antes para confirmar el procedimiento actual y cualquier tasa.",
          "Guarde la copia sellada con la fecha que le devuelvan. Es su comprobante de presentación."
        ]
      },
      {
        title: "Qué puede pasar",
        lines: [
          "La Fiscalía de Distrito tiene la oportunidad de responder a su petición.",
          "El tribunal decidirá si se necesita una audiencia.",
          "Si se programa una audiencia, lleve su paquete, identificación y copia sellada."
        ]
      }
    ]
  },
  {
    id: "next-steps",
    label: "Próximos pasos",
    heading: "Qué sucede después",
    blocks: [
      {
        title: "Después de que se firme la orden",
        lines: [
          "1. El tribunal envía la Orden de Expurgación firmada a las agencias que conservan el antecedente.",
          "2. Esas agencias eliminan o sellan el antecedente según la orden.",
          "3. El tiempo varía según la agencia."
        ]
      },
      {
        title: "Seguimiento en su Maletín",
        lines: [
          "Su Maletín muestra cada paso como Listo, Presentado o En espera.",
          "Wilma puede explicar cualquier paso con palabras claras.",
          "Puede volver a descargar su paquete desde el Maletín."
        ]
      },
      {
        title: "Si algo parece complicado",
        lines: [
          "Si su situación incluye varios casos, una condena que podría requerir un indulto o una objeción de la Fiscalía de Distrito, hablar con un abogado con licencia podría ser el mejor próximo paso."
        ]
      }
    ]
  }
];
