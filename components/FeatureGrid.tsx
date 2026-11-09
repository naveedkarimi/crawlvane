"use client";

import type { ComponentType } from "react";
import {
  BellRing,
  Eye,
  Bot,
  CircleUser,
  FileCode,
  FileText,
  Gauge,
  MessageSquareText,
  Network,
  ScanSearch,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useConfig } from "@/lib/client";
import { SoonBadge } from "./ui";

const ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  aiView: Eye,
  botTest: ShieldCheck,
  siteCrawl: Network,
  competitors: Users,
  fixes: Wrench,
  aiPlan: Sparkles,
  pagespeed: Gauge,
  social: Share2,
  aiVisibility: Bot,
  deepResearch: ScanSearch,
  monitoring: BellRing,
  jsRender: FileCode,
  whiteLabel: FileText,
  socialPosts: MessageSquareText,
  accounts: CircleUser,
};

export default function FeatureGrid() {
  const { cfg } = useConfig();
  if (!cfg) return <div className="feature-list feature-grid-loading" aria-hidden="true" />;
  const live = cfg.features.filter((f) => f.public);
  const soon = cfg.features.filter((f) => !f.public);
  return (
    <>
      <ul className="feature-list">
        {live.map((f) => {
          const Icon = ICONS[f.key] ?? Sparkles;
          return (
            <li key={f.key}>
              <span className="feature-list-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.6} /></span>
              <div>
                <h3>{f.name}</h3>
                <p>{f.description}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* The roadmap is only shown in admin preview; on the public site it lives on the pricing page. */}
      {cfg.admin && soon.length > 0 && (
        <div className="admin-roadmap">
          <h3>Built but switched off (admin only)</h3>
          <div className="feature-grid">
            {soon.map((f) => {
              const Icon = ICONS[f.key] ?? Sparkles;
              return (
                <article key={f.key} className="feature feature-soon">
                  <span className="feature-icon"><Icon size={20} strokeWidth={1.75} /></span>
                  <h3>{f.name} {f.enabled ? <span className="live">Preview on</span> : <SoonBadge plan={f.plan} />}</h3>
                  <p>{f.description}</p>
                  {f.requires && f.requires.length > 0 && (
                    <p className="tiny mono">Needs {f.requires.join(", ")} · FEATURE_{f.key.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase()}=1</p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
