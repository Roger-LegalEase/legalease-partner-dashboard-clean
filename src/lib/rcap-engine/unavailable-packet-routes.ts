export type UnavailablePacketRouteRecord = {
  routeKey?: string;
  registryGap: boolean;
  renderer: "none" | "packet_document_v1";
};

const ROUTES: UnavailablePacketRouteRecord[] = [
  {
    routeKey: "CO:juvenile-expungement-19-1-306",
    registryGap: true,
    renderer: "none"
  }
];

export function unavailablePacketRouteFor(jurisdiction: string, pathwayId: string | null | undefined) {
  const routeKey = `${jurisdiction.toUpperCase()}:${pathwayId ?? ""}`;
  return ROUTES.find((route) => route.routeKey === routeKey) ?? null;
}

export function routeMustFailClosed(route: UnavailablePacketRouteRecord | null | undefined) {
  return route?.registryGap === true && route.renderer === "none";
}
