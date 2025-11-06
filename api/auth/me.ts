import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies["bloxion_discord_token"];
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const user = jwt.verify(token, process.env.JWT_SECRET!);

    return res.status(200).json({
      id: (user as any).id,
      username: (user as any).username,
      discriminator: (user as any).discriminator,
      avatar: (user as any).avatar,
      tag: `${(user as any).username}#${(user as any).discriminator}`,
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
