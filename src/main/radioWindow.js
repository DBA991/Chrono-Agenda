import { BrowserWindow } from 'electron'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { is } from '@electron-toolkit/utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let radioWindow = null
let radioServer = null
const RADIO_PORT = 45459

/**
 * Crea il server Express dedicato al componente Radio
 */
function createRadioServer() {
  if (radioServer) return `http://localhost:${RADIO_PORT}`

  const app = express()

  // Serve i file statici della radio
  app.use(express.static(path.join(__dirname, '../renderer')))

  // Rotta specifica per la pagina radio
  app.get('/radio', (req, res) => {
    res.sendFile(path.join(__dirname, '../renderer/radio.html'))
  })

  radioServer = app.listen(RADIO_PORT, 'localhost', () => {
    console.log(`Radio server running on http://localhost:${RADIO_PORT}`)
  })

  return `http://localhost:${RADIO_PORT}`
}

/**
 * Chiude il server Express della radio
 */
function closeRadioServer() {
  return new Promise((resolve) => {
    if (radioServer) {
      radioServer.close(() => {
        radioServer = null
        resolve()
      })
    } else {
      resolve()
    }
  })
}

/**
 * Crea la finestra dedicata alla Radio
 */
function createRadioWindow() {
  if (radioWindow && !radioWindow.isDestroyed()) {
    radioWindow.focus()
    return radioWindow
  }

  radioWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Chrono Radio',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  radioWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  )

  radioWindow.on('ready-to-show', () => {
    radioWindow.show()
  })

  // Gestione apertura link esterni (YouTube)
  radioWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://www.youtube.com/watch')) {
      import('electron').then(({ shell }) => shell.openExternal(url))
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Cleanup quando la finestra viene chiusa
  radioWindow.on('closed', async () => {
    await closeRadioServer()
    radioWindow = null
  })

  // Carica il file HTML appropriato
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // In development, usa il dev server di Vite
    radioWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/radio.html`)
  } else {
    // In production, usa il server Express
    const serverUrl = createRadioServer()
    radioWindow.loadURL(`${serverUrl}/radio.html`)
  }

  return radioWindow
}

/**
 * Chiude la finestra Radio e il suo server
 */
async function closeRadioWindow() {
  if (radioWindow && !radioWindow.isDestroyed()) {
    radioWindow.close()
    radioWindow = null
  }
  await closeRadioServer()
}

/**
 * Toggle: apre o chiude la finestra Radio
 */
async function toggleRadioWindow() {
  if (radioWindow && !radioWindow.isDestroyed()) {
    await closeRadioWindow()
    return { status: 'closed' }
  } else {
    createRadioWindow()
    return { status: 'opened' }
  }
}

/**
 * Verifica se la finestra Radio è aperta
 */
function isRadioWindowOpen() {
  return radioWindow !== null && !radioWindow.isDestroyed()
}

/**
 * Cleanup completo (da chiamare prima di chiudere l'app)
 */
async function cleanup() {
  await closeRadioWindow()
}

export { toggleRadioWindow, isRadioWindowOpen, cleanup, createRadioWindow, closeRadioWindow }
