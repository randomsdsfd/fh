import type { IncomingMessage, ServerResponse } from "http";
import jwt from "jsonwebtoken";

// helper function to make responses easier
function json(res: ServerResponse, code: number, data: any) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export default async function handler(
  req: IncomingMessage & { method?: string; headers: any; body?: any },
  res: ServerResponse
) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    // Extract cookie manually
    const cookieHeader = req.headers.cookie || "";
    const cookieMatch = cookieHeader.match(/bloxion_discord_token=([^;]+)/);
    const token = cookieMatch ? cookieMatch[1] : null;

    if (!token) {
      return json(res, 401, { error: "Unauthorized (no cookie)" });
    }

    // Verify the JWT
    let user: any;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return json(res, 401, { error: "Invalid or expired token" });
    }

    // Read body (Vercel auto-parses JSON; fallback to empty)
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyRaw = Buffer.concat(chunks).toString();
    const body = bodyRaw ? JSON.parse(bodyRaw) : {};

    const { group, reason } = body;
    if (!group || !reason) {
      return json(res, 400, { error: "Missing required fields" });
    }

    const WEBHOOK_URL = process.env.WEBHOOK_URL!;
    if (!WEBHOOK_URL) {
      return json(res, 500, { error: "Webhook URL not configured" });
    }

    // Build webhook payload
    const payload = {
      username: "Bloxion Partners",
      embeds: [
        {
          title: "📝 New Partner Application",
          color: 0x00d2ff,
          fields: [
            {
              name: "👤 Discord User",
              value: `${user.username}#${user.discriminator} (${user.id})`,
            },
            { name: "🏢 Roblox Group", value: group },
            { name: "💬 Reason", value: reason },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send to Discord webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const errText = await webhookResponse.text();
      console.error("Webhook error:", errText);
      return json(res, 500, { error: "Failed to send webhook" });
    }

    return json(res, 200, { success: true });
  } catch (err) {
    console.error("Partner form error:", err);
    return json(res, 500, { error: "Internal Server Error" });
  }
}
