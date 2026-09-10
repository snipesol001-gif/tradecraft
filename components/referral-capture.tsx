"use client";

// Mounted once in the root layout. On every page load it checks the URL
// for ?ref=CODE and persists it. This is what makes referral links work
// no matter which page a visitor lands on first.

import { useEffect } from "react";
import { captureRefFromUrl } from "@/lib/referral-client";

export default function ReferralCapture() {
  useEffect(() => {
    captureRefFromUrl();
  }, []);
  return null;
}