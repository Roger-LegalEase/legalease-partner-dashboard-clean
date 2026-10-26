import assert from "node:assert/strict";
import fs from "node:fs";
import { caProp64CaptionBindings, caProp64HeldText } from "./lib/ca-prop64-caption-bindings.mjs";
const census = JSON.parse(fs.readFileSync("data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/field-census.census-v1.json", "utf8"));
const facts = { "filer.representation": "self_represented", "participant.full_legal_name": "Jordan Avery Reyes", "participant.street_address": "118 Maple Street", "participant.city": "Springfield", "participant.state": "AZ", "participant.zip": "01234", "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com", "matter.county": "Example County", "matter.case_number": "24-CR-001234" };
let checks = 0;
const check = (a,b,label) => { assert.deepEqual(a,b,label); checks++; };
const bind = facts => caProp64CaptionBindings({ familyId: "ca-prop64-set", facts });
const before = JSON.stringify(facts), result = bind(facts);
check(JSON.stringify(facts), before, "raw facts untouched");
check(Object.values(result.mappings).flatMap(Object.keys).length,32,"29 additional caption fields plus original three");
for (const [form,mappings] of Object.entries(result.mappings)) for (const [name,id] of Object.entries(mappings)) {
  const field = census.documents.find(row=>row.formNumber===form).fields.find(row=>row.name===name);
  check(field?.fieldType,"/Tx",name);
  check(/CrtUse|SigBlock|LI[1-9]|Timeserved/.test(name),false,"never writes court/service/signing/elections");
  check(result.facts[id],facts[id],"exact held value");
}
for(const value of [undefined,"unknown","",false,{},[],{value:"attorney",unknown:true},{value:"self_represented",extra:true}]) {
  const unresolved=bind({...facts,"filer.representation":value});
  check(unresolved.actor,null,"no assumed filer");
  check(Object.values(unresolved.mappings).flatMap(Object.keys).some(name=>name.includes("AttyPartyInfo")),false);
  check(Object.values(unresolved.mappings).flatMap(Object.keys).length,11,"neutral caption remains independently usable");
}
const lawyer = {...facts,"filer.representation":"attorney","attorney.full_legal_name":"Alex Counsel","attorney.email":"actual-counsel@example.com"};
for(const [form,mappings] of Object.entries(bind(lawyer).mappings)) {
  const actorEntries=Object.entries(mappings).filter(([name])=>name.includes("AttyPartyInfo"));
  check(actorEntries.length,2,"absent attorney contact never borrows participant contact");
  check(actorEntries.every(([,id])=>id.startsWith("attorney.")),true);
  check(Object.entries(mappings).filter(([name])=>/Defendant|Party2/.test(name)).every(([,id])=>id==="participant.full_legal_name"),true);
}
for(const value of [0,[],{},"unknown"," unknown ","Unknown","UNKNOWN","",{value:"Street",unknown:true},{value:"Street",unknown:false,extra:1},"A\nB"]) check(caProp64HeldText(value),undefined);
check(caProp64HeldText({value:"01234",unknown:false}),"01234","ZIP leading zero retained");
check(bind({...facts,"contact_information":"Guessville AZ 99999","participant.street_address":undefined}).mappings["CR-400"]["CR-400[0].Page1[0].P1Caption[0].AttyPartyInfo[0].Street[0]"],undefined,"no legacy prose parsing");
const missingCourt=bind(facts);
check(Object.values(missingCourt.mappings).flatMap(Object.keys).some(name=>/CrtStreet|CrtCityZip|CrtMailingAdd/.test(name)),false,"home and county never substitute for courthouse");
for(const relationship of [undefined,"unknown","same","distinct"]) {
  const r=bind({...facts,"court.mailing_address":"Actual separate court address","court.mailing_address_relationship":relationship});
  check(Object.values(r.mappings).flatMap(Object.keys).filter(name=>name.includes("CrtMailingAdd")).length,relationship==="distinct"?3:0);
  check(r.missing.filter(row=>row.factId==="court.mailing_address_relationship").length,["same","distinct"].includes(relationship)?0:3,"relationship remains owned");
}
check(bind({...facts,"participant.fax":"555-0188"}).missing.filter(row=>row.factId==="participant.fax").length,0,"known fax written without deciding blank requiredness");
check(result.missing.filter(row=>row.factId==="participant.fax").length,3,"unknown fax remains owned");
check([result.generationAllowed,result.runtimeSelectable,result.commercialRoutesOpened],[false,false,0]);
check(caProp64CaptionBindings({familyId:"ca-17b-set",facts}),null,"sibling unchanged");
console.log(JSON.stringify({status:"PASS",checks,scope:"structured fact destination adapter; protected collection and full packet acceptance remain pending"}));
