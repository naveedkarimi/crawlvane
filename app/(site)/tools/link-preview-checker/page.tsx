import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import PreviewTool from "./PreviewTool";

export const metadata: Metadata = {
  title: "Link preview checker: Open Graph and snippets",
  description:
    "See how your link looks on Google, LinkedIn, Facebook, X, Slack and WhatsApp. Checks your title, meta description, og:image and Twitter card. Free.",
  alternates: { canonical: "/tools/link-preview-checker" },
};

const faqs = [
  {
    q: "Why does my link show the wrong image or no image?",
    a: "Platforms read the og:image tag in your page's HTML. If it's missing, the image URL is broken, or the tag is added by JavaScript, they show no image or pick a random one. Platforms also cache previews, so after fixing it, refresh the cache with LinkedIn's Post Inspector or Facebook's Sharing Debugger.",
  },
  {
    q: "What size should an Open Graph image be?",
    a: "1200 × 630 pixels (a 1.91:1 ratio) works on LinkedIn, Facebook, X, Slack and WhatsApp. Keep important text away from the edges, and keep the file under 1 MB so it loads fast.",
  },
  {
    q: "How long should a title and meta description be?",
    a: "Google usually shows about 50 to 60 characters of a title and about 150 to 160 characters of a description on desktop. Put the important words first so a cut doesn't lose them.",
  },
  {
    q: "Does Google always use my meta description?",
    a: "No. Google rewrites descriptions often, picking text from the page that better matches the search. A clear, accurate description still raises the chance it's used.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="link-preview-checker"
      h1="Link preview checker"
      sub="See how your page looks in Google results and when it's shared on LinkedIn, Facebook, X and WhatsApp, then fix what's missing."
      faqs={faqs}
      guide="seo-vs-aeo-vs-geo"
    >
      <PreviewTool />
    </ToolPage>
  );
}
