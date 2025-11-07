import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

// Optional: webhook URL to notify you of new partner applications
const WEBHOOK_URL = process.env.PARTNER_WEBHOOK_URL!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check authentication
    const cookie = req.headers.cookie?.split("bloxion_discord_token=")[1]?.split(";")[0];
    if (!cookie) return res.status(401).json({ error: "Unauthorized" });

    const user = jwt.verify(cookie, process.env.JWT_SECRET!) as any;

    const { group, reason } = req.body;
    if (!group || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Send to webhook (optional)
    if (WEBHOOK_URL) {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Bloxion Partners",
          embeds: [
            {
              title: "New Partner Application",
              color: 0x00d2ff,
              fields: [
                { name: "Discord", value: `${user.username}#${user.discriminator}`, inline: true },
                { name: "Roblox Group", value: group, inline: false },
                { name: "Reason", value: reason, inline: false },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
