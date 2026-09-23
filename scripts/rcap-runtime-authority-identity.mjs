import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const IDENTITY_INPUTS = ['src','data','public','design-handoff','scripts','package.json','package-lock.json','tsconfig.json','next.config.ts','postcss.config.mjs','tailwind.config.ts','tsconfig.clinic-mode.json','eslint.config.mjs','.gitignore','.vercelignore','vercel.json','.npmrc'];
export const sha256 = data=>crypto.createHash('sha256').update(data).digest('hex');
export function executionIdentity(root) {
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
  const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--',...IDENTITY_INPUTS],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).split('\0').filter(Boolean);
  // Include physical inputs too: .gitignore must not conceal an extra runtime
  // JSON file, an untracked helper, or a symlink planted in a source tree.
  function enumerate(relative) {
    const absolute=path.join(root,relative);
    let stat;try{stat=fs.lstatSync(absolute);}catch(error){if(error.code==='ENOENT')return;throw error;}
    if(stat.isDirectory()) for(const entry of fs.readdirSync(absolute)) enumerate(path.join(relative,entry));
    else files.push(relative.split(path.sep).join('/'));
  }
  for(const input of IDENTITY_INPUTS) enumerate(input);
  const rows=[...new Set(files)].sort().map(file=>{
    const absolute=path.join(root,file),stat=fs.lstatSync(absolute);
    // Historical evidence contains deliberate synthetic symlinks. Bind the
    // link bytes (Git's input), never dereference unrelated external targets.
    // Any such link reached by a runtime probe is subject to the realpath guard.
    if(stat.isSymbolicLink()) {const target=fs.readlinkSync(absolute);return {file,kind:'symlink',target,bytes:Buffer.byteLength(target),sha256:sha256(target)};}
    if(!stat.isFile())throw Error(`Source identity refuses special input: ${file}`);
    return {file,kind:'file',executable:Boolean(stat.mode&0o111),bytes:stat.size,sha256:sha256(fs.readFileSync(absolute))};
  });
  // Absent optional config is part of the identity too.
  const missing=IDENTITY_INPUTS.filter(p=>!fs.existsSync(path.join(root,p))).sort();
  return {candidateCommit:git('rev-parse','HEAD'),treeSha:git('rev-parse','HEAD^{tree}'),sourceIdentitySha256:sha256(JSON.stringify({rows,missing})),packageLockSha256:sha256(fs.readFileSync(path.join(root,'package-lock.json'))),coveredInputs:IDENTITY_INPUTS,missing,files:rows};
}
