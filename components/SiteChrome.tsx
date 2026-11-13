import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import Motion from "./Motion";
import Upsell from "./Upsell";
import ReferralCapture from "./ReferralCapture";
import { posts } from "@/lib/blog";
import { postImage } from "@/lib/blog/images";

const guides = posts.slice(0, 3).map((p) => ({ slug: p.slug, title: p.title, tag: p.tags[0], img: postImage(p.slug)?.src }));

/** The public site's header, footer and skip link. The dashboard has its own layout without them. */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader guides={guides} />
      <div id="main">{children}</div>
      <SiteFooter />
      <Motion />
      <Upsell />
      <ReferralCapture />
    </>
  );
}
