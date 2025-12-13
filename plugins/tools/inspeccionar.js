// plugins/id.js
const handler = async (m, { args }) => {
  if (!args[0]) {
    return m.reply('⚠️ Uso: .id <link del canal>')
  }

  const link = args[0].trim()

  // Soporta links de canal nuevos y viejos
  const match = link.match(/channel\/([0-9]+)/)

  if (!match) {
    return m.reply('❌ Link de canal inválido')
  }

  const newsletterId = match[1]
  const jid = `${newsletterId}@newsletter`

  await m.reply(jid)
}

handler.command = ['id']
export default handler