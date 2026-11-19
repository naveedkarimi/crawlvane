import { redirect } from "next/navigation";
import { appUrl } from "@/lib/hosts";

/** The guide lives in the dashboard now, under Help & about. Old links land there. */
export default function GuidePage() {
  redirect(appUrl("/dashboard?tab=help"));
}
