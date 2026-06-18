import Image from "next/image";
import Link from "next/link";

export function LegalEaseFooter() {
  return (
    <footer className="le-footer">
      <div className="le-container">
        <div className="le-footer-grid">
          <div>
            <Image src="/legalease/logos/legalease-wordmark.png" alt="LegalEase" width={900} height={221} />
            <p>The infrastructure for self-help law. We open the doors that used to need a lawyer.</p>
          </div>
          <div>
            <h4>Products</h4>
            <Link href="/expungement-ai">Expungement.ai</Link>
            <Link href="/partners">RCAP</Link>
            <Link href="/legalease/waitlist?product=record-shield">Record Shield</Link>
            <Link href="/legalease/waitlist?product=startapart">StartApart</Link>
            <Link href="/legalease/waitlist?product=claimcoach">ClaimCoach</Link>
            <Link href="/legalease/waitlist?product=fresh-start-network">The Fresh Start Network</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/legalease/contact?topic=partnership">Partnerships</Link>
            <Link href="/legalease/contact?topic=press">Press</Link>
            <Link href="/legalease/contact">Contact</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/legalease/terms">Terms of Service</Link>
            <Link href="/legalease/disclaimer">Disclaimer</Link>
          </div>
        </div>
        <div className="le-footer-bottom">
          <div>© 2026 LegalEase, Inc. All rights reserved.</div>
          <div>Social links pending verified company profiles.</div>
        </div>
      </div>
    </footer>
  );
}
