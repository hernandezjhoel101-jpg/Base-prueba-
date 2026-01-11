import fetch from 'node-fetch';

// 🌟 API de Gemini
const gemini = {
  getNewCookie: async function () {
    const res = await fetch(
      "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=en-US&_reqid=173780&rt=c",
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",
        method: "POST",
      }
    );

    const cookieHeader = res.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('No se encontró el encabezado "set-cookie" en la respuesta.');
    return cookieHeader.split(';')[0];
  },

  ask: async function (prompt, previousId = null) {
    if (typeof prompt !== "string" || !prompt?.trim()?.length)
      throw new Error("❌ Debes escribir un mensaje válido.");

    let resumeArray = null;
    let cookie = null;

    if (previousId) {
      try {
        const s = Buffer.from(previousId, 'base64').toString('utf-8');
        const j = JSON.parse(s);
        resumeArray = j.newResumeArray;
        cookie = j.cookie;
      } catch {
        previousId = null;
      }
    }

    const headers = {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "x-goog-ext-525001261-jspb": "[1,null,null,null,\"9ec249fc9ad08861\",null,null,null,[4]]",
      "cookie": cookie || await this.getNewCookie(),
    };

    const b = [[prompt], ["en-US"], resumeArray];
    const a = [null, JSON.stringify(b)];
    const body = new URLSearchParams({ "f.req": JSON.stringify(a) });

    const response = await fetch(
      `https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=en-US&_reqid=2813378&rt=c`,
      { headers, body, method: 'POST' }
    );

    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const data = await response.text();
    const match = data.matchAll(/^\d+\n(.+?)\n/gm);
    const chunks = Array.from(match, m => m[1]);

    let text, newResumeArray;
    let found = false;

    for (const chunk of chunks.reverse()) {
      try {
        const realArray = JSON.parse(chunk);
        const parse1 = JSON.parse(realArray[0][2]);
        if (parse1 && parse1[4] && parse1[4][0] && parse1[4][0][1] && typeof parse1[4][0][1][0] === 'string') {
          newResumeArray = [...parse1[1], parse1[4][0][0]];
          text = parse1[4][0][1][0].replace(/\*\*(.+?)\*\*/g, `*$1*`);
          found = true;
          break;
        }
      } catch {}
    }

    if (!found) throw new Error("❌ No se pudo procesar la respuesta. La API pudo haber cambiado.");

    const id = Buffer.from(JSON.stringify({ newResumeArray, cookie: headers.cookie })).toString('base64');
    return { text, id };
  }
};

const geminiSessions = {};

const handler = async (msg, { conn, args, command }) => {
  const text = args.join(' ');
  const chatId = msg.key.remoteJid;
  const pref = global.prefixes?.[0] || ".";

  if (!text) {
    return conn.sendMessage(chatId, {   
      text: `✳️ Ingresa tu pregunta\n📌 Ejemplo: *${pref}${command}* ¿quién inventó WhatsApp?`   
    }, { quoted: msg });  
  }

  try {
    await conn.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

    const name = msg.pushName || 'Usuario';
    const previousId = geminiSessions[msg.sender];
    const result = await gemini.ask(text, previousId);
    geminiSessions[msg.sender] = result.id;

    const responseMsg = `╭━〔 *RESPUESTA IA* 〕━⬣

│  ✦ Pregunta: ${text}
│  ✦ Usuario: ${name}
╰━━━━━━━━━━━━⬣

${result.text}

╭━〔 FUENTE 〕━⬣
│  ✦ Powered by luminai
╰━━━━━━━━━━━━⬣`;

    await conn.sendMessage(chatId, { text: responseMsg }, { quoted: msg });
    await conn.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    console.error(error);
    await conn.sendMessage(chatId, {   
      text: `❌ Error: ${error.message}`   
    }, { quoted: msg });  
    await conn.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
  }
};

handler.help = ['luminai <pregunta>'];
handler.command = ['luminai', 'ask'];
handler.tags = ['ai'];

export default handler;