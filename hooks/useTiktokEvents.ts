"use client";

import { useCallback } from "react";

interface EventCustomData {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  contentCategory?: string;
  contentType?: string;
  orderId?: string;
}

interface TTQ {
  track: (event: string, params?: Record<string, unknown>) => void;
  page: () => void;
  identify: (params: Record<string, unknown>) => void;
}

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
 * Hook that sends TikTok events both via browser pixel and server-side Events API.
 *
 * TikTok event names (per official docs):
 *   ViewContent, AddToCart, Purchase, InitiateCheckout,
 *   AddPaymentInfo, Search, PlaceAnOrder, CompleteRegistration, AddToWishlist
 *
 * Usage:
 *   const { sendTiktokEvent } = useTiktokEvents();
 *   sendTiktokEvent('Purchase', { value: 5900, currency: 'DZD', contentIds: ['nocta-1'] });
 */
export function useTiktokEvents() {
  const sendTiktokEvent = useCallback(
    (eventName: string, customData?: EventCustomData) => {
      const eventId = generateEventId();

      // ── 1. Browser Pixel ──
      if (typeof window !== "undefined") {
        const ttq = (window as unknown as { ttq?: TTQ }).ttq;
        if (ttq) {
          const pixelParams: Record<string, unknown> = {};
          if (customData?.value !== undefined) pixelParams.value = customData.value;
          if (customData?.currency) pixelParams.currency = customData.currency;
          if (customData?.contentIds) {
            pixelParams.content_id = customData.contentIds[0];
            pixelParams.contents = customData.contentIds.map(id => ({
              content_id: id,
              content_type: customData.contentType || "product",
              content_name: customData.contentName,
            }));
          }
          if (customData?.contentName) pixelParams.content_name = customData.contentName;
          if (customData?.contentType) pixelParams.content_type = customData.contentType;
          pixelParams.event_id = eventId;

          ttq.track(eventName, pixelParams);
        }
      }

      // ── 2. Server-side Events API (primary) ──
      const ttclid = getCookie("ttclid");
      const ttp = getCookie("_ttp");

      const payload = {
        eventName,
        eventId,
        eventSourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        userData: {
          ttclid,
          ttp,
        },
        customData,
      };

      fetch("/api/tiktok-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    },
    []
  );

  return { sendTiktokEvent };
}
