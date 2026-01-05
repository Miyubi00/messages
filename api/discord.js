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
  // VALIDASI PAYLOAD BARU
  // ================================
  const { type, sender, content, repliedTo } = req.body || {};

  if (!["message", "reply"].includes(type)) {
    return res.status(400).json({ error: "Tipe tidak valid" });
  }

  if (
    typeof content !== "string" ||
    content.trim().length === 0 ||
    content.length > 255
  ) {
    return res.status(400).json({ error: "Pesan tidak valid" });
  }

  if (typeof sender !== "string" || sender.trim().length === 0) {
    return res.status(400).json({ error: "Pengirim tidak valid" });
  }

  // ================================
  // ENV WEBHOOK
  // ================================
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
  if (!WEBHOOK_URL) {
    return res.status(500).json({ error: "Webhook not configured" });
  }

  // ================================
  // ESCAPE DISCORD MARKDOWN
  // ================================
  function escapeMarkdown(text = "") {
    return text.replace(/([\\`*_~|>])/g, "\\$1");
  }

  const safeSender = escapeMarkdown(sender);
  const safeContent = escapeMarkdown(content);
  const safeRepliedTo = repliedTo
    ? escapeMarkdown(repliedTo)
    : null;

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
  // BUILD DISCORD EMBED
  // ================================
  let description = "";

if (type === "message") {
  description =
    `**💬 Pesan Baru**\n\n` +
    `**Dari:** ${safeSender}\n\n` +
    `**Pesan:**\n${safeContent}\n\n` +
    `**IP:** \`${ip}\``;
}

if (type === "reply") {
  description =
    `**🔁 Reply Baru**\n\n` +
    `**Dari:** ${safeSender}\n\n` +
    (safeRepliedTo
      ? `**Membalas:**\n> ${safeRepliedTo}\n\n`
      : "") +
    `**Isi:**\n${safeContent}\n\n` +
    `**IP:** \`${ip}\``;
}


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
            color: 0x9b5cff,
            description,
            footer: {
              text: `Anonymous Message • ${timeString}`
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
