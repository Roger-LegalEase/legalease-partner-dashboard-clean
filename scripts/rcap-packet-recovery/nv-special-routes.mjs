import assert from 'node:assert/strict';

// Bounded implementation of the current special-route statutes. This changes
// review artifacts only. It never creates commercial or legal approval.
export const CORRECTION = 'data/record-clearing/legal-decisions/2026-09-07-nv-special-route-procedure.json';
export const SPECIAL_ROUTES = Object.freeze({
  nv_seal_decrim: {
    routeKey: 'obligation:track-only:NV:nv_seal_decrim',
    name: 'Seal a Nevada record for something that is no longer a crime',
    instrument: 'Written Request to Seal Records After Decriminalization',
    statute: 'NRS 179.271',
    basis: 'This written request concerns a Nevada conviction entered before the offense was decriminalized by legislation, referendum or initiative. NRS 179.271(1)(a) permits the request in any court in which the requester was convicted of that offense. Traffic offenses are excluded by subsection 3.',
    destination: 'Submit the written request directly to the clerk of a court in which you were convicted of the offense. Do not make prosecutor consent or a stipulation a prerequisite to submission.',
    fee: 'No court or agency of criminal justice may charge a fee for submission of this request under NRS 179.271(2). A fee-waiver application is not needed to obtain this statutory no-fee treatment. Separate records or independent services may have their own charges; do not confuse those with a filing fee.',
    notice: 'The court sends written notice to the prosecuting office. That office has 10 judicial days after receipt of the notice to file a written objection. If there is no timely objection the court must grant the request. A written objection requires a hearing. This is not the ordinary 30-day sealing procedure, and it is not a deadline the requester calculates from the filing date.',
    after: 'After an order is entered, follow the court\'s distribution directions. Under NRS 179.275 a copy goes to the Central Repository and each record custodian named in the order. Keep your entered order and confirm the records have been sealed; do not sign a certification of delivery before delivery occurs.',
    fields: [
      ['case_number', 'Existing case number', 'the case number on the conviction record'],
      ['charge', 'Offense, count and statute at conviction', 'the exact offense and count from the judgment, including the statute cited'],
      ['conviction_date', 'Date of conviction', 'the conviction date shown by the court record'],
      ['decriminalizing_authority', 'Act, referendum or initiative and effective date', 'the legal authority and effective date that decriminalized this exact offense; get legal review if uncertain'],
      ['record_custodians', 'Records and custodians to be included', 'identify the conviction records and agencies holding them, using the court and criminal-history records'],
      ['exhibits', 'Supporting record references', 'identify the attached conviction record and supporting authority; do not list a document that is not attached'],
    ],
    stops: [
      'Stop if the offense is a traffic offense, if only part of the conduct was decriminalized, or if you cannot establish that the conviction predates the decriminalizing law.',
      'Stop for legal review if the applicable law, conviction, court, or record scope is uncertain. Do not substitute a general belief that the conduct should be legal.',
      'If a written objection is filed, a hearing is set, or the request is denied, this bounded self-help preparation stops. Get legal help with a response, contested hearing, or appeal.',
    ],
  },
  nv_seal_pardon: {
    routeKey: 'obligation:track-only:NV:nv_seal_pardon',
    name: 'Seal a Nevada record after a pardon',
    instrument: 'Petition to Seal Records Covered by a Pardon',
    statute: 'NRS 179.273',
    basis: 'NRS 179.273(1) requires automatic sealing when the court and Central Repository receive a certified copy of an unconditional pardon from the Nevada State Board of Pardons Commissioners. Subsection 2 also permits a written petition with proof of the pardon in any court in which the petitioner was convicted. The court must grant that petition unless the listed charges differ from those listed in the pardon. This packet is limited to the existing unconditional-pardon product route; a conditional or ambiguous pardon goes to legal review.',
    destination: 'First check whether the pardoned records have already been sealed through the automatic process. When a petition is needed, submit it with proof of the pardon directly to the clerk of a court in which you were convicted. Do not submit it for prosecutorial preapproval.',
    fee: 'No court or agency of criminal justice may charge a fee for submission of this petition under NRS 179.273(5). No indigency finding or fee-waiver application is needed for that no-fee treatment. Separate records or independent services may have their own charges; do not confuse those with a filing fee.',
    notice: 'NRS 179.273(3) expressly excludes prosecuting-attorney or criminal-justice-agency review of this petition. No prosecutor stipulation, prosecutor signature, or 30-day prosecutor response period is part of this special petition procedure.',
    after: 'Keep the entered order. Ask the court how it transmits the sealing action to the Central Repository and affected custodians, and confirm that the records covered by the pardon were sealed. Do not treat this packet as an application for a pardon or as an assurance about federal, immigration, or firearm consequences.',
    fields: [
      ['case_number', 'Existing case number', 'the case number on the conviction record'],
      ['charges', 'Charges covered by the pardon', 'copy the exact charges listed in the pardon and identify the matching conviction records'],
      ['pardon_date', 'Date the Nevada Board granted the pardon', 'the grant date printed in the pardon'],
      ['proof_of_pardon', 'Proof of pardon attached', 'identify the actual attached pardon document; proof of the pardon must accompany the petition'],
      ['record_custodians', 'Records and custodians to be included', 'identify the records relating to the pardoned charges and the agencies holding them'],
      ['automatic_status', 'Status of automatic sealing', 'record what the court or Central Repository shows; do not file a redundant petition for records already sealed'],
    ],
    stops: [
      'Stop if the pardon is conditional or ambiguous, is not from the Nevada State Board of Pardons Commissioners, or does not identify the charges you are asking to seal.',
      'Stop if proof of the pardon is missing or the conviction and pardon charge lists do not match. Do not invent proof, infer missing charges, or generate the Board\'s certification.',
      'If the court disputes scope, sets a contested hearing, or denies relief, get legal help before responding or appealing. Prosecutor consent is not a statutory condition of this petition.',
    ],
  },
});
const commonStops = [
  'Get legal help for immigration or firearm-rights questions. This sealing packet makes no determination of those consequences.',
  'This Nevada packet does not clear federal, out-of-state, military, or tribal records.',
];
const rbf = (id, label, supply) => ({kind:'rbf', id, label, supply, why:'the value must come from the participant\'s actual records; it is not held in the reference fixture'});
const protectedBlank = (id, label) => ({kind:'protected', id, label, why:'the participant completes this only when actually executing the document'});
const known = [
  {id:'petitioner_name',label:'Petitioner full legal name',factId:'participant.full_legal_name'},
  {id:'petitioner_dob',label:'Petitioner date of birth',factId:'participant.date_of_birth'},
  {id:'petitioner_address',label:'Petitioner mailing address',factId:'participant.street_address'},
  {id:'petitioner_phone',label:'Petitioner telephone',factId:'participant.phone'},
  {id:'petitioner_email',label:'Petitioner email',factId:'participant.email'},
];
function filingComponent(track, rule) {
  const fields = [rbf('caption_court','Court in which the conviction occurred','the court\'s full name from the conviction record'),...rule.fields.map(([id,label,supply])=>rbf(id,label,supply))];
  return {
    id:`${track}-primary-filing-2`, routeKey:rule.routeKey, title:rule.instrument, role:'primary_filing',
    description:`the participant's ${rule.instrument.toLowerCase()} under ${rule.statute}`, condition:null,
    body:[
      'IN THE ............................................................ COURT',
      'Court in which the conviction occurred. Complete from the conviction record.', '',
      'IN RE: {{participant.full_legal_name}}', 'Date of birth: {{participant.date_of_birth}}', '',
      `The petitioner requests sealing of the records identified below under ${rule.statute}.`,
      'Complete every applicable case-specific line from your records and check the supporting documents before signing.', '',
      ...rule.fields.flatMap(([,label])=>[`${label}:`,'{{DOTS:82}}','']),
      'REQUESTED RELIEF',
      track==='nv_seal_pardon'
        ? 'Seal the criminal-history records relating to the charges identified in the attached pardon, under NRS 179.273. The proof of pardon identified above accompanies this petition.'
        : 'Seal the criminal-history records relating to the conviction identified above, under NRS 179.271. The supporting records identify the offense, conviction date, and decriminalizing authority.', '',
      'Petitioner signature: {{DOTS:40}}', 'Date actually signed: {{DOTS:30}}', '',
      'Printed name: {{participant.full_legal_name}}', 'Mailing address: {{participant.street_address}}',
      'Telephone: {{participant.phone}}', 'Email: {{participant.email}}',
    ],
    writes:structuredClone(known),
    blanks:[...fields, protectedBlank('signature','Petitioner signature'),protectedBlank('signature_date','Date actually signed')],
  };
}
function instructions(track, rule, components) {
  return {
    id:`${track}-filing-instructions-6`, routeKey:rule.routeKey, title:`Filing Instructions - ${rule.name}`,role:'filing_instructions',condition:null,
    description:'the route-specific filing, no-fee, notice, evidence and self-help instructions',
    pageBreakBefore:['AFTER THE COURT ACTS'],
    writes:[structuredClone(known[0])],blanks:[],
    body:[
      'Prepared for {{participant.full_legal_name}}.', '',
      'THE ROUTE',rule.basis,'', 'WHERE TO SUBMIT',rule.destination,'',
      'FILING COST AND WAIVER',rule.fee,
      'NRS 179.245(9) also protects qualifying sex-trafficking or involuntary-servitude victims against specified process expenses. That separate protection is not a condition of the no-fee submission rights above. Get legal help if a separate charge or waiver is disputed.', '',
      'NOTICE AND RESPONSE',rule.notice,'', 'WHAT TO PREPARE',
      'Complete the request or petition from the conviction record. Keep supporting documents with it. Do not complete any judicial decision, court signature, or certification for someone else.',
      track==='nv_seal_pardon' ? 'Proof of the pardon is a required attachment. Do not substitute a request for a future pardon or an unsupported statement that one was granted.' : 'Identify the decriminalizing act, referendum or initiative, its effective date, and the conviction that predates it. This route excludes traffic offenses.',
      'The proposed order and declaration are supporting LegalEase-prepared components, not official court forms. The statutes do not make a prosecutor stipulation a required component of these two special routes. Confirm any additional local formatting requirement with the filing clerk; it does not alter the statutory no-fee and no-preapproval rules.', '',
      'AFTER THE COURT ACTS',rule.after,'', 'WHEN THIS SELF-HELP PACKET STOPS',
      ...[...rule.stops,...commonStops].map(x=>'- '+x),'', 'PAGES FOR THIS ROUTE',
      ...components.map(c=>`- ${c.id}: ${c.description}`),
    ],
  };
}
export function applyNvSpecialRoutes(spec) {
  assert.equal(spec.familyId,'rcap-nv-custom-pleading');
  assert.equal(spec.routes.length,6,'unexpected family route scope');
  const specialKeys=new Set(Object.values(SPECIAL_ROUTES).map(x=>x.routeKey));
  const originalOthers=JSON.stringify(spec.components.filter(x=>!specialKeys.has(x.routeKey)));
  for (const [track,rule] of Object.entries(SPECIAL_ROUTES)) {
    const old=spec.components.filter(x=>x.routeKey===rule.routeKey);
    assert.equal(old.length,5,`${track}: expected the five existing components`);
    const indices=old.map(c=>spec.components.indexOf(c));
    assert.ok(indices.every((n,i)=>n===indices[0]+i),`${track}: non-contiguous component group`);
    const primary=filingComponent(track,rule);
    const support=structuredClone(old.filter(x=>['proposed_order','declaration_and_verification'].includes(x.role)));
    assert.equal(support.length,2);
    for (const c of support) {
      c.body=c.body.map(line=>line.startsWith('(Write the COURT')
        ? '(Write the court in which you were convicted on the caption line. Submit this route directly to that court, not for prosecutorial preapproval.)'
        : line);
      if (c.role==='proposed_order') c.body=c.body.map(line=>line.startsWith('This matter came before the Court')
        ? `This matter came before the Court on the ${track==='nv_seal_decrim'?'written request':'petition'} under ${rule.statute}. The Court, having considered the filing and its supporting materials,` : line);
      if (track==='nv_seal_decrim') c.body=c.body.map(line=>line.replace(/\bpetition\b/g,'written request'));
      for (const b of c.blanks) if (b.id==='caption_court') {
        b.supply='the full name of the court in which you were convicted, from the conviction record';
        b.why='the caption identifies the court, not a prosecuting agency';
      }
      c.description += '; supporting prepared component, not a claim that the special statute requires this document';
    }
    const replacement=[primary,...support];replacement.push(instructions(track,rule,replacement));
    const start=spec.components.findIndex(x=>x.routeKey===rule.routeKey);
    spec.components.splice(start,old.length,...replacement);
    const chosen=spec.routeSelectionsMade.find(x=>x.routeKey===rule.routeKey);assert.ok(chosen);
    chosen.instrument=replacement.map(x=>`${x.role}: ${x.id}`).join('; ');
    for (const row of spec.obligationTable) if (row[0].endsWith(rule.name)) {
      if(row[0].startsWith('FILING_DESTINATION')) row[1]=rule.destination;
      if(row[0].startsWith('FEE_AND_WAIVER')) row[1]=rule.fee;
      if(row[0].startsWith('SERVICE')) row[1]=rule.notice+' '+rule.after;
      if(row[0].startsWith('SELF_HELP_STOP')) row[1]=[...rule.stops,...commonStops].join(' ');
    }
    const choice=spec.instrumentChoice.rows.find(x=>x[0]===rule.name);assert.ok(choice);choice[1]=rule.basis;
    spec.recordSays=spec.recordSays.filter(x=>x[0]!==rule.name);spec.recordSays.push([rule.name,rule.basis+' '+rule.notice]);
  }
  assert.equal(JSON.stringify(spec.components.filter(x=>!specialKeys.has(x.routeKey))),originalOthers,'ordinary route components changed');
  spec.records.push({recordId:'NV-SPECIAL-ROUTE-PROCEDURE-2026-09-07',path:CORRECTION,
    role:'Current primary-authority correction controlling only NRS 179.271 and 179.273 where the older shared records conflict. No commercial or counsel approval.',
    mustContain:['NV-SPECIAL-ROUTE-PROCEDURE-2026-09-07','NRS 179.271(2)','10 judicial days','NRS 179.273(3)','NRS 179.273(5)']});
  spec.composedFromNote += `; the two special routes also bind ${CORRECTION}, which expressly supersedes their inherited fee and prosecutor-first content`;
  spec.documentsToObtain=spec.documentsToObtain.map(([what,where])=>[
    /NRS 179\.245\(2\)\(a\).*179\.255\(3\)\(a\)/.test(what)
      ? 'For routes governed by NRS 179.245 or 179.255: '+what+' This ordinary-route attachment condition is not imposed on the NRS 179.271 request or NRS 179.273 petition.' : what,where]);
  spec.documentsToObtain.push(['For the NRS 179.273 route: proof of the actual pardon and matching conviction charges.','Nevada State Board of Pardons Commissioners and the convicting court']);
  spec.documentsToObtain.push(['For NRS 179.271: conviction record and the authority that decriminalized this offense.','The convicting court and the official Nevada legislative or initiative record']);
  spec.steps=spec.steps.map(x=>x.includes('ask that office what it charges')
    ? '**Submit only the pages for the confirmed route.** The NRS 179.271 request and NRS 179.273 petition go directly to the convicting court without a submission fee or prosecutor preapproval. Use each other route\'s own instructions; do not import them into these special routes.' : x);
  spec.stopConditions=spec.stopConditions.map(x=>
    /Prosecutor refusal|clean period|one-year versus ten-year|stipulation practice|applicable waiting period/.test(x)
      ? 'For the ordinary conviction, nonconviction, consolidation or reentry route, as applicable: '+x+' The NRS 179.271 and 179.273 routes instead use their own route-specific boundaries stated above.' : x);
  spec.buildFindings.push({finding:'Current NRS 179.271 and 179.273 were read directly. Their free, court-filed procedures differ from the shared ordinary prosecutor-first flow.',consequence:'The special-route petition/request, component set, captions, instructions, fee and notice statements were replaced together. Other route components are unchanged; fresh raster and independent review remain required.'});
  spec.reviewersAttention.push('NRS 179.271/179.273 procedural correction: review the exact changed packet bytes and supporting local instrument requirements. This correction is research and implementation, not counsel approval.');
  return spec;
}
