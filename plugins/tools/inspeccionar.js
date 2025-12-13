// plugins/id.js
const handler = async (m, { conn, args }) => {
  if (!args[0]) {
    return m.reply('⚠️ Uso: .id <link del canal>')
  }

  try {
    // ejemplo link:
    // https://whatsapp.com/channel/0029VaXXXXXXX
    const match = args[0].match(/channel\/([0-9A-Za-z]+)/i)
    if (!match) return m.reply('❌ Link de canal inválido')

    const inviteCode = match[1]

    const metadata = await conn.newsletterMetadata('invite', inviteCode)

    // JID real del canal
    const jid = metadata.id

    await conn.sendMessage(
      m.chat,
      { text: jid },
      { quoted: m }
    )
  } catch (e) {
    console.error(e)
    m.reply('❌ No pude obtener el ID del canal')
  }
}

handler.command = ['id']
export default handler