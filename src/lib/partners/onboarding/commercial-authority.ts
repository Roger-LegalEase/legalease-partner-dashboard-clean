export type CommercialAuthority = {
 id:string; workspace_id:string; kind:"verified_paid"|"sponsored"|"purchase_order";
 document_id:string; document_hash:string; authority_reference:string; expires_at:string;
 access_mode:string; packet_entitlement_id:string; actor_auth_user_id:string;
};
export type CommercialFacts = {payment_status:string|null;stripe_payment_intent_id:string|null;paid_at:string|null;payment_amount:number|null;qualification_status:string|null};
/** No mutable override, demo payment, or undocumented contract can satisfy this rule. */
export function commercialAuthorityValid(authority:CommercialAuthority|null,facts:CommercialFacts|null,now=Date.now()){
 if(!authority||!facts||facts.qualification_status!=="qualified"||facts.payment_status==="demo_paid"||Date.parse(authority.expires_at)<=now||!Number.isFinite(Date.parse(authority.expires_at)))return false;
 if(!authority.document_id||!/^[a-f0-9]{64}$/.test(authority.document_hash)||authority.authority_reference.trim().length<10||!authority.packet_entitlement_id)return false;
 if(authority.kind==="verified_paid")return facts.payment_status==="paid"&&/^pi_[A-Za-z0-9]+$/.test(facts.stripe_payment_intent_id??"")&&Boolean(facts.paid_at&&Date.parse(facts.paid_at)<=now)&&Number.isFinite(Number(facts.payment_amount))&&Number(facts.payment_amount)>0;
 return authority.kind==="sponsored"||authority.kind==="purchase_order";
}
