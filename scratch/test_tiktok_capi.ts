import { sendTiktokServerEvent } from "../lib/tiktok-capi";

async function runTest() {
  console.log("Sending test Purchase event to TikTok CAPI...");
  const result = await sendTiktokServerEvent({
    eventName: "Purchase",
    eventId: "test-event-" + Date.now(),
    eventSourceUrl: "https://store-nu-six-26.vercel.app/checkout",
    userData: {
      email: "test@example.com",
      phone: "0555555555",
      firstName: "Test",
      lastName: "User",
      clientIpAddress: "192.168.1.1",
      clientUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    customData: {
      value: 5400,
      currency: "DZD",
      contentIds: ["test-product-1"],
      contentName: "Test Product",
      contentType: "product",
      orderId: "TEST-" + Date.now(),
    }
  });

  console.log("Result:", result);
}

runTest();
