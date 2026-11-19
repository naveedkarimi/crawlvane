import type { ReactNode } from "react";
import HeroDecor from "./HeroDecor";

/**
 * The page heading used everywhere except the home page and the free tools: navy like the home
 * hero, with its network pattern, floating details, a centred label and title, and a wavy bottom edge.
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
    <section className={`hero hero-tool hero-page ${className}`.trim()} aria-labelledby={id}>
      <HeroDecor />
      <div className="container hero-inner">
        {kicker && <div className="kicker kicker-center">{kicker}</div>}
        <h1 id={id} className="tool-title">{title}</h1>
        {children}
      </div>
    </section>
  );
}
