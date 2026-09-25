import { PrimaryButton, Section, Wordmark } from "../shared/ui";

export function FinalCtaFooter() {
  return (
    <>
      <Section className="text-center" border={false}>
        <h2 className="mx-auto max-w-[20ch] text-[30px] font-display font-bold leading-tight text-ink sm:text-[36px]">
          See the signals become a story.
        </h2>
        <div className="mt-7 flex justify-center">
          <PrimaryButton to="/mission-control">Launch Mission Control</PrimaryButton>
        </div>
      </Section>

      <footer id="footer" className="border-t border-line-soft py-10">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-start gap-1.5 px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Wordmark />
            <span className="text-[12px] text-ink-faint">The Quarks · Argonyx '26</span>
          </div>
          <span className="text-[12px] text-ink-faint">Intelligent threat detection &amp; situational awareness</span>
        </div>
      </footer>
    </>
  );
}
