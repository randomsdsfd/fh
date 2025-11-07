import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

// Required: set this in your Vercel or .env file
const WEBHOOK_URL = process.env.PARTNER_WEBHOOK_URL!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if user is authenticated via cookie
    const cookie = req.headers.cookie?.split("bloxion_discord_token=")[1]?.split(";")[0];
    if (!cookie) return res.status(401).json({ error: "Unauthorized" });

    const user = jwt.verify(cookie, process.env.JWT_SECRET!) as any;

    const { group, reason } = req.body;
    if (!group || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Build the Discord webhook payload
    const payload = {
      username: "Bloxion Partners",
      avatar_url: "https://app.bloxion.xyz/icon.png", // optional
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
            {
              name: "🏢 Roblox Group",
              value: group,
              inline: false,
            },
            {
              name: "💬 Reason for Joining",
              value: reason,
              inline: false,
            },
          ],
          footer: {
            text: "Bloxion Partner Requests • " + new Date().toLocaleString(),
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send the webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      console.error("Failed to send webhook:", await webhookResponse.text());
      return res.status(500).json({ error: "Failed to send webhook" });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Partner form error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
