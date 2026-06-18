import Image from "next/image";
import Link from "next/link";

export function LegalEaseNav() {
  return (
    <nav className="le-nav" aria-label="LegalEase navigation">
      <div className="le-nav-inner">
        <Link href="/legalease" aria-label="LegalEase home">
          <Image className="le-logo" src="/legalease/logos/legalease-wordmark.png" alt="LegalEase" width={900} height={221} priority />
        </Link>
        <div className="le-nav-links">
          <Link href="/legalease#products">Products</Link>
          <Link href="/legalease#partners">Partners</Link>
          <Link href="/legalease/contact">Contact</Link>
          <Link className="le-button" href="/expungement-ai">
            Open Expungement.ai
          </Link>
        </div>
      </div>
    </nav>
  );
}
