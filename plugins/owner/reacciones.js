// plugins/react.js — ESM preciso
import fetch from "node-fetch";

const handler = async (msg, { conn, text, args }) => {
  const chat = msg.key.remoteJid;
  const raw = (text || args.join(" ")).trim();

  if (!raw) {
    return conn.sendMessage(chat, {
      text:
        "👻 Uso: .react <link_post> <emoji1,emoji2>\n\n" +
        "Ejemplo:\n.rc https://whatsapp.com/channel/xxx/123 😨,🤣",
    }, { quoted: msg });
  }

  await conn.sendMessage(chat, { react: { text: "⏳", key: msg.key } });

  try {
    const [postLink, ...rest] = raw.split(" ");
    const emojis = rest.join(" ")
      .split(/[,，]/)
      .map(e => e.trim())
      .filter(Boolean);

    if (!/whatsapp\.com\/channel\//i.test(postLink))
      return fail("🚫 Link inválido.");

    if (!emojis.length)
      return fail("⚠️ Escribe al menos 1 emoji.");

    if (emojis.length > 4)
      return fail("❗ Máximo 4 emojis.");

    const apiKey = process.env.REACT_API_KEY || "TU_API_KEY";

    const url =
      "https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/react-to-post";

    // 🔒 LÍMITE EXACTO
    const MAX_REACTIONS = 75;

    let sent = 0;
    let index = 0;

    while (sent < MAX_REACTIONS) {
      const emoji = emojis[index % emojis.length];

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          post_link: postLink,
          reacts: emoji, // ⚠️ SOLO 1 EMOJI
        }),
      });

      if (!res.ok) break;

      sent++;
      index++;

      // ⏱️ pequeño delay para evitar flood interno del API
      await new Promise(r => setTimeout(r, 120));
    }

    await conn.sendMessage(chat, { react: { text: "✅", key: msg.key } });
    return conn.sendMessage(
      chat,
      { text: `✅ Se enviaron *${sent} reacciones exactas* 👻` },
      { quoted: msg }
    );

    function fail(t) {
      conn.sendMessage(chat, { react: { text: "❌", key: msg.key } });
      return conn.sendMessage(chat, { text: t }, { quoted: msg });
    }

  } catch (e) {
    console.error("[react-precise]", e);
    conn.sendMessage(chat, { react: { text: "❌", key: msg.key } });
    return conn.sendMessage(chat, {
      text: "⚠️ Error inesperado.",
    }, { quoted: msg });
  }
};

handler.command = ["r", "rc", "channelreact"];
export default handler;