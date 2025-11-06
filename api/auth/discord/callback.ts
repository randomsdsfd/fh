import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string;
  if (!code) return res.status(400).json({ error: "Missing OAuth code" });

  try {
    // Exchange code → access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://app.bloxion.xyz/api/auth/discord/callback",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token)
      return res.status(400).json({ error: "Invalid token exchange" });

    // Fetch Discord user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userResponse.json();

    // Sign JWT and set as cookie
    const sessionToken = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: "7d" });
    res.setHeader(
      "Set-Cookie",
      `bloxion_discord_token=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax`
    );

    // Redirect back to partners page
    res.redirect("/partners/partners.html");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OAuth callback failed" });
  }
}
