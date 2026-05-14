import { getWilmaLaunchConfig } from "@/wilma/launch/config";
import type { WilmaLaunchConfig } from "@/wilma/launch/types";

export type WilmaLaunchBackend = {
  getLaunchConfig(): Promise<WilmaLaunchConfig>;
};

export function createEnvWilmaLaunchBackend(env: Record<string, string | undefined> = process.env): WilmaLaunchBackend {
  return {
    async getLaunchConfig() {
      return getWilmaLaunchConfig(env);
    }
  };
}
