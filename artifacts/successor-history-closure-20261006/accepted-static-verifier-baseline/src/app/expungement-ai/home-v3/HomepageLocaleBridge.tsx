"use client";

import { useEffect } from "react";
import {
  APPROVED_LANDING_COPY_EN,
  APPROVED_LANDING_COPY_ES
} from "@/app/expungement-ai/landing-approved-copy";
import { applyExpungementLocale } from "@/app/expungement-ai/landing-locale-controller";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

export function HomepageLocaleBridge() {
  const { locale } = useLocalization();

  useEffect(() => {
    applyExpungementLocale(locale, {
      dictionaries: {
        en: APPROVED_LANDING_COPY_EN,
        es: APPROVED_LANDING_COPY_ES
      },
      persist: false,
      dispatch: false
    });
  }, [locale]);

  return null;
}
