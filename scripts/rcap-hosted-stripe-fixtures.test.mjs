import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import yaml from 'js-yaml';

const script = pathToFileURL(path.resolve('scripts/rcap-hosted-acceptance-stripe-fixtures.mjs')).href;
const marker = { rcap_acceptance_fixture: 'consumer_packet_catalog/v1' };

for (const scenario of ['complete', 'unrestricted', 'missing-product', 'wrong-default-price', 'wrong-coupon-product', 'missing-promotion']) {
  test(`existing Preview fixture readback: ${scenario}`, () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-fixture-readback-'));
    try {
      const data = {
        products: [{ id: 'prod_local', name: 'Synthetic local product', metadata: marker, default_price: scenario === 'wrong-default-price' ? 'price_old' : 'price_local' }],
        prices: [{ id: 'price_local', unit_amount: 5000, currency: 'usd', type: 'one_time' }],
        coupons: [{ id: 'coupon_local', metadata: marker, valid: true, percent_off: 100,
          applies_to: { products: scenario === 'unrestricted' ? [] : [scenario === 'wrong-coupon-product' ? 'prod_other' : 'prod_local'] } }],
        promotion_codes: [{ id: 'promo_local', active: true, coupon: { id: 'coupon_local' } }],
      };
      if (scenario === 'missing-product') data.products = [];
      if (scenario === 'missing-promotion') data.promotion_codes = [];
      // This double tests the fixture script's mutation boundary only. These
      // are deliberately synthetic provider objects, never hosted evidence.
      const program = `
        import fs from 'node:fs';
        const data = ${JSON.stringify(data)};
        globalThis.fetch = async (url, init) => {
          const pathname = new URL(url).pathname.split('/').at(-1);
          fs.appendFileSync('requests.jsonl', JSON.stringify({method:init.method,pathname})+'\\n');
          if(init.method!=='GET') throw new Error('provider mutation attempted');
          return {ok:true,status:200,headers:new Headers(),json:async()=>({data:data[pathname]??[]})};
        };
        await import(${JSON.stringify(script)});
      `;
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
        cwd, encoding: 'utf8', env: { PATH: process.env.PATH,
          HOSTED_STRIPE_TEST_SECRET: 'sk_test_local_fixture_only', HOSTED_STRIPE_FIXTURE_READ_ONLY: 'true' },
      });
      const pass = ['complete', 'unrestricted'].includes(scenario);
      assert.equal(result.status, pass ? 0 : 1, result.stdout + result.stderr);
      const requests = fs.readFileSync(path.join(cwd, 'requests.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      assert.ok(requests.length > 0);
      assert.ok(requests.every(request => request.method === 'GET'));
      if (pass) {
        const evidence = JSON.parse(fs.readFileSync(path.join(cwd, 'hosted-acceptance-evidence/stripe-fixtures.json')));
        assert.equal(evidence.readOnly, true);
        assert.ok(Object.values(evidence.created).every(created => created === false));
        assert.equal(evidence.couponRestrictedToProduct, scenario === 'complete');
      }
    } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
  });
}

test('workflow makes fixture preparation read-only when reusing a Preview', () => {
  const workflow = yaml.load(fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml', 'utf8'));
  const fixtures = workflow.jobs.preflight.steps.find(step => step.id === 'stripe_fixtures');
  assert.equal(fixtures.env.HOSTED_STRIPE_FIXTURE_READ_ONLY, "${{ inputs.preview_hostname != '' && 'true' || 'false' }}");
});
