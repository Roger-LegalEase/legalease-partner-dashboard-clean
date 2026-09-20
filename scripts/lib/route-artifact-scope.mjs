/**
 * Treat a family assembly as a route artifact only when committed identity
 * records make the two scopes identical. This is deliberately narrower than
 * "the family has one route": every rendered component must also be assigned
 * to that route, and the customer registry must map one customer route to one
 * known packet family.
 */
export function singleRouteFamilyArtifacts({ familyId, rendered, fieldMap, master, routeRegistry }) {
  if ((rendered?.routeArtifacts ?? []).length > 0) return [];
  const family = (master?.families ?? []).find((row) => row.familyId === familyId);
  if (!family || family.state !== "COMPLETE_PACKET_PROVEN" || family.routeKeys?.length !== 1) return [];

  const registryRows = (routeRegistry?.routes ?? []).filter((route) => {
    const identities = [...new Set([...(route.packetSetIds ?? []), ...(route.packetFamilies ?? [])])];
    return identities.includes(familyId);
  });
  if (registryRows.length !== 1) return [];
  const registryRow = registryRows[0];
  const knownFamilyIds = new Set((master?.families ?? []).map((row) => row.familyId));
  const registryFamilies = [...new Set([...(registryRow.packetSetIds ?? []), ...(registryRow.packetFamilies ?? [])])]
    .filter((id) => knownFamilyIds.has(id));
  if (registryFamilies.length !== 1 || registryFamilies[0] !== familyId) return [];
  if (registryRow.jurisdiction !== family.jurisdiction) return [];

  const routeKey = family.routeKeys[0];
  const componentSet = [...new Set(rendered?.componentSet ?? [])].sort();
  const componentRoutes = fieldMap?.componentRoutes ?? null;
  if (!componentRoutes || componentSet.length === 0) return [];
  if (Object.keys(componentRoutes).sort().join("\n") !== componentSet.join("\n")) return [];
  if (Object.values(componentRoutes).some((declaredRoute) => declaredRoute !== routeKey)) return [];

  const artifacts = (rendered?.artifacts ?? []).filter((artifact) => ["canonical", "boundary"].includes(artifact.fixture));
  if (artifacts.length !== 2 || new Set(artifacts.map((artifact) => artifact.fixture)).size !== 2) return [];
  for (const artifact of artifacts) {
    const carried = [...new Set(artifact.components ?? artifact.documents ?? [])].sort();
    if (carried.join("\n") !== componentSet.join("\n")) return [];
    if ((artifact.pageManifest ?? []).length !== artifact.pageCount) return [];
  }

  return artifacts.map((artifact) => ({
    ...artifact,
    routeKey,
    route: registryRow.pathwayId,
    customerRouteId: registryRow.pathwayKey,
    unitOfDelivery: "single_route_family_assembly",
    familyAssemblyIsRouteArtifact: true,
    equivalenceBasis: {
      masterQueue: "one COMPLETE_PACKET_PROVEN family routeKey",
      customerRegistry: "one customer route naming exactly this one known packet family",
      componentRoutes: "every rendered component is assigned to that one routeKey",
      bytes: "the route artifact is the family assembly itself; no copy or rewritten PDF exists"
    }
  }));
}
