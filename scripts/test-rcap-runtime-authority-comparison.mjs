import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {test} from 'node:test';
import {compareConsumerAuthority, probeConsumerAuthority} from './rcap-runtime-authority-comparison.mjs';
import {guardPackagedRoot} from './rcap-runtime-authority-isolation.mjs';

const modes = ['successor'];
const probe = (reads = ['A', 'B'], selectedModes = modes) => ({
  modes: [...selectedModes], reads: reads.map(p => ({path:p})), escapeCount:0,
  resets:['authority#reset'], probeRoute:{id:'fixture'}, unmigratedSibling:{id:'held'},
  results:{successor:{decisionId:'approved'}, resolver:{route:'available',unmigratedSibling:'refused'}}
});
const fixture = () => ({consumer:'/fixture', structuralDependencies:['A','B','C'], traceFiles:['A','B','C'], modes, source:probe(), packaged:probe()});

test('lazy structural dependency can remain unread while all three invariants pass', () => {
  const result=compareConsumerAuthority(fixture());
  assert.equal(result.structural_dependency_count,3);
  assert.equal(result.structural_missing_count,0);
  assert.equal(result.source_read_count,2);assert.equal(result.packaged_read_count,2);
  assert.deepEqual(result.read_set_difference,{missing_in_packaged:[],extra_in_packaged:[]});
  assert.equal(result.structural_trace_closed,true);assert.equal(result.executed_read_equal,true);
  assert.equal(result.behavior_equal,true);assert.equal(result.pass,true);
});

test('omitting an unread structural dependency is RED independently of reads and behavior', () => {
  const input=fixture();assert.equal(compareConsumerAuthority(input).pass,true);
  input.traceFiles=['A','B'];
  const result=compareConsumerAuthority(input);
  assert.equal(result.structural_trace_closed,false);assert.deepEqual(result.structural_missing,['C']);
  assert.equal(result.executed_read_equal,true);assert.equal(result.behavior_equal,true);assert.equal(result.pass,false);
});

test('packaged read drift is RED for both missing and additional reads', () => {
  for(const [reads,missing,extra] of [[['A'],['B'],[]],[['A','B','C'],[],['C']],[['A','C'],['B'],['C']]]) {
    const input=fixture();assert.equal(compareConsumerAuthority(input).pass,true);input.packaged=probe(reads);
    const result=compareConsumerAuthority(input);
    assert.equal(result.structural_trace_closed,true);assert.equal(result.behavior_equal,true);
    assert.equal(result.executed_read_equal,false);assert.equal(result.pass,false);
    assert.deepEqual(result.read_set_difference,{missing_in_packaged:missing,extra_in_packaged:extra});
  }
});

test('behavior drift is RED even when structural and executed read closures match', () => {
  const input=fixture();assert.equal(compareConsumerAuthority(input).pass,true);
  input.packaged.results.successor.decisionId='different';
  const result=compareConsumerAuthority(input);
  assert.equal(result.structural_trace_closed,true);assert.equal(result.executed_read_equal,true);
  assert.equal(result.behavior_equal,false);assert.equal(result.pass,false);
});

test('source escape is RED even if reads and behavior are reported equal', () => {
  const input=fixture();assert.equal(compareConsumerAuthority(input).pass,true);
  input.packaged.escapeCount=1;
  const result=compareConsumerAuthority(input);
  assert.equal(result.structural_trace_closed,true);assert.equal(result.executed_read_equal,true);
  assert.equal(result.behavior_equal,true);assert.equal(result.isolation_clean,false);assert.equal(result.pass,false);

  // Exercise the unchanged realpath guard as well as the comparison predicate.
  const fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-comparison-escape-'));
  const box=path.join(fixtureRoot,'packaged'), source=path.join(fixtureRoot,'source');
  fs.mkdirSync(path.join(box,'data'),{recursive:true});fs.mkdirSync(source);
  fs.writeFileSync(path.join(source,'B'),'authority');fs.symlinkSync(path.join(source,'B'),path.join(box,'data/B'));
  const guard=guardPackagedRoot(box);guard.beginEvaluation();
  try {
    assert.throws(()=>fs.readFileSync(path.join(box,'data/B')),/PACKAGED_ROOT_ESCAPE/);
    assert.throws(()=>guard.assertClean(),/PACKAGED_ROOT_ESCAPE/);
  } finally {guard.restore();fs.rmSync(fixtureRoot,{recursive:true,force:true});}
});

test('each consumer gets fresh paired probes with exactly its own modes', () => {
  const calls=[];
  const runProbe=({root,modes:selectedModes})=>{
    calls.push({root,modes:[...selectedModes]});
    return probe(selectedModes.includes('resolver')?['A','B','C']:['A','B'],selectedModes);
  };
  for(const selectedModes of [modes,['successor','resolver'],modes]) {
    const {source:unusedSource,packaged:unusedPackaged,...input}=fixture();
    void unusedSource;void unusedPackaged;
    const result=probeConsumerAuthority({...input,consumer:`/consumer-${calls.length}`,modes:selectedModes,sourceRoot:'source',packagedRoot:'packaged',runProbe});
    assert.equal(result.pass,true);
    assert.equal(result.source_read_count,selectedModes.includes('resolver')?3:2);
  }
  assert.deepEqual(calls,[modes,['successor','resolver'],modes].flatMap(selectedModes=>[
    {root:'source',modes:selectedModes},{root:'packaged',modes:selectedModes}
  ]));
});

test('universal-mode baselines and different cache-reset contexts cannot earn parity', () => {
  const input=fixture();input.source.modes=['successor','resolver'];
  assert.throws(()=>compareConsumerAuthority(input),/source baseline modes differ/);
  const differentReset=fixture();differentReset.packaged.resets=[];
  assert.throws(()=>compareConsumerAuthority(differentReset),/probe context differs: resets/);
});
