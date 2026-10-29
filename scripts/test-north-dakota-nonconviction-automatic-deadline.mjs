import assert from "node:assert/strict";
import {northDakotaNonconvictionAutomaticDeadline as deadline, ND_NONCONVICTION_AUTOMATIC_TIMING_COPY as copy} from "../src/lib/rcap-engine/north-dakota-nonconviction-deadline.mjs";
import {computeNdNonconvictionDeadline as existing} from "./rcap-packet-recovery/nd-nonconviction-timing.mjs";
let checks=0;
function check(label,fn){fn();checks++;console.log("PASS "+label);}
// Synthetic complete windows test arithmetic only; they are not deployed calendar authority.
const calendar=(start,end,legalHolidays=[])=>({jurisdiction:"ND",confirmedComplete:true,start,end,legalHolidays,verificationSource:"SYNTHETIC TEST WINDOW; not official court-calendar evidence"});
const dates=[
 ["2025-08-01","2025-10-01","2025-10-01","2025-10-02"],
 ["2025-08-04","2025-10-04","2025-10-06","2025-10-07"],
 ["2025-08-05","2025-10-05","2025-10-06","2025-10-07"],
 ["2025-08-06","2025-10-06","2025-10-06","2025-10-07"],
 ["2025-08-07","2025-10-07","2025-10-07","2025-10-08"],
 ["2025-09-02","2025-11-02","2025-11-03","2025-11-04"],
 ["2025-10-31","2025-12-31","2025-12-31","2026-01-02",["2026-01-01"]],
 ["2025-11-01","2026-01-01","2026-01-02","2026-01-05",["2026-01-01"]],
 ["2025-11-02","2026-01-02","2026-01-02","2026-01-05"],
 ["2025-12-01","2026-01-31","2026-02-02","2026-02-03"],
 ["2028-02-29","2028-04-30","2028-05-01","2028-05-02"],
 ["2027-12-31","2028-03-01","2028-03-01","2028-03-02"],
 ["2028-03-01","2028-05-01","2028-05-01","2028-05-02"]
];
for(const[entered,raw,adjusted,first,holidays=[]]of dates){
 const coverage=calendar(raw,first,holidays),before=JSON.stringify(coverage),result=deadline(entered,coverage);
 check("independent day61/adjusted-expiry/first-check "+entered,()=>{
  assert.equal(result.eligible,true);assert.deepEqual([result.rawDay61,result.adjustedExpiration,result.firstAdministrativeCheckDate],[raw,adjusted,first]);
  assert.equal(result.entryDateExcluded,true);assert.equal(result.daysCounted,61);assert.equal(result.mailServiceDaysAdded,0);assert.equal(result.firstCheckIsProductStep,true);
  assert.equal(result.computationMethod,"CALLER_SUPPLIED_COMPLETE_ND_CALENDAR");assert.equal(result.calendarVerificationSource,coverage.verificationSource);
  assert.equal(JSON.stringify(coverage),before);assert.deepEqual(result,existing({orderEntryDate:entered,calendarCoverage:coverage}));
 });
}
check("consecutive synthetic holidays extend expiry and do not turn into statutory added days",()=>{
 const r=deadline("2025-08-04",calendar("2025-10-04","2025-10-10",["2025-10-06","2025-10-07"]));
 assert.equal(r.eligible,true);assert.deepEqual([r.rawDay61,r.adjustedExpiration,r.firstAdministrativeCheckDate],["2025-10-04","2025-10-08","2025-10-09"]);assert.equal(r.daysCounted,61);
});
check("holiday on first-check day adjusts product check independently of period expiry",()=>{
 const r=deadline("2025-08-01",calendar("2025-10-01","2025-10-03",["2025-10-02"]));
 assert.equal(r.eligible,true);assert.deepEqual([r.adjustedExpiration,r.firstAdministrativeCheckDate],["2025-10-01","2025-10-03"]);
});
function refused(label,entered,coverage,code){
 check(label,()=>{const r=deadline(entered,coverage);assert.equal(r.eligible,false);assert.equal(r.code,code);
  for(const key of["rawDay61","adjustedExpiration","firstAdministrativeCheckDate","verificationOn"])assert(!Object.hasOwn(r,key));
 });
}
for(const entered of["2025-08-01","2025-08-04","2028-02-29"])refused("no presumed calendar or exact check date "+entered,entered,null,"MISSING_VERIFIED_CALENDAR_OR_DEADLINES");
for(const invalid of[undefined,null,"","I am not sure","2025-02-29","2025-02-30","2028-02-30","2025-08-01T00:00:00Z",[],["2025-08-01"],{value:"2025-08-01",unknown:true},{value:"2025-08-01",unknown:false},true]){
 refused("invalid/unknown order entry remains unresolved "+JSON.stringify(invalid),invalid,calendar("2025-10-01","2025-10-10"),"INVALID_ORDER_ENTRY_DATE");
}
const valid=calendar("2025-10-04","2025-10-10");
for(const[label,change]of[
 ["wrong jurisdiction",{jurisdiction:"NY"}],["unconfirmed",{confirmedComplete:false}],["unknown completeness",{confirmedComplete:undefined}],
 ["missing source",{verificationSource:""}],["blank source",{verificationSource:"  "}],["invalid start",{start:"2025-02-30"}],
 ["window begins after day61",{start:"2025-10-05"}],["window ends before day61",{end:"2025-10-03"}],
 ["holiday list absent",{legalHolidays:undefined}],["invalid holiday",{legalHolidays:["2025-02-30"]}],
 ["unknown coverage wrapper",{unknown:true,value:valid,jurisdiction:undefined}]
]){
 refused("unverified/malformed calendar "+label,"2025-08-04",{...valid,...change},"MISSING_VERIFIED_CALENDAR_OR_DEADLINES");
}
refused("coverage stops during expiry weekend","2025-08-04",calendar("2025-10-04","2025-10-05"),"CALENDAR_COVERAGE_ENDS_BEFORE_ADJUSTED_EXPIRATION");
refused("coverage stops before product check","2025-08-04",calendar("2025-10-04","2025-10-06"),"CALENDAR_COVERAGE_ENDS_BEFORE_FIRST_CHECK");
refused("holiday chain exceeds coverage","2025-08-04",calendar("2025-10-04","2025-10-07",["2025-10-06","2025-10-07"]),"CALENDAR_COVERAGE_ENDS_BEFORE_ADJUSTED_EXPIRATION");
refused("expiry known but first-check holiday exceeds coverage","2025-08-01",calendar("2025-10-01","2025-10-02",["2025-10-02"]),"CALENDAR_COVERAGE_ENDS_BEFORE_FIRST_CHECK");
check("caller cannot inject explicit fallback dates through the calendar argument",()=>{
 const injected={...valid,confirmedComplete:false,verifiedAdjustedExpiration:"2025-10-06",verifiedFirstCheckDate:"2025-10-07",deadlineVerificationSource:"untrusted supplied dates"};
 assert.equal(deadline("2025-08-04",injected).eligible,false);
});
check("bounded EN/ES copy distinguishes calendar dependency, adjusted period and product check",()=>{
 assert.equal(copy.length,2);assert.match(copy[0],/61-day period/);assert.match(copy[0],/next court business day after that adjusted period/);
 assert.match(copy[0],/not added statutory time/);assert.match(copy[0],/requires verified North Dakota court-calendar coverage/);assert.match(copy[0],/No ordinary participant petition/);
 assert.match(copy[1],/61 días/);assert.match(copy[1],/siguiente día hábil judicial/);assert.match(copy[1],/no un plazo legal adicional/);assert.match(copy[1],/cobertura verificada/);assert.match(copy[1],/No se necesita una petición ordinaria/);
});
console.log(checks+"/"+checks+" automatic deadline controls passed; synthetic calendar arithmetic only. No deployed verified calendar, exact live deadline, legal adoption or production proof is claimed.");
