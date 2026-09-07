import assert from 'node:assert/strict';

// Deterministic output representation only. Document hashes and acceptance predicates are unchanged.
function rasterStableObject(value) {
  if (Array.isArray(value)) return value.map(rasterStableObject);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, rasterStableObject(value[key])]));
  }
  return value;
}

const a={z:[{b:2,a:1},null],a:{q:'hash',p:false}}, b={a:{p:false,q:'hash'},z:[{a:1,b:2},null]};
const before=JSON.stringify(a), s=x=>JSON.stringify(rasterStableObject(x));
assert.equal(s(a),s(b));assert.deepEqual(JSON.parse(s(a)),a);assert.equal(JSON.stringify(a),before);
assert.notEqual(s([1,2]),s([2,1]));assert.notEqual(s({sha256:'a'}),s({sha256:'b'}));
assert.notEqual(s({complete:true}),s({complete:false}));assert.equal(s({x:0,y:false,z:null}),'{"x":0,"y":false,"z":null}');
assert.equal(s(new Date('2026-09-07T00:00:00Z')),JSON.stringify(new Date('2026-09-07T00:00:00Z')));
console.log('8 serializer controls passed.');
