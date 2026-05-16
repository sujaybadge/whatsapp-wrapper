// src/instanceManager.mjs
import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys'
import { createPostgresAuthState } from './instance.mjs'
import { clearAllAuth } from './db.mjs'

let sock = null
let latestQR = null
let reconnecting = false
const RECONNECT_DELAY_MS = 2000

export async function initInstance() {
  // if a healthy socket exists, reuse it
  if (sock && !reconnecting) return sock

  const { state, saveCreds } = await createPostgresAuthState()

  const newSock = makeWASocket({
    auth: state,
    browser: ['Baileys v7 API', 'Chrome', '1.0.0'],
    syncFullHistory: false,
  })

  sock = newSock
  reconnecting = false

  newSock.ev.on('creds.update', saveCreds)

  newSock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) latestQR = qr
    if (connection === 'open') {
      console.log('✅ WhatsApp connected')
    }

    if (connection === 'close') {
      const err = lastDisconnect?.error
      const code =
        err?.output?.statusCode ?? err?.statusCode ?? err?.code ?? err

      const loggedOut = code === DisconnectReason.loggedOut || code === 401
      console.log('⚠️ Connection closed. Reconnect?', !loggedOut)

      // IMPORTANT: drop the old reference so initInstance() can create a new socket
      sock = null

      if (!loggedOut) {
        if (!reconnecting) {
          reconnecting = true
          setTimeout(() => {
            initInstance().catch((e) => {
              reconnecting = false
              console.error('Reconnect failed:', e?.message || e)
            })
          }, RECONNECT_DELAY_MS)
        }
      } else {
        console.error('Logged out — clear DB creds & re-pair.')
      }
    }
  })

  return newSock
}

export function getInstance() {
  if (!sock) throw new Error('Instance not initialized yet')
  return sock
}

export function getLatestQR() {
  return latestQR
}

export async function logoutInstance() {
  try {
    if (sock) {
      // attempt graceful logout if supported
      if (typeof sock.logout === 'function') {
        try {
          await sock.logout()
        } catch (e) {
          console.warn('Logout call failed:', e?.message || e)
        }
      }
      try {
        // close underlying connection if available
        if (sock.ws) sock.ws.close()
      } catch (e) {
        // ignore
      }
    }
  } finally {
    // clear saved credentials so next init re-pairs
    try {
      await clearAllAuth()
    } catch (e) {
      console.warn('Failed to clear auth storage:', e?.message || e)
    }
    sock = null
    latestQR = null
  }
}
