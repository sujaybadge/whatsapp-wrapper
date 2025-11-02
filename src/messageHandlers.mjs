// src/messageHandlers.mjs
import mime from 'mime-types'

export async function registerMessageHandlers(sock) {
  sock.ev.on('messages.upsert', async (msgUpsert) => {
    const msg = msgUpsert.messages?.[0]
    if (!msg?.message) return
    const sender = msg.key.remoteJid
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''
    console.log('📩', sender, '→', text)

    // simple echo (optional)
    if (text.toLowerCase().startsWith('ping'))
      await sock.sendMessage(sender, { text: 'pong ✅' })
  })
}

export async function sendText(sock, jid, text) {
  if (!jid || !text) throw new Error('jid and text required')
  await sock.sendMessage(jid, { text })
}

export async function sendFile(sock, jid, fileBuffer, fileName, caption) {
  if (!jid || !fileBuffer) throw new Error('jid and file are required')
  const mimeType =
    mime.lookup(fileName) || 'application/octet-stream'
  const options = {
    mimetype: mimeType,
    fileName: fileName,
    caption: caption,
  }

  if (mimeType.startsWith('image/')) options.image = fileBuffer
  else if (mimeType.startsWith('video/')) options.video = fileBuffer
  else if (mimeType.startsWith('audio/')) options.audio = fileBuffer
  else options.document = fileBuffer

  await sock.sendMessage(jid, options)
}
