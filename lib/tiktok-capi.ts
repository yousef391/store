import crypto from "crypto";
import { supabase } from "./supabase";

/**
 * SHA-256 hash a string value (lowercased, trimmed) as required by TikTok Events API.
 */
function hashValue(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export interface TiktokUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  ttclid?: string;
  ttp?: string;
}

export interface TiktokCustomData {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  contentCategory?: string;
  contentType?: string;
  orderId?: string;
}

export interface TiktokEventPayload {
  eventName: string;
  eventId: string;
  eventTime?: string;
  eventSourceUrl?: string;
  userData?: TiktokUserData;
  customData?: TiktokCustomData;
}

/**
 * Send a server-side event to TikTok Events API.
 * Reads credentials from store_settings in Supabase.
 *
 * Payload structure follows TikTok's official documentation:
 * - Event params: value, currency, content_id, content_type, content_name, event_id, event_time, url
 * - Customer params: email, phone, external_id, ip, user_agent, ttclid, ttp
 */
export async function sendTiktokServerEvent(
  payload: TiktokEventPayload
): Promise<{ success: boolean; error?: string }> {
  // Fetch credentials from DB
  const { data: settings } = await supabase
    .from("store_settings")
    .select("tiktok_pixel_id, tiktok_access_token")
    .eq("id", 1)
    .single();

  const pixelCode = settings?.tiktok_pixel_id;
  const accessToken = settings?.tiktok_access_token;

  if (!pixelCode || !accessToken) {
    console.warn("[TikTok CAPI] Pixel ID or Access Token not configured in store_settings.");
    return { success: false, error: "TikTok CAPI not configured" };
  }

  const {
    eventName,
    eventId,
    eventTime = new Date().toISOString(),
    eventSourceUrl,
    userData = {},
    customData = {},
  } = payload;

  // Build hashed user context
  const user: Record<string, unknown> = {};
  if (userData.email) user.email = hashValue(userData.email);
  if (userData.phone) user.phone_number = hashValue(userData.phone);
  if (userData.firstName) user.first_name = hashValue(userData.firstName);
  if (userData.lastName) user.last_name = hashValue(userData.lastName);
  if (userData.userId) user.external_id = hashValue(userData.userId);
  if (userData.ttclid) user.ttclid = userData.ttclid;
  if (userData.ttp) user.ttp = userData.ttp;

  // Build context
  const context: Record<string, unknown> = { user };
  if (userData.clientIpAddress) context.ip = userData.clientIpAddress;
  if (userData.clientUserAgent) context.user_agent = userData.clientUserAgent;
  if (eventSourceUrl) {
    context.page = { url: eventSourceUrl };
  }

  // Build properties — flat fields per TikTok's official payload spec
  const properties: Record<string, unknown> = {};
  if (customData.value !== undefined) properties.value = String(customData.value);
  if (customData.currency) properties.currency = customData.currency;
  if (customData.contentType) properties.content_type = customData.contentType;
  if (customData.contentName) properties.content_name = customData.contentName;
  if (customData.orderId) properties.order_id = customData.orderId;
  if (customData.contentIds && customData.contentIds.length > 0) {
    properties.content_id = customData.contentIds[0];
    // Also provide contents array for richer data
    properties.contents = customData.contentIds.map((id) => ({
      content_id: id,
      content_type: customData.contentType || "product",
      content_name: customData.contentName,
      content_category: customData.contentCategory,
    }));
  }

  const body = {
    pixel_code: pixelCode,
    event: eventName,
    event_id: eventId,
    timestamp: eventTime,
    context,
    properties,
  };

  try {
    const url = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify(body),
    });

    const resData = await res.json();

    if (resData.code !== 0) {
      console.error("[TikTok CAPI] Error:", resData.code, resData.message);
      return { success: false, error: `TikTok API: ${resData.message}` };
    }

    console.log(`[TikTok CAPI] Event sent: ${eventName} | code: ${resData.code}`);
    return { success: true };
  } catch (err) {
    console.error("[TikTok CAPI] Network error:", err);
    return { success: false, error: String(err) };
  }
}
