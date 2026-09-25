import { Nav } from "./shared/Nav";
import { SystemStrip } from "./shared/SystemStrip";
import { Hero } from "./sections/Hero";
import { SecurityGap } from "./sections/SecurityGap";
import { FusionModel } from "./sections/FusionModel";
import { SignalDomains } from "./sections/SignalDomains";
import { ProductPreview } from "./sections/ProductPreview";
import { Principles } from "./sections/Principles";
import { FinalCtaFooter } from "./sections/FinalCtaFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-base-800 pb-20 text-ink">
      <Nav />
      <Hero />
      <SecurityGap />
      <FusionModel />
      <SignalDomains />
      <ProductPreview />
      <Principles />
      <FinalCtaFooter />
      <SystemStrip />
    </div>
  );
}
