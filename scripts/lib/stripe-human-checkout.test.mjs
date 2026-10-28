import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { waitForHumanCheckout } from "./stripe-human-checkout.mjs";

test("human handoff encrypts the URL and preserves the exact paid Checkout identity", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stripe-human-control-"));
  try {
    const key = path.join(root,"key.pem"), cert = path.join(root,"cert.pem");
    execFileSync("openssl", ["req","-x509","-newkey","rsa:2048","-nodes","-keyout",key,"-out",cert,"-days","1","-subj","/CN=Disposable test fixture"], {stdio:"pipe"});
    const opened = { id:"cs_test_synthetic",url:"https://checkout.stripe.com/c/pay/cs_test_synthetic",livemode:false,
      mode:"payment",amount_total:5000,currency:"usd",client_reference_id:"matter-a",metadata:{owner:"owner-a",verification:"bound"},status:"open",payment_status:"unpaid" };
    const identity = { runId:"synthetic-run",applicationSha:"a".repeat(40),participantUserId:"owner-a",briefcaseItemId:"matter-a" };
    const run = async (name, current, extra={}) => {
      const envelopePath=path.join(root,name+".cms"),statusPath=path.join(root,name+".json");
      return { paid:await waitForHumanCheckout({stripe:{checkout:{sessions:{retrieve:async id=>{assert.equal(id,opened.id);return current;}}}},
        opened,identity,certificatePath:cert,envelopePath,statusPath,waitMs:1000,pollMs:0,...extra}),envelopePath,statusPath };
    };
    const success = await run("paid",{...opened,status:"complete",payment_status:"paid"});
    assert.equal(success.paid.payment_status,"paid");
    const handoff=JSON.parse(execFileSync("openssl",["cms","-decrypt","-binary","-inform","DER","-in",success.envelopePath,"-recip",cert,"-inkey",key],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}));
    assert.equal(handoff.checkoutUrl,opened.url);assert.equal(handoff.participantUserId,identity.participantUserId);
    assert.equal(handoff.briefcaseItemId,identity.briefcaseItemId);assert.equal(handoff.automatedBrowser,false);
    assert(!fs.readFileSync(success.statusPath,"utf8").includes("checkout.stripe.com"));
    assert(!fs.readFileSync(success.envelopePath).includes(Buffer.from(opened.url)));
    for(const [name,patch] of Object.entries({live:{livemode:true},amount:{amount_total:4900},matter:{client_reference_id:"another"},metadata:{metadata:{owner:"another"}},expired:{status:"expired"}})) {
      await assert.rejects(()=>run(name,{...opened,...patch}));
    }
    await assert.rejects(()=>run("timeout",opened,{waitMs:0}),/without a settled payment/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root,"timeout.json"))).phase,"awaiting_human");
    const corrupt=fs.readFileSync(success.envelopePath);corrupt[corrupt.length-1]^=1;
    assert.throws(()=>execFileSync("openssl",["cms","-decrypt","-binary","-inform","DER","-recip",cert,"-inkey",key],{input:corrupt,stdio:["pipe","pipe","pipe"]}));
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
