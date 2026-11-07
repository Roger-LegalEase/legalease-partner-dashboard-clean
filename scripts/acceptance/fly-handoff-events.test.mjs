import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeExit, cleanNativeExit, projectNativeEvents} from './fly-handoff-events.mjs';
const direct = payload => ({type:'exit',timestamp:1000,request:{exit_event:payload}});
const nested = payload => ({type:'exit',timestamp:1000,request:{MonitorEvent:{exit_event:payload}}});
test('official Fly direct and monitor payloads accept omitted typed zero/false values',()=>{
 for(const event of [direct({requested_stop:true}),nested({requested_stop:true}),direct({requested_stop:true,exit_code:0,guest_exit_code:0,oom_killed:false}),direct({requested_stop:true,guest_signal:-1,signal:-1})]){
  const result=cleanNativeExit(event);assert(result);assert.equal(result.exit_code,0);assert.equal(result.guest_exit_code,0);assert.equal(result.oom_killed,false);
 }
});
test('absence of an exit object or requested-stop fact cannot become a clean exit',()=>{
 for(const event of [{type:'exit'},direct(null),direct({}),nested({}),{type:'exit',request:{MonitorEvent:{}}},direct({requested_stop:false})])assert.equal(cleanNativeExit(event),null);
});
test('explicit null, wrong types, nonzero codes, forced kill and OOM remain failures',()=>{
 for(const change of [{exit_code:null},{guest_exit_code:null},{oom_killed:null},{exit_code:'0'},{oom_killed:0},{exit_code:1},{exit_code:-1},{guest_exit_code:143},{signal:9},{guest_signal:9},{oom_killed:true},{requested_stop:'true'}])assert.equal(cleanNativeExit(direct({requested_stop:true,...change})),null);
});
test('conflicting dual payloads cannot pick whichever passes',()=>{
 const event=direct({requested_stop:true});event.request.MonitorEvent={exit_event:{requested_stop:true,exit_code:1}};assert.equal(nativeExit(event),null);
 event.request.MonitorEvent.exit_event.exit_code=0;assert(cleanNativeExit(event));
});
test('retained projection preserves missing fields and removes unrelated request/secret values',()=>{
 const event=nested({requested_stop:true,command:'SYNTHETIC_SECRET',exit_code:'SYNTHETIC_SECRET'});event.request.secret='SYNTHETIC_SECRET';event.env='SYNTHETIC_SECRET';
 const projection=projectNativeEvents([event]);assert(!JSON.stringify(projection).includes('SYNTHETIC_SECRET'));assert.equal(projection[0].request.MonitorEvent.exit_event.exit_code,'INVALID_NATIVE_TYPE');assert(!Object.hasOwn(projection[0].request.MonitorEvent.exit_event,'guest_exit_code'));assert.equal(cleanNativeExit(projection[0]),null);
 const clean=projectNativeEvents([direct({requested_stop:true})]);assert.deepEqual(clean[0].request.exit_event,{requested_stop:true});assert(cleanNativeExit(clean[0]));
});
