"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import Logo from "./Logo";
import { TOOL_ICONS } from "./toolIcons";
import { TOOL_GROUPS, TOOLS, toolUrl } from "@/lib/tools";

/** Four quick tools shown in the phone menu while no section is open. */
const MOBILE_TRY = ["ai-visibility-checker", "robots-txt-checker", "llms-txt-generator", "page-speed-test"];
import { ALL_FEATURES, PRODUCT, RESOURCES, SOLUTIONS, type NavGroup, type NavLink } from "./navLinks";
import AccountLink from "./AccountLink";

export interface GuideLink { slug: string; title: string; img?: string; alt?: string; tag: string }
type MenuKey = "product" | "tools" | "solutions" | "resources";

/**
 * Floating rounded header that turns into a full-width bar once you scroll. Desktop menu, in
 * order: Product, Solutions, Free tools, Resources (drop-downs) and Pricing; phones get the same
 * groups as expandable sections. Menus open on hover (desktop) or click/keyboard; Escape closes.
 */
/** Tool groups for the Free tools menus. App Check sits under Product. */
const MENU_GROUPS = TOOL_GROUPS.filter((g) => g.key !== "apps");
const MENU_TOOLS = TOOLS.filter((t) => t.group !== "apps");

function MegaLink({ link }: { link: NavLink }) {
  const Icon = link.icon;
  return (
    <a href={link.href} className="mega-link">
      <span className="mega-icon"><Icon size={17} /></span>
      <span>
        <strong>{link.label}{link.badge && <span className="nav-new">{link.badge}</span>}</strong>
        <small>{link.text}</small>
      </span>
    </a>
  );
}

/** Several menu groups stacked in one column. */
function MegaGroups({ groups }: { groups: NavGroup[] }) {
  return (
    <div className="mega-col">
      {groups.map((g) => (
        <div key={g.title} className="mega-group">
          <div className="mega-title">{g.title}</div>
          {g.links.map((l) => <MegaLink key={l.href} link={l} />)}
        </div>
      ))}
    </div>
  );
}

export default function SiteHeader({ guides }: { guides: GuideLink[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<MenuKey | null>(null);
  const [mobile, setMobile] = useState(false);
  const [section, setSection] = useState<MenuKey | null>(null);
  const ref = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Different points for on and off, so small scroll changes can't flip the header back and forth.
    const onScroll = () => setScrolled((s) => (s ? window.scrollY > 8 : window.scrollY > 32));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(null), setMobile(false));
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(null);
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    if (!mobile) setSection(null);
  }, [mobile]);

  const hover = (k: MenuKey) => ({
    onMouseEnter: () => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(k); },
    onMouseLeave: () => { closeTimer.current = setTimeout(() => setOpen(null), 160); },
  });
  const trigger = (k: MenuKey, label: string) => (
    <button type="button" className="nav-trigger" aria-expanded={open === k} aria-controls={`menu-${k}`} onClick={() => setOpen(open === k ? null : k)}>
      {label} <ChevronDown size={15} aria-hidden="true" />
    </button>
  );
  const close = () => setMobile(false);

  /** One expandable section of the phone menu. */
  const mobileSection = (k: MenuKey, label: string, i: number, body: React.ReactNode, count?: number) => {
    const on = section === k;
    return (
      <>
        <button type="button" className="mobile-tools-toggle" style={{ ["--i" as string]: i }} aria-expanded={on} aria-controls={`mobile-${k}`} onClick={() => setSection(on ? null : k)}>
          {label} {count !== undefined && <span className="mobile-count">{count}</span>} <ChevronDown size={18} aria-hidden="true" />
        </button>
        <div id={`mobile-${k}`} className={`mobile-tools ${on ? "open" : ""}`}>
          <div inert={!on}>{body}</div>
        </div>
      </>
    );
  };
  const mobileLinks = (links: NavLink[]) =>
    links.map((l) => {
      const Icon = l.icon;
      return <a key={l.href} href={l.href} onClick={close}><span className="m-ico"><Icon size={16} aria-hidden="true" /></span> {l.label}{l.badge && <span className="nav-new">{l.badge}</span>}</a>;
    });
  const mobileGroups = (groups: NavGroup[]) =>
    groups.map((g) => (
      <div key={g.title} className="mobile-tool-group">
        <div className="mobile-group">{g.title}</div>
        {mobileLinks(g.links)}
      </div>
    ));

  return (
    <header ref={ref} className={`site-header no-print ${scrolled ? "is-scrolled" : ""} ${open ? "menu-open" : ""} ${mobile ? "mobile-open" : ""}`}>
      <div className="container">
        <div className="header-bar">
          <Logo badge />
          <nav aria-label="Main navigation" className="main-nav">
            <div className="nav-item" {...hover("product")}>
              {trigger("product", "Product")}
              <div id="menu-product" className={`mega mega-menu mega-product ${open === "product" ? "open" : ""}`}>
                <div className="mega-cols mega-cols-2">
                  <MegaGroups groups={PRODUCT.slice(0, 1)} />
                  <MegaGroups groups={PRODUCT.slice(1)} />
                </div>
                <div className="mega-foot">
                  <a href={ALL_FEATURES.href}>{ALL_FEATURES.label} <ArrowRight size={14} /></a>
                </div>
              </div>
            </div>

            <div className="nav-item" {...hover("solutions")}>
              {trigger("solutions", "Solutions")}
              <div id="menu-solutions" className={`mega mega-menu mega-solutions ${open === "solutions" ? "open" : ""}`}>
                <div className="mega-col">
                  <div className="mega-title">Who it&apos;s for</div>
                  {SOLUTIONS.map((l) => <MegaLink key={l.href} link={l} />)}
                </div>
              </div>
            </div>

            <div className="nav-item" {...hover("tools")}>
              {trigger("tools", "Free tools")}
              <div id="menu-tools" className={`mega mega-tools ${open === "tools" ? "open" : ""}`}>
                <div className="tools-cols">
                  {MENU_GROUPS.map((g) => (
                    <div key={g.key} className="tools-col">
                      <div className="mega-title">{g.title}</div>
                      {TOOLS.filter((t) => t.group === g.key).map((t) => {
                        const Icon = TOOL_ICONS[t.icon];
                        return (
                          <a key={t.slug} href={toolUrl(t.slug)} className="tools-item" title={t.summary}>
                            <span className="tools-icon"><Icon size={15} /></span>
                            <span>{t.short}</span>
                          </a>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="mega-foot">
                  <a href="/tools">All {MENU_TOOLS.length} free tools <ArrowRight size={14} aria-hidden="true" /></a>
                </div>
              </div>
            </div>

            <div className="nav-item" {...hover("resources")}>
              {trigger("resources", "Resources")}
              <div id="menu-resources" className={`mega mega-guides mega-resources ${open === "resources" ? "open" : ""}`}>
                <div className="mega-resources-grid">
                  <MegaGroups groups={RESOURCES} />
                  <div>
                    <div className="mega-title">Latest guides</div>
                    <div className="mega-posts">
                      {guides.slice(0, 2).map((g) => (
                        <a key={g.slug} href={`/blog/${g.slug}`} className="mega-post">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {g.img && <img src={g.img} alt="" width={1200} height={750} loading="lazy" decoding="async" />}
                          <small>{g.tag}</small>
                          <strong>{g.title}</strong>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mega-foot">
                  <a href="/blog">All guides <ArrowRight size={14} /></a>
                </div>
              </div>
            </div>

            <a href="/pricing">Pricing</a>
          </nav>
          <AccountLink />
          <button type="button" className="menu-btn" aria-label={mobile ? "Close menu" : "Open menu"} aria-expanded={mobile} aria-controls="mobile-menu" onClick={() => setMobile(!mobile)}>
            <span className="burger" aria-hidden="true"><span /><span /></span>
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={`mobile-panel ${mobile ? "open" : ""}`} inert={!mobile} aria-hidden={!mobile}>
        <div className="mobile-scroll">
          <nav aria-label="Mobile navigation" className="container mobile-nav">
            {mobileSection("product", "Product", 0, (
              <>
                {mobileGroups(PRODUCT)}
                <a className="mobile-all" href={ALL_FEATURES.href} onClick={close}>{ALL_FEATURES.label} <ArrowRight size={14} /></a>
              </>
            ))}
            {mobileSection("solutions", "Solutions", 1, <div className="mobile-tool-group">{mobileLinks(SOLUTIONS)}</div>)}
            {mobileSection("tools", "Free tools", 2, (
              <>
                {MENU_GROUPS.map((g) => (
                  <div key={g.key} className="mobile-tool-group">
                    <div className="mobile-group">{g.title}</div>
                    {TOOLS.filter((t) => t.group === g.key).map((t) => {
                      const Icon = TOOL_ICONS[t.icon];
                      return <a key={t.slug} href={toolUrl(t.slug)} onClick={close}><span className="m-ico"><Icon size={16} aria-hidden="true" /></span> {t.short}</a>;
                    })}
                  </div>
                ))}
                <a className="mobile-all" href="/tools" onClick={close}>All free tools <ArrowRight size={14} /></a>
              </>
            ), MENU_TOOLS.length)}
            {mobileSection("resources", "Resources", 3, mobileGroups(RESOURCES))}
            <a href="/pricing" style={{ ["--i" as string]: 4 }} onClick={close}>Pricing <ArrowRight size={18} aria-hidden="true" /></a>
          </nav>
          {section === null && (
            <div className="container mobile-try">
              <p className="mobile-group">Try a free tool</p>
              <div className="mobile-try-grid">
                {MOBILE_TRY.map((slug) => TOOLS.find((t) => t.slug === slug)).filter((t): t is (typeof TOOLS)[number] => !!t).map((t) => {
                  const Icon = TOOL_ICONS[t.icon];
                  return <a key={t.slug} href={toolUrl(t.slug)} onClick={close}><span className="m-ico"><Icon size={16} aria-hidden="true" /></span>{t.short}</a>;
                })}
              </div>
            </div>
          )}
        </div>
        <div className="mobile-foot container">
          <a className="btn btn-light btn-block m-audit" href="/#audit" onClick={close}>Run a free audit <ArrowRight size={16} aria-hidden="true" /></a>
          <AccountLink variant="mobile" onNavigate={close} />
        </div>
      </div>
    </header>
  );
}
