import type { ReactNode } from "react";
import HeroDecor from "./HeroDecor";

/**
 * The page heading used everywhere except the home page: pale mint background, floating
 * details, centred label and title, and a wavy bottom edge. Same look as the Free tools page.
 */
export default function PageHero({
  kicker,
  title,
  children,
  id = "page-title",
  className = "",
}: {
  kicker?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section className={`hero hero-tool ${className}`.trim()} aria-labelledby={id}>
      <HeroDecor />
      <div className="container hero-inner">
        {kicker && <div className="kicker kicker-center">{kicker}</div>}
        <h1 id={id} className="tool-title">{title}</h1>
        {children}
      </div>
    </section>
  );
}
