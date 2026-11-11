import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import A11yTool from "./A11yTool";

export const metadata: Metadata = {
  title: "Website accessibility checker: free ADA and WCAG 2.2 test",
  description: "Check a page for common ADA and WCAG 2.2 problems: missing alt text, unlabelled forms, blocked zoom, heading order, landmarks, ARIA errors and autoplaying media. Free.",
  alternates: { canonical: "/tools/accessibility-checker" },
};

const faqs = [
  { q: "What does ADA compliance mean for a website?", a: "In the US, courts and the Department of Justice treat websites of businesses open to the public as covered by the Americans with Disabilities Act, and WCAG 2.1 or 2.2 level AA is the standard they point to. In the EU, the European Accessibility Act applies to many online services from June 2025. Your lawyer can tell you exactly what applies to you." },
  { q: "Can an automated checker make my site compliant?", a: "No. Automated tests catch only some problems, often estimated at around a third. They can't judge whether alt text is useful, whether the keyboard order makes sense, or how a screen reader experiences the page. Use this check to fix the clear errors first, then test by hand." },
  { q: "Does accessibility help SEO?", a: "Much of it overlaps. Alt text, clear headings, real links and text in the HTML help search engines and AI assistants understand the page, the same way they help screen readers." },
  { q: "What should I fix first?", a: "Blocked zoom, missing form labels, buttons and links with no name, and images without alt text. They're quick to fix and block people the most." },
];

export default function Page() {
  return (
    <ToolPage slug="accessibility-checker" h1="Accessibility checker (ADA / WCAG)" faqs={faqs} guide="is-your-website-ready-for-ai-agents"
      sub="Test a page against the WCAG 2.2 rules a machine can check, with the success criterion and the fix for each problem.">
      <A11yTool />
    </ToolPage>
  );
}
