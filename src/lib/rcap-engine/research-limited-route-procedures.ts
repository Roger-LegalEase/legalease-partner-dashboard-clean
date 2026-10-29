import georgiaMemo from "@/../data/record-clearing/legal-design-intake/GA.memo.json";
import westVirginiaMemo from "@/../data/record-clearing/legal-design-intake/WV.memo.json";
import massachusettsMemo from "@/../data/record-clearing/legal-design-intake/MA.memo.json";
import { MASSACHUSETTS_ADULT_SEALING_ROUTE } from "@/lib/rcap-engine/massachusetts-adult-sealing-facts";
import { WEST_VIRGINIA_407_ROUTE } from "@/lib/rcap-engine/west-virginia-407-facts";
import georgiaFieldMap from "@/../data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/production-field-map.json";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import alaskaMemo from "@/../data/record-clearing/legal-design-intake/AK.memo.json";
import alaskaFieldMap from "@/../data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/production-field-map.json";
import marylandSourceReceipt from "@/../data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/source-receipt.json";
const AK_PATHWAY="sealing-for-mistaken-identity-or-false-accusation-as-12-62-180";
const AK_SHA="1fb64733f46c397beb69d1da8d72a1f1462669f8dfb7611e86a833c45aa5c80a";
const MD_PATHWAY="cannabis-specific-expungement";
const MD_SHA="87465cb08d93f3469dc4fe7288360aaa650f21e2dee06ebd4f7f05a4998d2703";

/** The adopted adult100A request goes to Probation and has no court caption. */
export function withMassachusettsAdultSealingProcedure(profile: EngineProfile): EngineProfile {
  if (profile.jurisdiction.code !== "MA") return profile;
  const track = massachusettsMemo.tracks.find(item => item.trackId === "ma-seal-admin");
  const sha = "416f9a1d1a7ade6e71ffe3964a30c2d247bd1aca3982f4ff8e55550a730506ce";
  const official = profile.source?.allFolderFiles?.find(source => source.sha256 === sha && source.sizeBytes === 216883);
  if (!track || track.outputStrategy !== "official_pdf_fill" || track.destination.kind !== "agency"
    || track.legalDesignDecision.status !== "legal_design_approved_with_limitations" || !official) {
    throw new Error("Adult100A requires the exact adopted Commissioner request and official source");
  }
  const pathwayId = MASSACHUSETTS_ADULT_SEALING_ROUTE.slice(3);
  return { ...profile, pathways: profile.pathways.map(pathway => pathway.id !== pathwayId ? pathway : { ...pathway,
    routeType: "administrative", automatic: false, filingRequired: true,
    receivingOffice: track.destination.name,
    summary: "Whole-record section100A sealing request to the Commissioner of Probation using the official adult request and applicable perjury declaration. Each record class uses its own statutory event and period; all Massachusetts entries must be considered. No court caption, proposed order or prosecutor service is added. Obtain your own CORI before filing; LegalEase does not collect it, sign for you or make the official decision."
  }), packetGenerator: { ...profile.packetGenerator, pathways: profile.packetGenerator.pathways.map(plan => plan.pathwayId !== pathwayId ? plan : { ...plan,
    mode: "official_form_overlay_or_source_form_set", formMappingStatus: "source_candidate_identified",
    requiredInputIds: (plan.requiredInputIds ?? profile.packetGenerator.requiredInputs ?? []).filter(id => id !== "court"),
    formCandidates: [structuredClone(official)],
    selectionRule: "Use only the official Commissioner form for the supported adult100A request and applicable declaration. Preserve juvenile100B, signatures and official-use fields. A single case or court reference is not required for this whole-record request. Commercial admission and private delivery remain separately held."
  }) } };
}

/** Exact adopted section407 custom package; the compiled source and approvals remain intact. */
export function withWestVirginia407Procedure(profile: EngineProfile): EngineProfile {
  if (profile.jurisdiction.code !== "WV") return profile;
  const track = westVirginiaMemo.tracks.find(item => item.trackId === "wv_drug_conditional_discharge");
  if (!track || track.outputStrategy !== "custom_pleading"
    || track.legalDesignDecision.status !== "legal_design_approved_with_limitations"
    || track.components.map(item => item.role).join(",") !== "primary_filing,supporting_affidavit,certificate_of_service,records_checklist,filing_instructions") {
    throw new Error("The section407 procedure requires its exact adopted five-component design");
  }
  const pathwayId = WEST_VIRGINIA_407_ROUTE.slice(3);
  return { ...profile,
    pathways: profile.pathways.map(pathway => pathway.id !== pathwayId ? pathway : { ...pathway,
      summary: "Section407 application to the court that imposed probation, at least six months after probation expires and following actual discharge and dismissal. The package contains an application, supporting affidavit, prosecutor/probation service certificate, external-record checklist and filing instructions. The court determines probation violations at a hearing. Obtain and attach the actual orders and written probation-expiration confirmation before filing.",
      receivingOffice: track.destination.name
    }),
    packetGenerator: { ...profile.packetGenerator,
      pathways: profile.packetGenerator.pathways.map(plan => plan.pathwayId !== pathwayId ? plan : { ...plan,
        mode: "state_specific_custom_packet_from_source_rules",
        formCandidates: [], formMappingStatus: "custom_or_manual_mapping_required",
        selectionRule: "Use only the adopted section407 application, affidavit, service certificate, records checklist and instructions. SCA-C903/C906/C907 and a proposed order are outside this exact package. Preserve court findings, external records and commercial admission gates."
      })
    }
  };
}

/** Source-backed procedure/form correction only. Stored source and legal approvals remain unchanged. */
export function withResearchLimitedRouteProcedures(profile: EngineProfile, memo: unknown=alaskaMemo, fieldMap: unknown=alaskaFieldMap): EngineProfile {
  if(profile.profileVersion!=="2026-06-19-source-conversion-1")return profile;
  if(profile.jurisdiction.code==="GA"){
    const pathwayId="non-conviction-record-restriction-through-the-agency-prosecutor-process",sha="5fe841de263070f192ddfb0e322e41b2c2a97e8d07e7e643e98fdf780aefa1ab";
    const track=georgiaMemo.tracks.find(t=>t.trackId==="ga-nonconv-pre2013"),official=profile.source?.allFolderFiles?.find(s=>s.sha256===sha&&s.sizeBytes===449903);
    if(!track||track.outputStrategy!=="official_pdf_fill"||track.legalDesignDecision.status!=="legal_design_approved_with_limitations"||georgiaFieldMap.sourceSha256!==sha||!official)throw new Error("GA pre2013 procedure requires the exact approved agency application, measured map and four-page source");
    return {...profile,pathways:profile.pathways.map(p=>p.id!==pathwayId?p:{...p,routeType:"administrative",receivingOffice:"Pre-July1,2013: arresting law-enforcement agency; later arrests: prosecutor for the county of arrest",summary:"Pre-July1,2013 arrests use the existing four-page GCIC agency application with only applicant SectionOne prepared. Later arrests do not use that statewide application and remain guidance unless a local application product is separately verified. Actual agency/prosecutor execution and any external disposition are never fabricated."}),packetGenerator:{...profile.packetGenerator,pathways:profile.packetGenerator.pathways.map(p=>p.pathwayId!==pathwayId?p:{...p,mode:"official_form_overlay_or_source_form_set",formCandidates:[{...structuredClone(official),kind:"official_form_or_packet"}],formMappingStatus:"source_candidate_identified",selectionRule:"Use the exact four-page pre2013GCICapplication only for the qualifying initial pre2013arrest branch. Preserve agency SectionTwo, prosecutor SectionThree, GBI-only, private SSN and signatures. Later-arrest statewide application checkout stays off. No commercial authority is created."})}};
  }
  if(profile.jurisdiction.code==="MD"){
    const source=marylandSourceReceipt.sourceCatalog["CC-DC-CR-072D"];
    if(source.sha256!==MD_SHA||source.edition!=="10/2025")throw new Error("MD072D source identity requires exact reconciliation");
    return {...profile,packetGenerator:{...profile.packetGenerator,pathways:profile.packetGenerator.pathways.map(p=>p.pathwayId!==MD_PATHWAY?p:{...p,mode:"official_form_overlay_or_source_form_set",formMappingStatus:"source_candidate_identified",formCandidates:[{fileName:"CC-DC-CR-072D.pdf",relativePath:source.path,sha256:source.sha256,sizeBytes:source.bytes,kind:"official_form_or_packet",extension:".pdf"}],selectionRule:"Use the current10/2025 CC-DC-CR-072D for the exact supported cannabis conviction branch. Append CC-DC-089 and MDJ-008 only for an express supported fee-waiver request. The court serves recipients and generates its order; no participant service or proposed order is invented. No commercial authority is created."})}};
  }
  if(profile.jurisdiction.code!=="AK")return profile;
  const track=(memo as typeof alaskaMemo).tracks?.find(t=>t.trackId==="ak-mistaken-identity");
  const mapped=(fieldMap as typeof alaskaFieldMap).maps?.[0]?.officialSource;
  const official=profile.source?.allFolderFiles?.find(s=>s.fileName==="RequestToSealCrimInfo.pdf"&&s.sha256===AK_SHA&&s.sizeBytes===37708);
  if(!track||track.outputStrategy!=="official_pdf_fill"||track.destination.kind!=="agency"||track.legalDesignDecision.status!=="legal_design_approved_with_limitations"||!track.components.some(c=>"officialFormId" in c && c.officialFormId==="DPS-REQUEST-TO-SEAL-CRIM-INFO")||mapped?.sha256!==AK_SHA||!official)throw new Error("AK mistaken-identity procedure requires the exact approved agency design, six-page source and measured field-map identity");
  return {...profile,pathways:profile.pathways.map(p=>p.id!==AK_PATHWAY?p:{...p,automatic:false,filingRequired:true,routeType:"administrative",filingActor:"Participant submits the written request to the head of the record-holding agency",receivingOffice:"Alaska Department of Public Safety, Criminal Records and Identification Bureau",procedureVersion:"research115-R001-current-agency-form-2026-10-29",summary:"An initial AS12.62.180 request asks the Alaska record-holding agency to seal criminal information resulting from mistaken identity or false accusation. It is an agency application, not a court expungement petition. Alaska DPS uses the existing six-page Form Seal Req2-04; participant facts and explanation are prepared, while actual officer/prosecutor verification and supporting government records are obtained separately. Denial or contested proof requires a separate appeal or assistance workflow."}),packetGenerator:{...profile.packetGenerator,pathways:profile.packetGenerator.pathways.map(p=>p.pathwayId!==AK_PATHWAY?p:{...p,mode:"official_form_overlay_or_source_form_set",formCandidates:[structuredClone(official)],formMappingStatus:"source_candidate_identified",selectionRule:"Use the existing six-page DPS RequestToSealCrimInfo.pdf for the exact DPS initial-request branch. Preserve all government verification/decision blocks and all pages. Do not use a court petition, invent exhibits or claim the draft is filing-ready before actual external submission tasks are complete. Checkout remains separately gated."})}};
}
