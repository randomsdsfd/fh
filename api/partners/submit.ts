import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken"; // used to verify Discord auth cookie (optional)
import fetch from "node-fetch";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { username, group, reason } = req.body;
    if (!username || !group || !reason)
      return res.status(400).json({ error: "Missing required fields" });

    // 🔐 Check for Discord authentication
    const token = req.cookies["bloxion_discord_token"];
    if (!token)
      return res.status(401).json({ error: "Unauthorized. Please log in with Discord." });

    // Verify JWT / decode Discord user data
    let discordUser;
    try {
      discordUser = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token." });
    }

    // 🧩 Webhook
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) return res.status(500).json({ error: "Webhook not configured." });

    // 📨 Build Discord embed
    const embed = {
      title: "🧪 New Early Access Request",
      color: 0x00ffaa,
      fields: [
        { name: "Roblox Username", value: username, inline: true },
        { name: "Group", value: group, inline: true },
        { name: "Reason", value: reason },
        { name: "Discord User", value: `<@${discordUser.id}> (${discordUser.username}#${discordUser.discriminator})` },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "Bloxion Partner Form" },
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
