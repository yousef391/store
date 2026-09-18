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
 * Hook that sends TikTok Pixel events via the browser pixel.
 *
 * Maps standard e-commerce events to TikTok's event names:
 *   ViewContent  → ViewContent
 *   AddToCart    → AddToCart
 *   Purchase     → CompletePayment
 *
 * Usage:
 *   const { sendTiktokEvent } = useTiktokEvents();
 *   sendTiktokEvent('Purchase', { value: 5900, currency: 'DZD', contentIds: ['nocta-1'] });
 */
export function useTiktokEvents() {
  const sendTiktokEvent = useCallback(
    (eventName: string, customData?: EventCustomData) => {
      if (typeof window === "undefined") return;

      const ttq = (window as unknown as { ttq?: TTQ }).ttq;
      if (!ttq) return;

      // Map Meta-style event names to TikTok equivalents
      const tiktokEventMap: Record<string, string> = {
        Purchase: "CompletePayment",
        ViewContent: "ViewContent",
        AddToCart: "AddToCart",
        InitiateCheckout: "InitiateCheckout",
        AddPaymentInfo: "AddPaymentInfo",
        Search: "Search",
      };

      const tiktokEventName = tiktokEventMap[eventName] || eventName;

      // Build TikTok pixel params
      const pixelParams: Record<string, unknown> = {};
      if (customData?.value !== undefined) pixelParams.value = customData.value;
      if (customData?.currency) pixelParams.currency = customData.currency;
      if (customData?.contentIds) pixelParams.contents = customData.contentIds.map(id => ({
        content_id: id,
        content_type: customData.contentType || "product",
        content_name: customData.contentName,
      }));
      if (customData?.contentName) pixelParams.content_name = customData.contentName;
      if (customData?.contentCategory) pixelParams.content_category = customData.contentCategory;
      if (customData?.contentType) pixelParams.content_type = customData.contentType;
      if (customData?.orderId) pixelParams.order_id = customData.orderId;

      ttq.track(tiktokEventName, pixelParams);
    },
    []
  );

  return { sendTiktokEvent };
}
