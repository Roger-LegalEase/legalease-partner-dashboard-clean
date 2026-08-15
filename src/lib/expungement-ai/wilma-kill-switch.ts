import "server-only";

let wilmaKillSwitchActive = false;
const wilmaUnavailableCopy = "Wilma is temporarily unavailable while we check something. Your Briefcase and packet tools still work.";

export function isWilmaKillSwitchActive() {
  return wilmaKillSwitchActive;
}

export function setWilmaKillSwitchForTest(active: boolean) {
  wilmaKillSwitchActive = active;
}

export function wilmaKillSwitchResponse(locale: "en" | "es" = "en") {
  return {
    unavailable: true,
    response: locale === "es"
      ? "Wilma no está disponible temporalmente mientras revisamos algo. Su Maletín y las herramientas para preparar su paquete siguen funcionando."
      : wilmaUnavailableCopy
  };
}
