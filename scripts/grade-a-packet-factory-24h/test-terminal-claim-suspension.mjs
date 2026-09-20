import assert from "node:assert/strict";
import { suspendedTerminalState } from "./terminal-claim-suspension.mjs";
assert.equal(suspendedTerminalState(null), null);
assert.equal(suspendedTerminalState({terminalClaimSuspended:false,stateOverride:"VERIFY_PENDING"}),null);
assert.equal(suspendedTerminalState({terminalClaimSuspended:true,stateOverride:"VERIFY_PENDING"}),"VERIFY_PENDING");
for (const stateOverride of [undefined,null,"FAIL_REPAIR_REQUIRED","COMPLETE_PACKET_PROVEN","GUIDANCE_READY","OUT_OF_SCOPE","INVALID"]) {
 assert.equal(suspendedTerminalState({terminalClaimSuspended:true,stateOverride}),"FAIL_REPAIR_REQUIRED");
}
console.log("Terminal suspension: pending repair review and terminal/malformed override rejection PASS");
