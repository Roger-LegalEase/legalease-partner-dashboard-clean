import type { WilmaTrackerBackend } from "@/wilma/orders/types";

type TrackerModule = {
  createWilmaTrackerWorkspace?: (input: unknown) => Promise<{ trackerWorkspaceId?: string }>;
};

export function createBackendWilmaTrackerAdapter(): WilmaTrackerBackend {
  return {
    async createTrackerWorkspace({ order, payload }) {
      const tracker = (await import("@/lib/document-prep")) as TrackerModule;

      if (tracker.createWilmaTrackerWorkspace) {
        return tracker.createWilmaTrackerWorkspace({ order, payload });
      }

      return { trackerWorkspaceId: `wilma_tracker_${order.id}` };
    }
  };
}
