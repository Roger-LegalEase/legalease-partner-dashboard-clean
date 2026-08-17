"use client";

import { useCallback } from "react";
import {
  APPROVED_LANDING_COPY_EN,
  APPROVED_LANDING_COPY_ES
} from "@/app/expungement-ai/landing-approved-copy";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

export function useLandingCopy() {
  const { locale } = useLocalization();
  return useCallback(
    (key: string) => {
      const dictionary = locale === "es" ? APPROVED_LANDING_COPY_ES : APPROVED_LANDING_COPY_EN;
      return dictionary[key] ?? APPROVED_LANDING_COPY_EN[key] ?? key;
    },
    [locale]
  );
}
