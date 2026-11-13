import type { LucideIcon } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { BookOpen, Briefcase, Building2, Code2, HelpCircle, Layers, Mail, Network, ScanSearch, Smartphone, Store } from "lucide-react";

/**
 * The site's menu groups, shared by the header (desktop and phone) and the footer so they
 * always list the same pages. Free tools come from lib/tools.ts; guides from lib/blog.ts.
 */
export interface NavLink { href: string; label: string; text: string; icon: LucideIcon; badge?: string }
export interface NavGroup { title: string; links: NavLink[] }

export const PRODUCT: NavGroup[] = [
  {
    title: "Audit a website",
    links: [
      { href: "/#audit", label: "Page check", text: "Score one page for SEO, answers and AI search in about 20 seconds.", icon: ScanSearch },
      { href: "/?mode=full#audit", label: "Full site report", text: "Crawl up to 300 pages and find the problems that repeat.", icon: Network },
      { href: "/bulk", label: "Bulk audit", text: "Paste up to 20 URLs and get scores and the top issue for each.", icon: Layers },
    ],
  },
  {
    title: "Audit an app",
    links: [
      { href: "/tools/app-store-checker", label: "App Check", text: "Check an App Store or Google Play listing, with a score and fixes.", icon: Smartphone, badge: "New" },
    ],
  },
  {
    title: "For developers",
    links: [
      { href: "/developers", label: "API", text: "Run audits from your own code. One endpoint, JSON results.", icon: Code2 },
    ],
  },
];

/** The Features page: linked from the bottom of the Product menu and from the footer. */
export const ALL_FEATURES = { href: "/features", label: "See all features" };

/** Who it's for: the Solutions menu and the "Who it's for" section of the Features page. */
export const AUDIENCES = [
  {
    id: "site-owners", icon: Store, title: "Site owners", short: "Know what to fix first.",
    text: "Know what to fix, in what order, before you spend more on content or development.",
    img: "/images/pexels-site-owner.jpg", alt: "A small business owner checking orders on a laptop among shipping boxes",
  },
  {
    id: "consultants", icon: Briefcase, title: "Consultants", short: "Clear findings to share with clients.",
    text: "Open client conversations with clear, shareable findings and a ready-made plan.",
    img: "/images/pexels-consultant.jpg", alt: "A consultant reviewing work on a laptop in a studio",
  },
  {
    id: "agencies", icon: Building2, title: "Agencies", short: "Audit client sites at scale.",
    text: "Audit client sites at scale. White-label reports and monitoring are on the way.",
    img: "/images/pexels-agency-team.jpg", alt: "An agency team gathered around a laptop reviewing a client site",
  },
];

export const SOLUTIONS: NavLink[] = AUDIENCES.map((a) => ({ href: `/features#${a.id}`, label: `For ${a.title.toLowerCase()}`, text: a.short, icon: a.icon }));

export const RESOURCES: NavGroup[] = [
  {
    title: "Learn",
    links: [
      { href: "/blog", label: "Blog and guides", text: "Plain-English guides to SEO and AI search.", icon: BookOpen },
      { href: "/#faq", label: "FAQ", text: "Short answers to common questions.", icon: HelpCircle },
    ],
  },
  {
    title: "Help",
    links: [
      { href: BRAND.contactUrl, label: "Contact", text: "Questions about results or fixes.", icon: Mail },
    ],
  },
];
