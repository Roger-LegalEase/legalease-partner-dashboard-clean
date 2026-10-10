// Isolated PGlite adapter. No network, credentials or hosted sessions.
export {redirect} from './internal-auth-test-doubles.mjs';
export function useRouter(){return {refresh(){},push(){},replace(){}};}
export function usePathname(){return '/partner/onboarding';}
export function useSearchParams(){return new URLSearchParams();}
export function Inter(){return {className:'',variable:''};}
export const IBM_Plex_Mono=Inter;
let db, fault;
export const operations=[];
export function setWorkspaceDatabase(value){db=value;}
export function setWorkspaceFault(value){fault=value;}
const ident=s=>{if(!/^[a-z_][a-z0-9_]*$/i.test(s))throw Error('Unsupported identifier');return '"'+s+'"'};
const val=v=>v===null?'null':typeof v==='number'?String(v):typeof v==='boolean'?String(v):"'"+String(typeof v==='object'?JSON.stringify(v):v).replaceAll("'","''")+"'";
async function sql(query,operation){
 operations.push({operation,query});
 const injected=fault?.(query,operation);if(injected)return {data:null,error:injected};
 try{return {data:(await db.query(query)).rows,error:null};}catch(e){operations.at(-1).error={code:e.code,message:e.message};return {data:null,error:{code:e.code,message:e.message}};}
}
class Query {
 constructor(table){this.table=table;this.filters=[];this.orders=[];this.cols='*';}
 insert(value){this.mutation='insert';this.value=value;return this;}
 update(value){this.mutation='update';this.value=value;return this;}
 select(cols='*',opts={}){this.cols=cols;this.opts=opts;return this;}
 eq(k,v){this.filters.push(ident(k)+'='+val(v));return this;}
 neq(k,v){this.filters.push(ident(k)+'<>'+val(v));return this;}
 is(k,v){this.filters.push(ident(k)+' is '+(v===null?'null':val(v)));return this;}
 in(k,v){this.filters.push(v.length?ident(k)+' in ('+v.map(val).join(',')+')':'false');return this;}
 gt(k,v){this.filters.push(ident(k)+'>'+val(v));return this;}
 gte(k,v){this.filters.push(ident(k)+'>='+val(v));return this;}
 lt(k,v){this.filters.push(ident(k)+'<'+val(v));return this;}
 order(k,o={}){this.orders.push(ident(k)+(o.ascending===false?' desc':' asc'));return this;}
 limit(n){this.n=n;return this;}
 maybeSingle(){this.one=true;return this;}
 single(){this.one=true;this.required=true;return this;}
 async run(){let cols=this.cols==='*'?'*':this.cols.split(',').map(x=>ident(x.trim())).join(',');const where=this.filters.length?' where '+this.filters.join(' and '):'';
 if(this.mutation){const keys=Object.keys(this.value),q=this.mutation==='insert'?'insert into public.'+ident(this.table)+'('+keys.map(ident).join(',')+') values('+keys.map(k=>val(this.value[k])).join(',')+') returning '+cols:'update public.'+ident(this.table)+' set '+keys.map(k=>ident(k)+'='+val(this.value[k])).join(',')+where+' returning '+cols;const r=await sql(q,'write:'+this.table);if(this.one&&!r.error)r.data=r.data[0]??null;return r;}
 const q='select '+(this.opts?.head?'count(*) as count':cols)+' from public.'+ident(this.table)+(this.filters.length?' where '+this.filters.join(' and '):'')+(this.orders.length?' order by '+this.orders.join(','):'')+(this.n?' limit '+this.n:'');let r=await sql(q,'table:'+this.table);if(r.error)return r;if(this.opts?.head)return {data:null,error:null,count:Number(r.data[0].count)};if(this.one){if(r.data.length>1||(this.required&&!r.data.length))return {data:null,error:{code:'PGRST116'}};r.data=r.data[0]??null;}return r;}
 then(a,b){return this.run().then(a,b)}
}
const client={from:t=>new Query(t),rpc:async(name,args)=>{
 const types=(await db.query('select jsonb_object_agg(proargnames[i+1],format_type(proargtypes[i],null)) types from pg_proc cross join lateral generate_series(0,pronargs-1) i where proname=$1',[name])).rows[0]?.types??{};
 const params=Object.entries(args).map(([k,v])=>ident(k)+'=>'+(Array.isArray(v)&&types[k]?.endsWith('[]')?'array['+v.map(val).join(',')+']::'+types[k]:val(v))).join(',');const set=(await db.query('select proretset from pg_proc where proname=$1',[name])).rows[0]?.proretset;
 const r=await sql(set?'select to_jsonb(t) value from public.'+ident(name)+'('+params+') t':'select public.'+ident(name)+'('+params+') as value','rpc:'+name);if(!r.error)r.data=set?r.data.map(row=>row.value):r.data[0]?.value;return r;
}};
export function getSupabaseAdminClient(){return client;}
export function isSupabaseConfigured(){return true;}
