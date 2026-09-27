// Local only: compile the unchanged consumer form and its real dependencies.
// Usage: node scripts/rcap-clinic-resume-sign-in-fixture.mjs /new/fixture/path
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const root=process.cwd(),out=path.resolve(process.argv[2]??'');assert.ok(process.argv[2]&&!fs.existsSync(out),'new explicit fixture directory required');
assert.equal(JSON.parse(fs.readFileSync('node_modules/next/package.json')).version,'16.2.6');
fs.mkdirSync(out,{recursive:true});fs.cpSync('src',path.join(out,'src'),{recursive:true});
for(const file of ['package.json','package-lock.json'])fs.copyFileSync(file,path.join(out,file));
fs.symlinkSync(fs.realpathSync('node_modules'),path.join(out,'node_modules'));
fs.mkdirSync(path.join(out,'app/expungement-ai/sign-in'),{recursive:true});
fs.writeFileSync(path.join(out,'app/layout.tsx'),'export default function Layout({children}:{children:React.ReactNode}){return <html><body>{children}</body></html>}');
fs.writeFileSync(path.join(out,'app/expungement-ai/sign-in/page.tsx'),'import {ConsumerSignInForm} from "@/components/expungement-ai/ConsumerSignInForm"; import {LocalizationProvider} from "@/components/expungement-ai/LocalizationProvider"; export default function Page(){return <LocalizationProvider><ConsumerSignInForm/></LocalizationProvider>}');
fs.writeFileSync(path.join(out,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',lib:['dom','esnext'],module:'esnext',moduleResolution:'bundler',jsx:'react-jsx',esModuleInterop:true,resolveJsonModule:true,baseUrl:'.',paths:{'@/*':['./src/*']},skipLibCheck:true},include:['app/**/*.tsx'],exclude:['node_modules']}));
// Common root permits the existing locked node_modules symlink; no aliases or
// replacement auth/React modules, no disabled compiler optimization.
let common=out;const deps=fs.realpathSync('node_modules');while(common!==path.parse(common).root&&!deps.startsWith(common+path.sep))common=path.dirname(common);if(common==='')common='/';
fs.writeFileSync(path.join(out,'next.config.mjs'),`export default {turbopack:{root:${JSON.stringify(common)}},experimental:{cpus:2},typescript:{ignoreBuildErrors:true}};`);
if(process.argv.includes('--connected')){
 const {RESUME:r}=await import('./rcap-clinic-resume-contract.mjs');
 const ts=(await import('typescript')).default;
 const original=fs.readFileSync('src/app/briefcase/[packetId]/page.tsx','utf8');const ast=ts.createSourceFile('page.tsx',original,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const ready=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='ReadyPacket').getText(ast);
 const write=(rel,body)=>{fs.mkdirSync(path.dirname(path.join(out,rel)),{recursive:true});fs.writeFileSync(path.join(out,rel),body);};
 write('app/ready.tsx','import Link from "next/link";import {Download} from "lucide-react";import {LocalizedRuntimeText} from "@/components/expungement-ai/LocalizationProvider";\n'+ready+'\nexport {ReadyPacket};');
 write('app/briefcase/page.tsx','export default function Page(){return <h1>Disposable Briefcase fixture</h1>}');
 write(`app/briefcase/${r.item}/page.tsx`,`import {ReadyPacket} from '../../ready';export default function Page(){return <ReadyPacket itemId="${r.item}" artifact={{status:'ready',pageCount:16,documents:[{kind:'packet',fileName:'fixture.pdf',downloadPath:'/api/rcap/packets/${r.job}/download'}]}} nextSteps={[]} mississippiClinicPacket={true}/>} `);
 write('app/clinic/mississippi-volunteer-lawyers-demo/page.tsx','export default function Page(){return <h1>Clean disposable entry</h1>}');
 const q={id:r.clinicCase,participantUserId:r.owner,jurisdiction:'MS',queueStatus:'packet_ready',routeDisposition:'packet',courtIdentityVerified:false};
 write(`app/clinic/staff/${r.event}/queue/page.tsx`,`import {ClinicQueueClient} from '@/components/clinic-mode/ClinicQueueClient';export default function Page(){return <ClinicQueueClient eventId="${r.event}" initialCases={[${JSON.stringify(q)}]}/>} `);
 write('app/api/rcap/packets/[jobId]/download/route.ts',`import {NextResponse} from 'next/server';export async function GET(r:Request,{params}:{params:Promise<{jobId:string}>}){return NextResponse.json({routerProbe:true,jobId:(await params).jobId})}`);
}
const log=fs.openSync(path.join(out,'build.log'),'w');try{execFileSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build'],{cwd:out,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED:'false',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'synthetic-site-key',NEXT_PUBLIC_SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-public-key'},stdio:['ignore',log,log]});}finally{fs.closeSync(log);}
console.log('Built local real-component fixture: '+out);
