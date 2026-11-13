"use client";

import { useEffect } from "react";
import { rememberReferral } from "@/lib/referralClient";

/** Saves a ?ref= code from a referral link so it can be credited after sign-up. Renders nothing. */
export default function ReferralCapture() {
  useEffect(() => rememberReferral(), []);
  return null;
}
