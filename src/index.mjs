// src/index.mjs
import express from 'express'
import bodyParser from 'body-parser'
import QR from 'qrcode'
import multer from 'multer'
import { initInstance, getInstance, getLatestQR } from './instanceManager.mjs'
import { registerMessageHandlers, sendText, sendFile } from './messageHandlers.mjs'


const app = express()
app.use(bodyParser.json({ limit: '25mb' }))

// --- Multer Setup for File Uploads ---
// We'll store files in memory as buffers
const upload = multer({ storage: multer.memoryStorage() })

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
app.post('/sendFile', upload.single('file'), async (req, res) => {
  try {
    const { jid, fileName, caption } = req.body
    if (!jid) {
      return res.status(400).json({ error: 'jid is required' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' })
    }

    const sock = getInstance()
    await sendFile(sock, jid, req.file.buffer, fileName || req.file.originalname, caption)
    res.json({ status: 'sent' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log('HTTP listening on', port))
