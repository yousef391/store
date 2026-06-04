"use client";

import { useCallback } from "react";

interface UserInfo {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
}

interface EventCustomData {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  contentCategory?: string;
  contentType?: string;
  orderId?: string;
}

type FBQ = (
  action: string,
  event: string,
  params?: Record<string, unknown>,
  options?: Record<string, unknown>
) => void;

/**
 * Generate a UUID v4 for event deduplication between browser pixel and CAPI.
 */
function generateEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Read a cookie value by name.
 */
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Hook that sends Meta events both via browser pixel and server-side CAPI.
 *
 * Usage:
 *   const { sendEvent } = useMetaEvents();
 *   sendEvent('Purchase', { value: 5900, currency: 'DZD', contentIds: ['nocta-1'] });
 */
export function useMetaEvents(userInfo?: UserInfo) {
  const sendEvent = useCallback(
    (eventName: string, customData?: EventCustomData) => {
      const eventId = generateEventId();

      // ── 1. Browser Pixel (fallback for deduplication) ──
      if (typeof window !== "undefined") {
        const fbq = (window as unknown as { fbq?: FBQ }).fbq;
        if (fbq) {
          const pixelParams: Record<string, unknown> = {};
          if (customData?.value !== undefined) pixelParams.value = customData.value;
          if (customData?.currency) pixelParams.currency = customData.currency;
          if (customData?.contentIds) pixelParams.content_ids = customData.contentIds;
          if (customData?.contentName) pixelParams.content_name = customData.contentName;
          if (customData?.contentCategory) pixelParams.content_category = customData.contentCategory;
          if (customData?.contentType) pixelParams.content_type = customData.contentType;

          fbq("track", eventName, pixelParams, { eventID: eventId });
        }
      }

      // ── 2. Server-side CAPI (primary) ──
      const fbc = getCookie("_fbc");
      const fbp = getCookie("_fbp");

      const payload = {
        eventName,
        eventId,
        eventSourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        userData: {
          email: userInfo?.email,
          phone: userInfo?.phone,
          firstName: userInfo?.firstName,
          lastName: userInfo?.lastName,
          userId: userInfo?.userId,
          fbc,
          fbp,
        },
        customData,
      };

      fetch("/api/meta-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => {
        console.error("[useMetaEvents] CAPI request failed:", err);
      });
    },
    [userInfo]
  );

  return { sendEvent };
}
