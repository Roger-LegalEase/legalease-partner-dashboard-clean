import test from 'node:test';
import assert from 'node:assert/strict';
import {clickVisibleScreeningChoice} from './public-screening-choice.mjs';
function fixture({optional,match=true}) {
  let open=!optional;const clicks=[];
  const choice=(text,visible)=>({isVisible:async()=>visible(),textContent:async()=>text,click:async()=>{assert(visible(),'hidden choice must never be clicked');clicks.push(text);}});
  const page={getByRole:(role,{name})=>{assert.equal(role,'button');assert(name.test('Show optional help'));return{isVisible:async()=>optional&&!open,click:async()=>{clicks.push('Show optional help');open=true;}};},locator:()=>({all:async()=>[choice('Non-conviction expungement for dismissal',()=>false),choice(match?'Non-conviction expungement for dismissal':'Other option',()=>open)]})};
  return{page,clicks};
}
test('collapsed optional help opens normally before clicking its visible matching choice',async()=>{const f=fixture({optional:true});assert.equal(await clickVisibleScreeningChoice(f.page,/^non-conviction/i),'Non-conviction expungement for dismissal');assert.deepEqual(f.clicks,['Show optional help','Non-conviction expungement for dismissal']);});
test('retained hidden matching label is refused when visible options do not match',async()=>{const f=fixture({optional:true,match:false});assert.equal(await clickVisibleScreeningChoice(f.page,/^non-conviction/i),null);assert.deepEqual(f.clicks,['Show optional help']);});
test('required non-help question still clicks only its visible matching choice',async()=>{const f=fixture({optional:false});assert.equal(await clickVisibleScreeningChoice(f.page,/^non-conviction/i),'Non-conviction expungement for dismissal');assert.deepEqual(f.clicks,['Non-conviction expungement for dismissal']);});
