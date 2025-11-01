// src/messageHandlers.mjs
import fs from 'fs'
import axios from 'axios'
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

export async function sendFile(sock, jid, filePathOrUrl, fileName) {
  if (!jid || !filePathOrUrl) throw new Error('jid and file required')
  let data
  if (/^https?:\/\//.test(filePathOrUrl)) {
    const res = await axios.get(filePathOrUrl, { responseType: 'arraybuffer' })
    data = Buffer.from(res.data)
  } else {
    data = fs.readFileSync(filePathOrUrl)
  }

  const mimeType =
    mime.lookup(fileName || filePathOrUrl) || 'application/octet-stream'
  const options = {
    mimetype: mimeType,
    fileName: fileName || filePathOrUrl.split('/').pop(),
  }

  if (mimeType.startsWith('image/')) options.image = data
  else if (mimeType.startsWith('video/')) options.video = data
  else if (mimeType.startsWith('audio/')) options.audio = data
  else options.document = data

  await sock.sendMessage(jid, options)
}
