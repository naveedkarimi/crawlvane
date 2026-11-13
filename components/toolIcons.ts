import { Smartphone, Sparkles, Type, Accessibility, BarChart3, ScrollText, Bot, Braces, Eye, FileCode2, FileText, Gauge, ListTree, Lock, MessageCircleQuestion, Network, Share2, ShieldCheck, Waypoints } from "lucide-react";
import type { ToolIcon } from "@/lib/tools";

/** Icon per free tool. Kept apart from ToolPage so client components (the header menu) can import it. */
export const TOOL_ICONS: Record<ToolIcon, typeof Eye> = {
  phone: Smartphone,
  eye: Eye,
  shield: ShieldCheck,
  file: FileText,
  list: ListTree,
  braces: Braces,
  gauge: Gauge,
  share: Share2,
  message: MessageCircleQuestion,
  markdown: FileCode2,
  bot: Bot,
  redirect: Waypoints,
  sitemap: Network,
  lock: Lock,
  chart: BarChart3,
  logs: ScrollText,
  a11y: Accessibility,
  sparkle: Sparkles,
  type: Type,
};
