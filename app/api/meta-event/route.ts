import { NextRequest, NextResponse } from "next/server";
import { sendServerEvent, MetaEventPayload } from "@/lib/meta-capi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      eventName,
      eventId,
      eventSourceUrl,
      userData = {},
      customData = {},
    } = body as MetaEventPayload;

    if (!eventName || !eventId) {
      return NextResponse.json({ error: "Missing eventName or eventId" }, { status: 400 });
    }

    // Extract client info from request headers
    const clientIpAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";
    const clientUserAgent = req.headers.get("user-agent") || "";

    // Extract Facebook cookies if sent by the client
    const fbc = userData.fbc || undefined;
    const fbp = userData.fbp || undefined;

    const result = await sendServerEvent({
      eventName,
      eventId,
      eventSourceUrl,
      userData: {
        ...userData,
        clientIpAddress,
        clientUserAgent,
        fbc,
        fbp,
      },
      customData,
      actionSource: "website",
    });

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      console.error("[meta-event route]", result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }
  } catch (err) {
    console.error("[meta-event route] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
