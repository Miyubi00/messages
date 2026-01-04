// ================================
// SIMPLE IP RATE LIMIT (10s)
// ================================
const ipCooldown = new Map();
const COOLDOWN_MS = 10_000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ================================
  // GET REAL IP (CLOUDFLARE + VERCEL)
  // ================================
  const ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    "unknown";

  const nowTime = Date.now();
  const lastTime = ipCooldown.get(ip) || 0;

  if (nowTime - lastTime < COOLDOWN_MS) {
    return res.status(429).json({
      error: "Terlalu cepat. Tunggu 10 detik."
    });
  }

  ipCooldown.set(ip, nowTime);

  // ================================
  // VALIDASI PAYLOAD
  // ================================
  const { name, message } = req.body || {};

  if (
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.length > 255
  ) {
    return res.status(400).json({ error: "Pesan tidak valid" });
  }

  if (name && typeof name !== "string") {
    return res.status(400).json({ error: "Nama tidak valid" });
  }

  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
  if (!WEBHOOK_URL) {
    return res.status(500).json({ error: "Webhook not configured" });
  }

  // ================================
  // ESCAPE DISCORD MARKDOWN
  // ================================
  function escapeMarkdown(text = "") {
    return text.replace(/([\\`*_~|>])/g, "\\$1");
  }

  const safeName = escapeMarkdown(name || "Anonymous");
  const safeMessage = escapeMarkdown(message);

  // ================================
  // FORMAT WAKTU WIB
  // ================================
  const now = new Date();
  const wib = new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now)
  );

  const pad = (n) => String(n).padStart(2, "0");

  const timeString = `${wib.getFullYear()}-${pad(
    wib.getMonth() + 1
  )}-${pad(wib.getDate())} ${pad(wib.getHours())}:${pad(
    wib.getMinutes()
  )}:${pad(wib.getSeconds())} WIB`;


  // ================================
  // SEND TO DISCORD
  // ================================
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
              `**IP:** \`${ip}\`\n` +
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
