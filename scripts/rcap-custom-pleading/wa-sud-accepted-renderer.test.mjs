import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifyWaAcceptedRenderer, WA_ACCEPTED_RENDERER } from './wa-sud-accepted-renderer.mjs';

test('only exact accepted Washington renderer qualifies; all ten actual inputs need no wrapper',()=>{
  const source=fs.readFileSync(WA_ACCEPTED_RENDERER,'utf8');
  assert.deepEqual(verifyWaAcceptedRenderer(source),{componentFixtures:10,lines:488});
  for(const changed of [source+'\n',source.replace('const SPEC = {','const SPEC = {"unreviewed":true,'),source.replace('const wrap = (line) => {','const wrap = (line) => { /* changed */')]) {
    assert.notEqual(changed,source);
    assert.throws(()=>verifyWaAcceptedRenderer(changed));
  }
});
