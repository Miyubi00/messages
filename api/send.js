export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, message } = req.body;

  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
  if (!WEBHOOK_URL) {
    return res.status(500).json({ error: "Webhook not configured" });
  }

  // 🔒 Escape Discord markdown
  function escapeMarkdown(text = "") {
    return text.replace(/([\\`*_~|>])/g, "\\$1");
  }

  const safeName = escapeMarkdown(name || "Anonymous");
  const safeMessage = escapeMarkdown(message || "-");

  // FORMAT WAKTU WIB
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  const timeString = `${now.getFullYear()}-${pad(
    now.getMonth() + 1
  )}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())} WIB`;

  try {
    const discordRes = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            color: 0x5865f2,
            description:
              `**Nama:** ${safeName}\n\n` +
              `**Pesan:**\n${safeMessage}\n\n` +
              `**Waktu:** ${timeString}`,
            footer: {
              text: "Anonymous Message"
            },
            timestamp: now.toISOString()
          }
        ]
      })
    });

    if (!discordRes.ok) {
      const text = await discordRes.text();
      console.error("Discord error:", text);
      return res.status(500).json({ error: "Discord webhook failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
