/** Ordinary protected form fields mapped to the existing Maryland native inventories.
 * Blank amounts remain unknown. Only explicit zero answers become an empty category.
 */
type Facts = Readonly<Record<string, unknown>>;
type Question = {id: string; type: string; en: string; es: string; options?: string[]; optionsEn?: string[]; optionsEs?: string[]};
const value=(v:unknown):unknown=>v&&typeof v==="object"&&!Array.isArray(v)?(v as {unknown?:unknown}).unknown===true?undefined:"value" in v?(v as {value:unknown}).value:v:v;
const text=(v:unknown)=>typeof value(v)==="string"?(value(v) as string).trim():"";
const bool=(v:unknown):boolean|undefined=>value(v)===true||text(v).toLowerCase()==="yes"||text(v).toLowerCase()==="true"?true:value(v)===false||text(v).toLowerCase()==="no"||text(v).toLowerCase()==="false"?false:undefined;
function count(v:unknown,max=25){const raw=value(v);const s=typeof raw==="number"?String(raw):text(v);return /^(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(+s)&&+s<=max?+s:undefined;}
function cents(v:unknown){const raw=value(v),s=typeof raw==="number"?String(raw):text(v);if(!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(s))return undefined;const [whole,fraction=""]=s.split(".");const n=Number(whole)*100+Number(fraction.padEnd(2,"0"));return Number.isSafeInteger(n)?n:undefined;}
const entry=(id:string,en:string,es:string):Question=>({id,type:"text",en,es});
const yes=(id:string,en:string,es:string):Question=>({id,type:"yes_no_unknown",en,es});
const choice=(id:string,options:string[],optionsEn:string[],optionsEs:string[],en:string,es:string):Question=>({id,type:"single_choice",options,optionsEn,optionsEs,en,es});
const INCOME=[['wages','wages before taxes','salarios antes de impuestos'],['commissions','commissions and bonuses','comisiones y bonificaciones'],['ssi','Social Security/SSI','Seguro Social/SSI'],['retirement','retirement income','ingresos de jubilación'],['unemployment','unemployment insurance','seguro de desempleo'],['cashAssistance','temporary cash assistance','asistencia temporal en efectivo'],['alimony','alimony or spousal support','pensión alimenticia conyugal'],['rent','rent received from tenants','alquiler recibido de inquilinos'],['other','other income (excluding SNAP/food stamps)','otros ingresos (sin incluir SNAP/cupones de alimentos)']] as const;
const PROPERTY=[['realEstate','real estate other than your principal home','bienes inmuebles distintos de su vivienda principal'],['vehicles','vehicles other than one excluded vehicle','vehículos distintos de un vehículo excluido'],['bank','bank accounts','cuentas bancarias'],['stocks','stocks and other securities','acciones y otros valores'],['other','other property excluding ordinary personal items','otros bienes sin incluir artículos personales comunes']] as const;
const DEBTS=[['creditCard','credit-card debt','deudas de tarjetas de crédito'],['carLoan','car loans','préstamos de vehículos'],['other','other debts','otras deudas']] as const;
const amountQuestion=(id:string,en:string,es:string)=>entry(id,`What is the dollar amount of ${en}? Enter 0 only if none; leave unknown if you do not know.`,`¿Cuál es el importe en dólares de ${es}? Escriba 0 solo si no hay; déjelo desconocido si no lo sabe.`);

export function marylandCannabisStructuredQuestions(facts:Facts): Question[]{
 const q:Question[]=[];
 if(bool(facts.md_cannabis_only_charge)===false){
  q.push(entry("md_cannabis_additional_charge_count","How many other charges arose from this same incident? Count every charge, including charges that you are not asking to expunge. Enter a whole number from1to25.","¿Cuántos otros cargos surgieron de este mismo incidente? Cuente todos los cargos, incluidos los que no solicita eliminar. Escriba un número entero de1a25."));
  const n=count(facts.md_cannabis_additional_charge_count);
  if(n&&n>0)for(let i=1;i<=n;i++){
   const p=`md_cannabis_other_${i}_`;
   q.push(entry(p+"id",`What is the recorded charge number for other charge${i}?`,`¿Cuál es el número registrado del otro cargo${i}?`),entry(p+"description",`Describe other charge${i} as recorded.`,`Describa el otro cargo${i} tal como figura en el expediente.`),entry(p+"statute",`What exact statute is recorded for other charge${i}?`,`¿Qué disposición legal exacta figura para el otro cargo${i}?`),entry(p+"disposition",`What is the actual recorded disposition of other charge${i}?`,`¿Cuál es el resultado real registrado del otro cargo${i}?`),yes(p+"minor_traffic",`Is other charge${i} a minor traffic offense? Do not infer this from a short title.`,`¿Es el otro cargo${i} una infracción menor de tránsito? No lo deduzca de un título abreviado.`),yes(p+"cannabis",`Does other charge${i} involve cannabis?`,`¿El otro cargo${i} involucra cannabis?`));
  }
 }
 if(text(facts.md_cannabis_fee_choice)==="waiver"){
  q.push(entry("md_cannabis_fin_household","How many family members are in your household, including you? Do not include renters or temporary guests.","¿Cuántos familiares hay en su hogar, incluyéndose usted? No incluya inquilinos ni huéspedes temporales."),choice("md_cannabis_fin_period",["week","month","year"],["Per week","Per month","Per year"],["Por semana","Por mes","Por año"],"Which single period applies to every income amount below?","¿Qué período único corresponde a todos los importes de ingresos que siguen?"),amountQuestion("md_cannabis_fin_total","total household income before taxes for that period","ingresos totales del hogar antes de impuestos para ese período"));
  for(const [key,en,es]of INCOME)q.push(amountQuestion("md_cannabis_fin_income_"+key,en+" for that same period",es+" para ese mismo período"));
  for(const [key,en,es]of PROPERTY){const id="md_cannabis_fin_property_"+key;q.push(amountQuestion(id,en,es));if(key==="other"&&(cents(facts[id])??0)>0)q.push(entry(id+"_description","Describe the actual other property.","Describa los otros bienes reales."));}
  for(const [key,en,es]of DEBTS){const id="md_cannabis_fin_debt_"+key;q.push(amountQuestion(id,en,es));if((cents(facts[id])??0)>0)q.push(amountQuestion(id+"_monthly","monthly payments on "+en,"pagos mensuales de "+es),entry(id+"_description",`Identify the actual creditor or describe the ${en}.`,`Identifique al acreedor real o describa ${es}.`));}
  q.push(yes("md_cannabis_fin_income_complete","Have you listed all household income and excluded SNAP/food stamps?","¿Ha incluido todos los ingresos del hogar y excluido SNAP/cupones de alimentos?"),yes("md_cannabis_fin_property_complete","Have you listed all required property and excluded your principal home, one vehicle and ordinary personal items?","¿Ha incluido todos los bienes requeridos y excluido su vivienda principal, un vehículo y los artículos personales comunes?"),yes("md_cannabis_fin_debts_complete","Have you listed every actual debt requested by this form?","¿Ha incluido todas las deudas reales que solicita este formulario?"));
 }
 return q;
}

export function adaptMarylandCannabisStructuredFacts(input:Facts):{facts:Facts;missingFactIds:string[]}{
 const facts:Record<string,unknown>={...input},missingFactIds:string[]=[];
 const requireText=(id:string)=>{const v=text(input[id]);if(!v||v==="unknown")missingFactIds.push(id);return v;};
 const requireBool=(id:string)=>{const v=bool(input[id]);if(v===undefined)missingFactIds.push(id);return v;};
 const requireCents=(id:string)=>{const v=cents(input[id]);if(v===undefined)missingFactIds.push(id);return v;};
 if(bool(input.md_cannabis_only_charge)===false&&!Object.hasOwn(input,"md_cannabis_charge_inventory")){
  const n=count(input.md_cannabis_additional_charge_count);
  if(!n){missingFactIds.push("md_cannabis_additional_charge_count");}
  else{
   const primary={id:text(input.md_cannabis_charge_id),description:text(input.charge)||"Cannabis charge",statute:text(input.md_cannabis_charge_statute),substance:"cannabis",disposition:text(input.md_cannabis_charge_disposition),convictionDate:text(input.md_cannabis_conviction_date),basis:text(input.md_cannabis_basis),requested:true};
   const charges:unknown[]=[primary];
   for(let i=1;i<=n;i++){const p=`md_cannabis_other_${i}_`;charges.push({id:requireText(p+"id"),description:requireText(p+"description"),statute:requireText(p+"statute"),disposition:requireText(p+"disposition"),minorTraffic:requireBool(p+"minor_traffic"),substance:requireBool(p+"cannabis")===true?"cannabis":"other",requested:false});}
   if(!missingFactIds.length)facts.md_cannabis_charge_inventory=charges;
  }
 }
 if(text(input.md_cannabis_fee_choice)==="waiver"&&!Object.hasOwn(input,"md_cannabis_financial_inventory")){
  const household=count(input.md_cannabis_fin_household,Number.MAX_SAFE_INTEGER);if(!household)missingFactIds.push("md_cannabis_fin_household");
  const period=requireText("md_cannabis_fin_period");if(!["week","month","year"].includes(period)&&!missingFactIds.includes("md_cannabis_fin_period"))missingFactIds.push("md_cannabis_fin_period");
  const totalCents=requireCents("md_cannabis_fin_total"),income:Record<string,number>={},property:Record<string,unknown>={},debts:Record<string,unknown>={};
  for(const [key]of INCOME){const v=requireCents("md_cannabis_fin_income_"+key);if(v!==undefined&&v>0)income[key]=v;}
  for(const [key]of PROPERTY){const id="md_cannabis_fin_property_"+key,v=requireCents(id);if(v!==undefined&&v>0)property[key]={cents:v,...(key==="other"?{description:requireText(id+"_description")}: {})};}
  for(const [key]of DEBTS){const id="md_cannabis_fin_debt_"+key,v=requireCents(id);if(v!==undefined&&v>0)debts[key]={cents:v,monthlyCents:requireCents(id+"_monthly"),description:requireText(id+"_description")};}
  const incomeComplete=requireBool("md_cannabis_fin_income_complete"),propertyComplete=requireBool("md_cannabis_fin_property_complete"),debtsComplete=requireBool("md_cannabis_fin_debts_complete");
  if(!missingFactIds.length)facts.md_cannabis_financial_inventory={householdSize:household,period,totalCents,income,property,debts,incomeComplete,propertyComplete,debtsComplete,snapExcluded:incomeComplete,excludedHomeVehiclePersonalItems:propertyComplete};
 }
 return {facts,missingFactIds:[...new Set(missingFactIds)]};
}
