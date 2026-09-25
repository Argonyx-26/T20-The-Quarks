import { Nav } from "./shared/Nav";
import { SystemStrip } from "./shared/SystemStrip";
import { Hero } from "./sections/Hero";
import { StatsRail } from "./sections/StatsRail";
import { SecurityGap } from "./sections/SecurityGap";
import { FusionModel } from "./sections/FusionModel";
import { SignalDomains } from "./sections/SignalDomains";
import { ProductPreview } from "./sections/ProductPreview";
import { Principles } from "./sections/Principles";
import { ResponsibleAI } from "./sections/ResponsibleAI";
import { FinalCtaFooter } from "./sections/FinalCtaFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-base-800 pb-0 text-ink lg:pb-20">
      <Nav />
      <Hero />
      <StatsRail />
      <SecurityGap />
      <FusionModel />
      <SignalDomains />
      <ProductPreview />
      <Principles />
      <ResponsibleAI />
      <FinalCtaFooter />
      <SystemStrip />
    </div>
  );
}
