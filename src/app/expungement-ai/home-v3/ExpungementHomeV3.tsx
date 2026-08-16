import Image from "next/image";
import Link from "next/link";
import { APPROVED_LANDING_COPY_EN as copy } from "@/app/expungement-ai/landing-approved-copy";
import { SamplePacketModal } from "@/app/expungement-ai/sample-packet/SamplePacketModal";
import { ExpungementWordmark } from "@/components/expungement-ai/ExpungementWordmark";
import { CoverageMatrix } from "./CoverageMatrix";
import { FaqAccordion } from "./FaqAccordion";
import { HeroVideo } from "./HeroVideo";
import { HomepageHeader } from "./HomepageHeader";
import { HomepageLocaleBridge } from "./HomepageLocaleBridge";
import { PacketDocumentSet } from "./PacketDocumentSet";
import { PageRail } from "./PageRail";
import { PrivacyLedger } from "./PrivacyLedger";
import { ProgressCue } from "./ProgressCue";
import { SectionPath } from "./SectionPath";
import { WilmaPreview } from "./WilmaPreview";
import styles from "./ExpungementHomeV3.module.css";

function SectionIndex({ number, label, labelKey, dark = false }: { number: string; label: string; labelKey: string; dark?: boolean }) {
  return (
    <p className={styles.sectionIndex} data-dark={dark ? "true" : "false"} aria-hidden="true">
      <span>{number}</span><span data-i18n={labelKey}>{label}</span>
    </p>
  );
}

function StartFreeLink({ className = styles.primaryButton }: { className?: string }) {
  return (
    <Link className={className} href="/expungement-ai/start">
      <span data-i18n="hero_cta1">{copy.hero_cta1}</span><i aria-hidden="true" />
    </Link>
  );
}

export function ExpungementHomeV3() {
  return (
    <div className={styles.page} data-homepage-version="v3">
      <a className={styles.skipLink} href="#main-content" data-i18n="skip_main">{copy.skip_main}</a>
      <HomepageLocaleBridge />
      <PageRail />
      <HomepageHeader />
      <main id="main-content">
        <HeroVideo />

        <section id="barrier" className={`${styles.section} ${styles.barrierSection}`} aria-labelledby="barrier-title">
          <div className={styles.contentGrid}>
            <div className={styles.sectionCopy}>
              <SectionIndex number="02" label={copy.prob_eye} labelKey="prob_eye" />
              <p className={styles.eyebrow} data-i18n="prob_eye">{copy.prob_eye}</p>
              <h2 id="barrier-title" data-i18n="prob_h2">{copy.prob_h2}</h2>
              <p className={styles.lead} data-i18n="prob_lead">{copy.prob_lead}</p>
              <StartFreeLink />
            </div>
            <div className={styles.photoField}>
              <figure className={styles.photoLarge}>
                <Image
                  src="/expungement-ai/evidence-economic.webp"
                  alt={copy.barrier_work_alt}
                  data-i18n-alt="barrier_work_alt"
                  fill
                  sizes="(max-width: 768px) 100vw, 36vw"
                />
                <figcaption data-i18n="barrier_work">{copy.barrier_work}</figcaption>
              </figure>
              <figure>
                <Image
                  src="/expungement-ai/evidence-access.webp"
                  alt={copy.barrier_housing_alt}
                  data-i18n-alt="barrier_housing_alt"
                  fill
                  sizes="(max-width: 768px) 100vw, 24vw"
                />
                <figcaption data-i18n="barrier_housing">{copy.barrier_housing}</figcaption>
              </figure>
              <figure>
                <Image
                  src="/expungement-ai/evidence-opportunity.webp"
                  alt={copy.barrier_school_alt}
                  data-i18n-alt="barrier_school_alt"
                  fill
                  sizes="(max-width: 768px) 100vw, 24vw"
                />
                <figcaption data-i18n="barrier_school">{copy.barrier_school}</figcaption>
              </figure>
            </div>
          </div>
          <SectionPath
            className={`${styles.sectionPath} ${styles.barrierPath}`}
            path="M0 38 H510 V86 H1510"
            terminus={{ x: 1510, y: 86 }}
          />
        </section>

        <section id="guided-check" className={`${styles.section} ${styles.guidedSection}`} aria-labelledby="guided-title">
          <div className={styles.contentGrid}>
            <div className={styles.sectionCopy}>
              <SectionIndex number="03" label={copy.elig_eye} labelKey="elig_eye" />
              <p className={styles.eyebrow} data-i18n="elig_eye">{copy.elig_eye}</p>
              <h2 id="guided-title" data-i18n="elig_h2">{copy.elig_h2}</h2>
              <p className={styles.lead} data-i18n="elig_lead">{copy.elig_lead}</p>
              <ul className={styles.plainList}>
                {["elig_b0", "elig_b1", "elig_b2", "elig_b3"].map((key) => (
                  <li key={key} data-i18n={key}>{copy[key]}</li>
                ))}
              </ul>
              <StartFreeLink />
            </div>
            <figure className={styles.productFigure}>
              <Image
                src="/expungement-ai/shot-eligibility.webp"
                alt={copy.guided_check_alt}
                data-i18n-alt="guided_check_alt"
                width={1520}
                height={1138}
                sizes="(max-width: 768px) 100vw, 57vw"
              />
              <figcaption data-i18n="guided_caption">{copy.guided_caption}</figcaption>
            </figure>
          </div>
        </section>

        <section id="how-it-works" className={`${styles.section} ${styles.howSection}`} aria-labelledby="how-title">
          <div className={styles.sectionInner}>
            <SectionIndex number="04" label={copy.how_eye} labelKey="how_eye" dark />
            <p className={styles.eyebrow} data-i18n="how_eye">{copy.how_eye}</p>
            <h2 id="how-title" data-i18n="how_h2">{copy.how_h2}</h2>
            <div className={styles.stepGrid}>
              <article className={styles.stepPanel}>
                <div className={styles.stepHeading}><span>01</span><strong data-i18n="hero_story_guided">{copy.hero_story_guided}</strong></div>
                <h3 data-i18n="how_h0">{copy.how_h0}</h3>
                <p data-i18n="how_p0">{copy.how_p0}</p>
                <div className={styles.guidedCrop}>
                  <Image
                    src="/expungement-ai/shot-eligibility.webp"
                    alt={copy.guided_check_alt}
                    data-i18n-alt="guided_check_alt"
                    fill
                    sizes="(max-width: 768px) 100vw, 31vw"
                  />
                </div>
              </article>
              <article className={`${styles.stepPanel} ${styles.stepPanelFeatured}`}>
                <div className={styles.stepHeading}><span>02</span><strong data-i18n="how_packet_review">{copy.how_packet_review}</strong></div>
                <h3 data-i18n="how_h1">{copy.how_h1}</h3>
                <p data-i18n="how_p1">{copy.how_p1}</p>
                <div className={styles.packetReview} aria-label={copy.packet_review_aria} data-i18n-aria-label="packet_review_aria">
                  <div><span data-i18n="packet_review_state">{copy.packet_review_state}</span><strong data-i18n="packet_review_answers">{copy.packet_review_answers}</strong></div>
                  <div><span data-i18n="packet_review_court">{copy.packet_review_court}</span><strong data-i18n="packet_review_case">{copy.packet_review_case}</strong></div>
                  <div className={styles.packetPrice}><span data-i18n="packet_review_price">{copy.packet_review_price}</span><strong>$50</strong></div>
                  <div><span data-i18n="packet_review_next">{copy.packet_review_next}</span><strong data-i18n="packet_review_before_payment">{copy.packet_review_before_payment}</strong></div>
                </div>
              </article>
              <article className={styles.stepPanel}>
                <div className={styles.stepHeading}><span>03</span><strong data-i18n="how_filing_steps">{copy.how_filing_steps}</strong></div>
                <h3 data-i18n="how_h3">{copy.how_h3}</h3>
                <p data-i18n="how_p2">{copy.how_p2}</p>
                <div className={styles.filingProgress} aria-label={copy.filing_progress_aria} data-i18n-aria-label="filing_progress_aria">
                  <div><span>01</span><strong data-i18n="filing_review">{copy.filing_review}</strong></div>
                  <div><span>02</span><strong data-i18n="filing_prepare">{copy.filing_prepare}</strong></div>
                  <div data-current="true"><span>03</span><strong data-i18n="filing_file">{copy.filing_file}</strong></div>
                  <div><span>04</span><strong data-i18n="filing_court">{copy.filing_court}</strong></div>
                </div>
              </article>
            </div>
          </div>
          <SectionPath
            className={`${styles.sectionPath} ${styles.howPath}`}
            path="M0 34 H380 V88 H1370"
            terminus={{ x: 1370, y: 88 }}
          />
        </section>

        <section id="briefcase" className={`${styles.section} ${styles.briefcaseSection}`} aria-labelledby="briefcase-title">
          <div className={styles.briefcaseGrid}>
            <div className={styles.sectionCopy}>
              <SectionIndex number="05" label={copy.brief_eye} labelKey="brief_eye" />
              <p className={styles.eyebrow} data-i18n="brief_eye">{copy.brief_eye}</p>
              <h2 id="briefcase-title" data-i18n="brief_h2">{copy.brief_h2}</h2>
              <p className={styles.lead} data-i18n="brief_lead">{copy.brief_lead}</p>
              <ul className={styles.plainList}>
                {["brief_b0", "brief_b1", "brief_b3"].map((key) => <li key={key} data-i18n={key}>{copy[key]}</li>)}
              </ul>
              <StartFreeLink />
            </div>
            <div className={styles.briefcaseEvidence}>
              <figure className={styles.briefcaseFigure}>
                <Image
                  src="/expungement-ai/shot-briefcase.webp"
                  alt={copy.briefcase_alt}
                  data-i18n-alt="briefcase_alt"
                  width={2360}
                  height={1329}
                  sizes="(max-width: 900px) 100vw, 66vw"
                />
                <figcaption data-i18n="brief_demo_note">{copy.brief_demo_note}</figcaption>
              </figure>
              <aside className={styles.progressDetail} aria-label={copy.brief_progress_aria} data-i18n-aria-label="brief_progress_aria">
                <span data-i18n="brief_demo_label">{copy.brief_demo_label}</span>
                <strong data-i18n="brief_demo_s1">{copy.brief_demo_s1}</strong>
                <p data-i18n="brief_demo_n1">{copy.brief_demo_n1}</p>
                <ProgressCue />
              </aside>
            </div>
          </div>
        </section>

        <section id="what-you-get" className={`${styles.section} ${styles.documentsSection}`} aria-labelledby="documents-title">
          <div className={styles.contentGrid}>
            <div className={styles.sectionCopy}>
              <SectionIndex number="06" label={copy.pk_eye} labelKey="pk_eye" />
              <p className={styles.eyebrow} data-i18n="pk_eye">{copy.pk_eye}</p>
              <h2 id="documents-title" data-i18n="pk_h2">{copy.pk_h2}</h2>
              <p className={styles.lead} data-i18n="pk_lead">{copy.pk_lead}</p>
              <p className={styles.scopeLine} data-i18n="packet_scope">{copy.packet_scope}</p>
            </div>
            <PacketDocumentSet />
          </div>
        </section>

        <section id="pricing" className={`${styles.section} ${styles.pricingSection}`} aria-labelledby="pricing-title">
          <div className={styles.pricingGrid}>
            <div className={styles.sectionCopy}>
              <SectionIndex number="07" label={copy.pr_eye} labelKey="pr_eye" dark />
              <p className={styles.eyebrow} data-i18n="pr_eye">{copy.pr_eye}</p>
              <h2 id="pricing-title" data-i18n="pr_h2">{copy.pr_h2}</h2>
              <p className={styles.lead} data-i18n="pr_intro">{copy.pr_intro}</p>
              <StartFreeLink />
            </div>
            <div className={styles.pricingLedger} aria-label={copy.pricing_sequence_label} data-i18n-aria-label="pricing_sequence_label">
              <article>
                <span>01</span><div><strong data-i18n="price_guided_label">{copy.price_guided_label}</strong><p data-i18n="price_guided_detail">{copy.price_guided_detail}</p></div><b>$0</b>
              </article>
              <article className={styles.pricingFeatured}>
                <span>02</span><div><strong data-i18n="price_packet_label">{copy.price_packet_label}</strong><p data-i18n="price_packet_detail">{copy.price_packet_detail}</p></div><b>$50</b>
              </article>
              <article>
                <span>03</span><div><strong data-i18n="price_court_label">{copy.price_court_label}</strong><p data-i18n="price_court_detail">{copy.price_court_detail}</p></div><b data-i18n="price_varies">{copy.price_varies}</b>
              </article>
            </div>
          </div>
          <div className={styles.pricingBoundary}>
            <p data-i18n="pr_fine">{copy.pr_fine}</p>
            <p data-i18n="pr_cover_p">{copy.pr_cover_p}</p>
          </div>
          <SectionPath
            className={`${styles.sectionPath} ${styles.pricingPath}`}
            path="M0 32 H420 V88 H1320"
            terminus={{ x: 1320, y: 88 }}
          />
        </section>

        <section id="privacy" className={`${styles.section} ${styles.privacySection}`} aria-labelledby="privacy-title">
          <div className={styles.contentGrid}>
            <div className={styles.sectionCopy}>
              <SectionIndex number="08" label={copy.pv_eye} labelKey="pv_eye" dark />
              <p className={styles.eyebrow} data-i18n="pv_eye">{copy.pv_eye}</p>
              <h2 id="privacy-title" data-i18n="pv_h2">{copy.pv_h2}</h2>
              <p className={styles.lead} data-i18n="pv_lead">{copy.pv_lead}</p>
              <Link className={styles.textLinkLight} href="/privacy" data-i18n="pv_cta">{copy.pv_cta}</Link>
            </div>
            <PrivacyLedger />
          </div>
        </section>

        <section id="wilma" className={`${styles.section} ${styles.wilmaSection}`} aria-labelledby="wilma-title">
          <div className={styles.wilmaLayout}>
            <div className={styles.wilmaCopy}>
              <SectionIndex number="09" label={copy.wl_eye} labelKey="wl_eye" />
              <p className={styles.eyebrow} data-i18n="wl_eye">{copy.wl_eye}</p>
              <h2 id="wilma-title" data-i18n="wl_h2">{copy.wl_h2}</h2>
              <p className={styles.lead} data-i18n="wl_lead">{copy.wl_lead}</p>
              <p className={styles.scopeLine} data-i18n="wl_safe">{copy.wl_safe}</p>
              <Image
                className={styles.wilmaPortrait}
                src="/expungement-ai/wilma-avatar.webp"
                alt={copy.wilma_alt}
                data-i18n-alt="wilma_alt"
                width={480}
                height={480}
                sizes="(max-width: 768px) 180px, 220px"
              />
            </div>
            <WilmaPreview />
          </div>
        </section>

        <section id="coverage" className={`${styles.section} ${styles.coverageSection}`} aria-labelledby="coverage-title">
          <div className={styles.sectionInner}>
            <SectionIndex number="10" label={copy.st_eye} labelKey="st_eye" />
            <div className={styles.coverageHeading}>
              <div>
                <p className={styles.eyebrow} data-i18n="st_eye">{copy.st_eye}</p>
                <h2 id="coverage-title" data-i18n="st_h2">{copy.st_h2}</h2>
              </div>
              <p className={styles.lead} data-i18n="st_lead">{copy.st_lead}</p>
            </div>
            <CoverageMatrix />
          </div>
        </section>

        <section id="faq" className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title">
          <div className={styles.faqGrid}>
            <div className={styles.sectionCopy}>
              <SectionIndex number="11" label={copy.fq_eye} labelKey="fq_eye" />
              <p className={styles.eyebrow} data-i18n="fq_eye">{copy.fq_eye}</p>
              <h2 id="faq-title" data-i18n="fq_h2">{copy.fq_h2}</h2>
            </div>
            <FaqAccordion />
          </div>
        </section>

        <section className={styles.finalCta} aria-labelledby="final-cta-title">
          <div className={styles.finalCtaInner}>
            <div>
              <h2 id="final-cta-title" data-i18n="fn_h2">{copy.fn_h2}</h2>
              <p data-i18n="fn_p">{copy.fn_p}</p>
            </div>
            <div className={styles.finalAction}>
              <SectionPath
                className={`${styles.sectionPath} ${styles.finalPath}`}
                path="M0 190 H1600 V0"
                terminus={{ x: 1600, y: 0, size: 18 }}
                viewBox="0 0 1600 200"
              />
              <StartFreeLink />
            </div>
            <p className={styles.finalBoundary} data-i18n="fn_micro">{copy.fn_micro}</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <ExpungementWordmark tone="light" idSuffix="homepage-v3-footer" ariaLabel={copy.home_label} i18nAriaLabel="home_label" />
              <strong data-i18n="ft_brand">{copy.ft_brand}</strong>
              <p data-i18n="ft_blurb">{copy.ft_blurb}</p>
            </div>
            <div className={styles.footerLinks}>
              <div><h3 data-i18n="ft_product">{copy.ft_product}</h3><Link href="/expungement-ai#how-it-works" data-i18n="nav_how">{copy.nav_how}</Link><Link href="/expungement-ai#what-you-get" data-i18n="nav_brief">{copy.nav_brief}</Link><Link href="/expungement-ai#pricing" data-i18n="nav_pricing">{copy.nav_pricing}</Link><Link href="/expungement-ai/start" data-i18n="ft_check">{copy.ft_check}</Link></div>
              <div><h3 data-i18n="ft_resources">{copy.ft_resources}</h3><Link href="/expungement-ai#faq" data-i18n="nav_faq">{copy.nav_faq}</Link><Link href="/expungement-ai#privacy" data-i18n="nav_privacy">{copy.nav_privacy}</Link><a href="/expungement-ai#what-you-get" data-sample-packet-trigger="true" data-i18n="ft_sample">{copy.ft_sample}</a></div>
              <div><h3 data-i18n="ft_legal">{copy.ft_legal}</h3><Link href="/privacy" data-i18n="ft_pp">{copy.ft_pp}</Link><Link href="/terms" data-i18n="ft_tos">{copy.ft_tos}</Link><a href="mailto:help@expungement.ai" data-i18n="ft_contact">{copy.ft_contact}</a></div>
            </div>
          </div>
          <p className={styles.disclaimer} data-i18n="ft_disc">{copy.ft_disc}</p>
          <div className={styles.footerBottom}>
            <p data-i18n="ft_copy">© 2026 Expungement.ai. All rights reserved.</p>
            <p data-i18n="ft_priv">{copy.ft_priv}</p>
          </div>
        </div>
      </footer>
      <SamplePacketModal />
    </div>
  );
}
