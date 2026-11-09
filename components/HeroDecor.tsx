const Sparkle = ({ className, size = 22 }: { className: string; size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0l1.6 6.4L16 8l-6.4 1.6L8 16l-1.6-6.4L0 8l6.4-1.6z" fill="currentColor" />
  </svg>
);

/** Decorative, gently floating hero details. Hidden from assistive tech; static with "reduce motion". */
export default function HeroDecor() {
  return (
    <div className="hero-decor" aria-hidden="true">
      <Sparkle className="deco deco-s1 float-a" size={26} />
      <Sparkle className="deco deco-s2 float-b" size={16} />
      <Sparkle className="deco deco-s3 float-c" size={20} />
      <span className="deco deco-ring float-b" />
    </div>
  );
}
