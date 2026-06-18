import "server-only";

let wilmaKillSwitchActive = false;
const wilmaUnavailableCopy = "Wilma is temporarily unavailable while we check something. Your Briefcase and packet tools still work.";

export function isWilmaKillSwitchActive() {
  return wilmaKillSwitchActive;
}

export function setWilmaKillSwitchForTest(active: boolean) {
  wilmaKillSwitchActive = active;
}

export function wilmaKillSwitchResponse() {
  return {
    unavailable: true,
    response: wilmaUnavailableCopy
  };
}
