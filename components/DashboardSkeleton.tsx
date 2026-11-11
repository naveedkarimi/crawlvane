import { LogoMark } from "./Logo";
import { BRAND } from "@/lib/brand";

/**
 * The dashboard's shape while data loads: the real sidebar and grey placeholders where
 * cards will appear, so nothing jumps when the content arrives. No progress is implied.
 */
export default function DashboardSkeleton() {
  return (
    <div className="app-shell" aria-busy="true">
      <aside className="app-side" aria-hidden="true">
        <span className="app-logo"><LogoMark size={28} /><span>{BRAND.name}</span></span>
        <div className="app-nav">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="sk-nav"><i className="sk sk-dark sk-icon" /><i className="sk sk-dark" style={{ width: `${48 + ((i * 23) % 40)}%` }} /></div>
          ))}
        </div>
        <div className="side-plan"><i className="sk sk-dark" style={{ width: "50%" }} /><i className="sk sk-dark" style={{ width: "80%" }} /></div>
      </aside>
      <main id="main" className="app-main">
        <p className="sr-only" role="status">Loading your dashboard…</p>
        <div className="app-head" aria-hidden="true">
          <div className="sk-stack"><i className="sk sk-title" /><i className="sk" style={{ width: 220 }} /></div>
          <div className="site-actions"><i className="sk sk-btn" /><i className="sk sk-btn sk-btn-primary" /></div>
        </div>
        <div className="site-cards" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card site-tile sk-card">
              <div className="site-tile-top"><i className="sk" style={{ width: "55%" }} /><i className="sk sk-pill" /></div>
              <div className="site-tile-score"><i className="sk sk-ring" /><div className="sk-stack"><i className="sk" style={{ width: 130 }} /><i className="sk" style={{ width: 90 }} /></div></div>
              <div className="sk-stack">{[0, 1, 2].map((b) => <i key={b} className="sk sk-bar" />)}</div>
            </div>
          ))}
        </div>
        <div className="dash-row" aria-hidden="true">
          <div className="card dash-card sk-panel"><i className="sk" style={{ width: 170 }} /><i className="sk sk-chart" /></div>
          <div className="card dash-card sk-panel">{[0, 1, 2].map((r) => <div key={r} className="sk-stack"><i className="sk" style={{ width: "70%" }} /><i className="sk" style={{ width: "90%" }} /></div>)}</div>
        </div>
      </main>
    </div>
  );
}
