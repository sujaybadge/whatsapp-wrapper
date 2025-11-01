// src/index.mjs
import express from 'express'
import bodyParser from 'body-parser'
import QR from 'qrcode'
import { initInstance, getInstance, getLatestQR } from './instanceManager.mjs'
import { registerMessageHandlers, sendText, sendFile } from './messageHandlers.mjs'


const app = express()
app.use(bodyParser.json({ limit: '25mb' }))

// Initialize WhatsApp socket on startup
let sock
;(async () => {
  sock = await initInstance()
  await registerMessageHandlers(sock)
})()

// --- ROUTES ---
app.get('/', (_req, res) => res.send('Baileys WhatsApp API is running 🚀'))

app.get('/qr.png', async (_req, res) => {
  const qr = getLatestQR()
  if (!qr) return res.status(404).send('No QR available yet')
  const img = await QR.toBuffer(qr, { width: 300, margin: 1 })
  res.setHeader('Content-Type', 'image/png')
  res.send(img)
})

// send text
app.post('/sendText', async (req, res) => {
  try {
    const { jid, text } = req.body
    const sock = getInstance()
    await sendText(sock, jid, text)
    res.json({ status: 'sent' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// send file (url or path)
app.post('/sendFile', async (req, res) => {
  try {
    const { jid, file, fileName } = req.body
    const sock = getInstance()
    await sendFile(sock, jid, file, fileName)
    res.json({ status: 'sent' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log('HTTP listening on', port))
