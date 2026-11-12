"use client";

import { useEffect } from "react";
import { initAttribution } from "@/lib/attribution";

export default function AttributionTracker() {
  useEffect(() => {
    initAttribution();
  }, []);

  return null;
}
