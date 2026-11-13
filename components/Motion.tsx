"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Blocks that fade up when they scroll into view. Siblings get a small stagger. */
const REVEAL = [
  ".section-head", ".feature", ".tool-card", ".post-card", ".post-lead", ".person-card", ".how-grid > *",
  ".plan", ".price-cols article", ".faq-list details", ".split > *", ".pillar", ".tool-group-head", ".pre-footer-inner", ".newsletter-box",
  ".photo", ".product-frame", ".stat", ".example-stats", ".feature-list li",
].join(",");

/** Count a number up from 0 to its value (the real number is already in the HTML). */
function countUp(el: HTMLElement) {
  const end = Number(el.dataset.count);
  if (!Number.isFinite(end) || el.dataset.counted) return;
  el.dataset.counted = "1";
  const start = performance.now();
  const dur = 1100;
  const tick = (t: number) => {
    const k = Math.min(1, (t - start) / dur);
    el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Scroll animations and a back-to-top button with a progress ring.
 * Content is fully in the HTML (crawlers don't run this); without JavaScript or with
 * "reduce motion" on, nothing is hidden.
 */
export default function Motion() {
  const [progress, setProgress] = useState(0);

  // Scrollable boxes (code, wide tables, page text) must be reachable by keyboard (WCAG 2.1.1),
  // including ones that tools and reports render later. Runs whatever the motion setting.
  useEffect(() => {
    const focusable = () =>
      document.querySelectorAll<HTMLElement>("pre, .table-wrap, .aiview-doc").forEach((el) => {
        if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
      });
    focusable();
    const mo = new MutationObserver(focusable);
    mo.observe(document.getElementById("main") ?? document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          e.target.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll(REVEAL).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const idx = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
        (el as HTMLElement).style.setProperty("--d", `${Math.min(idx, 5) * 70}ms`);
        el.classList.add("reveal");
        io.observe(el);
      });
    };
    scan();
    // Results rendered later (tool output, reports) get picked up too.
    const mo = new MutationObserver(() => scan());
    mo.observe(document.getElementById("main") ?? document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const c = 2 * Math.PI * 21;
  return (
    <button
      type="button"
      className={`to-top no-print ${progress > 0.08 ? "show" : ""}`}
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" className="to-top-track" />
        <circle cx="24" cy="24" r="21" className="to-top-bar" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 24 24)" />
      </svg>
      <ArrowUp size={18} />
    </button>
  );
}
