import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertLocalTarget} from './fixture.mjs';

test('accept exact loopback origins',()=>{
  for(const value of ['http://127.0.0.1:3139','http://localhost:54321','http://[::1]:54321'])assert.equal(assertLocalTarget(value),new URL(value).origin);
});
test('reject hosted targets, deceptive loopback names, credentials and paths',()=>{
  for(const value of ['https://project.supabase.co','https://expungement.ai','http://127.0.0.1.example.test','http://127.0.0.1@remote.test','http://user:password@127.0.0.1:54321','http://127.0.0.1:54321/rest/v1','http://127.0.0.1:54321?target=production','file:///tmp/socket','http://0.0.0.0:54321'])assert.throws(()=>assertLocalTarget(value));
});
