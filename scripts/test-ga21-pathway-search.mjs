import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {optionalPathwaySearchMatches:matches}=await import('../src/components/expungement-ai/screening/fields/OptionalPathwayContextField.tsx');
// GA-21: the lead's fixed ordinary-term corpus, including concepts with no choice in a given state.
const concepts={"en":{"dui":["dui","dwi","owi","driving","impaired","influence","intoxicat"],"drunk":["dui","dwi","driving","impaired","influence","intoxicat","alcohol"],"drug":["drug","controlled","narcotic","marijuana","cannabis","possession"],"weed":["marijuana","cannabis"],"pot":["marijuana","cannabis"],"marijuana":["marijuana","cannabis"],"juvenile":["juvenile","youth","minor","under 18","under 21"],"kid":["juvenile","youth","minor"],"arrest":["arrest"],"dismissed":["dismiss"],"not guilty":["acquit","not guilty"],"acquitted":["acquit"],"misdemeanor":["misdemeanor"],"felony":["felony","felonies"],"traffic":["traffic","driving","vehicle"],"theft":["theft","shoplift","larceny","stealing"],"shoplifting":["theft","shoplift","larceny"],"pardon":["pardon","clemency"],"probation":["probation","deferred","diversion"],"diversion":["diversion","deferred"],"domestic":["domestic"],"seal":["seal"],"expunge":["expung"],"first offense":["first","first-time"],"first time":["first","first-time"],"victim":["victim","trafficking"],"trafficking":["trafficking"],"identity":["identity","mistaken","misattribut","wrong person"],"wrong person":["identity","mistaken","misattribut"],"prostitution":["prostitution","sex work","commercial sex"],"clean slate":["clean slate","automatic"],"automatic":["automatic","clean slate"]},"es":{"dui":["dui","dwi","conducir","ebri","alcohol","influencia","intoxic"],"alcohol":["alcohol","ebri","dui","dwi","conducir"],"ebrio":["ebri","alcohol","dui","conducir"],"droga":["droga","sustancia","narc","marihuana","cannabis","posesi"],"drogas":["droga","sustancia","narc","marihuana","cannabis"],"marihuana":["marihuana","cannabis","mariguana"],"mariguana":["marihuana","cannabis","mariguana"],"hierba":["marihuana","cannabis"],"menor":["menor","juvenil","joven"],"juvenil":["juvenil","menor","joven"],"arresto":["arrest"],"desestimado":["desestim","sobrese"],"absuelto":["absuel","absoluci","no culpable"],"inocente":["absuel","no culpable","inocen"],"delito menor":["delito menor","falta","menor gravedad"],"falta":["falta","delito menor"],"delito grave":["delito grave","grave","mayor"],"tránsito":["tránsito","transito","tráfico","conducir","vehículo"],"tráfico":["tráfico","trafico","tránsito","trata"],"robo":["robo","hurto"],"hurto":["hurto","robo"],"indulto":["indulto","clemencia","perdón"],"perdón":["perdón","indulto","clemencia"],"libertad condicional":["libertad condicional","probatoria","diferid","desv"],"probatoria":["probatoria","libertad condicional","diferid"],"doméstica":["domést","domest"],"sellar":["sell"],"sellado":["sell"],"borrar":["borr","elimin","cancel","expung"],"eliminar":["elimin","borr","cancel","expung"],"primera vez":["primer","primera"],"primer delito":["primer","primera"],"víctima":["víctima","victima","trata"],"trata":["trata"],"identidad":["identidad","equivoc","error"],"persona equivocada":["identidad","equivoc","error"],"prostitución":["prostituci","sexual"],"automático":["automátic","automatic"]}};
const profiles=JSON.parse(fs.readFileSync('src/lib/expungement-ai/frontend/profiles/all51.json'));
const failures=[],recovered=[];let checks=0,termChecks=0,originalMisses=0;
const check=(value,name)=>{checks++;if(!value)failures.push(name)};
for(const [state,profile] of Object.entries(profiles)){
 const question=profile.questions.find(q=>q.id==='possible_pathway_context');assert(question);
 for(const locale of ['en','es']){
  const labels=question.options.map(option=>{const d=question.optionDisplay?.[option];return locale==='es'?d?.translations?.es?.label??d?.label??option:d?.label??option});
  for(const [term,marks] of Object.entries(concepts[locale])){
   termChecks++;
   const literal=labels.filter(label=>label.toLowerCase().includes(term));
   const intended=labels.filter(label=>marks.some(mark=>label.toLowerCase().includes(mark)));
   for(const label of literal)check(matches(label,term,locale),'literal search preserved '+[state,locale,term,label].join('/'));
   if(intended.length)check(intended.some(label=>matches(label,term,locale)),'intended concept found '+[state,locale,term].join('/'));
   if(!literal.length&&intended.length){originalMisses++;if(intended.some(label=>matches(label,term,locale)))recovered.push({state,locale,term});}
  }
  for(const label of labels){check(matches(label,'   ',locale),'blank restores choice '+state+'/'+locale);check(!matches(label,'zzzz-no-match-qa',locale),'no match remains possible '+state+'/'+locale);}
 }
}
for(const [label,query,locale,expected] of [
 ['Dismissal of charges','dismissed','en',true],['Desestimación del caso','desestimado','es',true],
 ['Sellado de antecedentes','sellar','es',true],['Absolución','absuelto','es',true],
 ['Juvenile sealing','kid','en',true],['Cannabis conviction','weed','en',true],
 ['Tránsito','  TRANSITO  ','es',true],['Dismissal of charges','dismissed zebra','en',false],
 ['Juvenile sealing','pardon','en',false],['Criminal record','weed','en',false],
 ['Criminal record','constructor','en',false],['Criminal record','__proto__','es',false]
])check(matches(label,query,locale)===expected,'boundary '+JSON.stringify([label,query,locale,expected]));
check(termChecks===3570,'fixed term corpus size');check(recovered.length===originalMisses,'every current concept miss recovered');
const report={status:failures.length?'FAIL':'PASS',checks,termChecks,originalMisses,recovered:recovered.length,failures,recoveredCases:recovered};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,recoveredCases:undefined}));assert.equal(failures.length,0);
