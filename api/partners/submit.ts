import type { IncomingMessage, ServerResponse } from "http";
import jwt from "jsonwebtoken";

// we extend Node's base types so Vercel can still use them easily
export default async function handler(
  req: IncomingMessage & { method?: string; headers: any; body?: any },
  res: ServerResponse & {
    status: (code: number) => ServerResponse;
    json: (data: any) => void;
  }
) {
  // only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

    // Verify JWT
    let user;
    try {
      user = jwt.verify(cookie, process.env.JWT_SECRET!) as any;
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const { group, reason } = req.body || {};
    if (!group || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const WEBHOOK_URL = process.env.WEBHOOK_URL!;
    if (!WEBHOOK_URL) {
      return res.status(500).json({ error: "Webhook URL not configured" });
    }

    // Build the webhook payload
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
              inline: false,
            },
            { name: "🏢 Roblox Group", value: group, inline: false },
            { name: "💬 Reason", value: reason, inline: false },
          ],
          footer: {
            text: "Bloxion Partner System • " + new Date().toLocaleString(),
          },
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
      return res.status(500).json({ error: "Failed to send webhook" });
    }

    // All good
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Partner form error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}


