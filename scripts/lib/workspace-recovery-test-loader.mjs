import {pathToFileURL} from 'node:url';
import path from 'node:path';
const fixture=pathToFileURL(path.join(process.cwd(),'scripts/lib/workspace-recovery-test-db.mjs')).href;
export async function resolve(specifier,context,next){
 if(['@/lib/supabase/server','next/navigation','next/font/google'].includes(specifier))return {url:fixture,shortCircuit:true};
 return next(specifier,context);
}
