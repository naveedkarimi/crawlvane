"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import Logo from "./Logo";
import { TOOL_ICONS } from "./toolIcons";
import { TOOL_GROUPS, TOOLS, toolUrl } from "@/lib/tools";
import AccountLink from "./AccountLink";

export interface GuideLink { slug: string; title: string; img?: string; alt?: string; tag: string }
type MenuKey = "tools" | "guides" | null;

/**
 * Floating rounded header that turns into a full-width bar once you scroll,
 * with a "Free tools" mega menu, a "Guides" menu and a mobile panel.
 * Menus open on hover (desktop) or click/keyboard (everywhere); Escape closes.
 */
/** Tool groups for the Free tools menus. App Check has its own main menu link. */
const MENU_GROUPS = TOOL_GROUPS.filter((g) => g.key !== "apps");

export default function SiteHeader({ guides }: { guides: GuideLink[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<MenuKey>(null);
  const [mobile, setMobile] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
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
    if (!mobile) setToolsOpen(false);
  }, [mobile]);

  const hover = (k: MenuKey) => ({
    onMouseEnter: () => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(k); },
    onMouseLeave: () => { closeTimer.current = setTimeout(() => setOpen(null), 160); },
  });
  const trigger = (k: Exclude<MenuKey, null>, label: string) => (
    <button type="button" className="nav-trigger" aria-expanded={open === k} aria-controls={`menu-${k}`} onClick={() => setOpen(open === k ? null : k)}>
      {label} <ChevronDown size={15} aria-hidden="true" />
    </button>
  );

  return (
    <header ref={ref} className={`site-header no-print ${scrolled ? "is-scrolled" : ""} ${open ? "menu-open" : ""} ${mobile ? "mobile-open" : ""}`}>
      <div className="container">
        <div className="header-bar">
          <Logo badge />
          <nav aria-label="Main navigation" className="main-nav">
            <a href="/tools/app-store-checker" className="nav-app">App Check <span className="nav-new">New</span></a>
            <div className="nav-item" {...hover("tools")}>
              {trigger("tools", "Free tools")}
              <div id="menu-tools" className={`mega ${open === "tools" ? "open" : ""}`}>
                <div className="mega-cols">
                  {MENU_GROUPS.map((g) => (
                    <div key={g.key} className="mega-col">
                      <div className="mega-title">{g.title}</div>
                      {TOOLS.filter((t) => t.group === g.key).map((t) => {
                        const Icon = TOOL_ICONS[t.icon];
                        return (
                          <a key={t.slug} href={toolUrl(t.slug)} className="mega-link">
                            <span className="mega-icon"><Icon size={17} /></span>
                            <span><strong>{t.short}</strong><small>{t.summary}</small></span>
                          </a>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <a href="/#features">Features</a>
            <a href="/#how">How it works</a>
            <a href="/pricing">Pricing</a>
            <div className="nav-item" {...hover("guides")}>
              {trigger("guides", "Guides")}
              <div id="menu-guides" className={`mega mega-guides ${open === "guides" ? "open" : ""}`}>
                <div className="mega-posts">
                  {guides.map((g) => (
                    <a key={g.slug} href={`/blog/${g.slug}`} className="mega-post">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {g.img && <img src={g.img} alt="" loading="lazy" />}
                      <small>{g.tag}</small>
                      <strong>{g.title}</strong>
                    </a>
                  ))}
                </div>
                <div className="mega-foot">
                  <a href="/blog">All guides <ArrowRight size={14} /></a>
                  <a href="/llms.txt">llms.txt</a>
                </div>
              </div>
            </div>
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
            {[
              ["/tools/app-store-checker", "App Check"],
              ["/#features", "Features"],
              ["/#how", "How it works"],
              ["/pricing", "Pricing"],
              ["/blog", "Guides"],
            ].map(([href, label], i) => (
              <a key={href} href={href} style={{ ["--i" as string]: i }} onClick={() => setMobile(false)}>
                {label} <ArrowRight size={18} aria-hidden="true" />
              </a>
            ))}
            <button type="button" className="mobile-tools-toggle" style={{ ["--i" as string]: 5 }} aria-expanded={toolsOpen} aria-controls="mobile-tools" onClick={() => setToolsOpen(!toolsOpen)}>
              Free tools <span className="mobile-count">{TOOLS.filter((x) => x.group !== "apps").length}</span> <ChevronDown size={18} aria-hidden="true" />
            </button>
            <div id="mobile-tools" className={`mobile-tools ${toolsOpen ? "open" : ""}`}>
              <div>
                {MENU_GROUPS.map((g) => (
                  <div key={g.key} className="mobile-tool-group">
                    <div className="mobile-group">{g.title}</div>
                    {TOOLS.filter((t) => t.group === g.key).map((t) => {
                      const Icon = TOOL_ICONS[t.icon];
                      return <a key={t.slug} href={toolUrl(t.slug)} tabIndex={toolsOpen ? 0 : -1}><Icon size={16} /> {t.short}</a>;
                    })}
                  </div>
                ))}
                <a className="mobile-all" href="/tools" tabIndex={toolsOpen ? 0 : -1}>All free tools <ArrowRight size={14} /></a>
              </div>
            </div>
          </nav>
        </div>
        <div className="mobile-foot container">
          <a className="btn btn-light btn-block" href="/#audit" onClick={() => setMobile(false)}>Run a free audit <ArrowRight size={16} /></a>
          <AccountLink variant="mobile" onNavigate={() => setMobile(false)} />
          <div className="mobile-links">
            <a href="/contact">Contact</a>
            <a href="/bulk">Bulk audit</a>
            <a href="/developers">API</a>
          </div>
        </div>
      </div>
    </header>
  );
}
