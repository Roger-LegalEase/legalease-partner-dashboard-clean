import type { Env } from "@/lib/env";
import { env } from "@/lib/env";

export type ProductKey = "basic" | "family" | "business";

export type ProductConfig = Record<
  ProductKey,
  {
    key: ProductKey;
    name: string;
    priceCents: number;
    formattedPrice: string;
  }
>;

function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(priceCents / 100);
}

export function createProductConfig(configEnv: Env): ProductConfig {
  return {
    basic: {
      key: "basic",
      name: "RecordShield Basic",
      priceCents: configEnv.RECORDSHIELD_BASIC_PRICE_CENTS,
      formattedPrice: formatPrice(configEnv.RECORDSHIELD_BASIC_PRICE_CENTS)
    },
    family: {
      key: "family",
      name: "RecordShield Family",
      priceCents: configEnv.RECORDSHIELD_FAMILY_PRICE_CENTS,
      formattedPrice: formatPrice(configEnv.RECORDSHIELD_FAMILY_PRICE_CENTS)
    },
    business: {
      key: "business",
      name: "RecordShield Business",
      priceCents: configEnv.RECORDSHIELD_BUSINESS_PRICE_CENTS,
      formattedPrice: formatPrice(configEnv.RECORDSHIELD_BUSINESS_PRICE_CENTS)
    }
  };
}

export const productConfig = createProductConfig(env);
