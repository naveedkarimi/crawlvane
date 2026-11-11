import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import SpeedTool from "./SpeedTool";

export const metadata: Metadata = {
  title: "Free mobile page speed test (Core Web Vitals)",
  description:
    "Test your page speed on mobile and desktop with Google PageSpeed data: performance score, LCP, INP and CLS from real visitors, and the top fixes in plain English.",
  alternates: { canonical: "/tools/page-speed-test" },
};

const faqs = [
  {
    q: "What's a good PageSpeed score?",
    a: "90 to 100 is good, 50 to 89 needs work and under 50 is poor. The score is a lab test on a simulated mid-range phone. Google ranks pages on real-visitor Core Web Vitals, so look at those first when they're available.",
  },
  {
    q: "What are Core Web Vitals?",
    a: "Three measurements of real visits: Largest Contentful Paint (LCP, main content shown within 2.5 seconds), Interaction to Next Paint (INP, responds to taps within 200 milliseconds) and Cumulative Layout Shift (CLS, under 0.1). Google judges each at the 75th percentile of visits.",
  },
  {
    q: "Why is my site slow on mobile but fast on my computer?",
    a: "Phones have slower processors and often slower connections. Heavy JavaScript, large images and third-party scripts that feel fine on a laptop can take several seconds on a mid-range phone.",
  },
  {
    q: "How is this different from pagespeed.web.dev?",
    a: "It uses the same Google data. We show the few fixes that save the most time, in plain English, say who usually fixes each one, and link to Google's full report if you want every detail.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="page-speed-test"
      h1="Mobile page speed test"
      sub="Google PageSpeed scores and real-visitor Core Web Vitals, with the fixes that save the most time, in plain English."
      faqs={faqs}
      guide="why-your-site-is-slow-on-mobile"
    >
      <SpeedTool />
    </ToolPage>
  );
}
