import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import { is } from '@electron-toolkit/utils'
import path from 'path'
import { fileURLToPath } from 'url'
import moment from 'moment'
import * as db from './database.js'
import * as radioWindow from './radioWindow.js'
import icon from '../../build/icon.png?asset'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.on('closed', async () => {
    if (radioWindow.isRadioWindowOpen()) {
      await radioWindow.closeRadioWindow()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

const sendToAllWindows = (event) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(event)
  })
}

// ============================================================================
// RADIO WINDOW HANDLERS
// ============================================================================

ipcMain.handle('toggle-radio-window', async () => {
  return await radioWindow.toggleRadioWindow()
})

ipcMain.handle('is-radio-window-open', () => {
  return radioWindow.isRadioWindowOpen()
})

// ============================================================================
// DIARY HANDLERS
// ============================================================================

ipcMain.handle('save-diary', async (_, { date, text }) => {
  db.saveDiary(date, text)
  sendToAllWindows('diary-updated')
  return true
})

ipcMain.handle('load-diary-entries', async () => {
  return db.loadDiaryEntries()
})

ipcMain.handle('delete-diary', (_, date) => {
  db.deleteDiary(date)
  sendToAllWindows('diary-updated')
  return true
})

// ============================================================================
// EVENT HANDLERS
// ============================================================================

ipcMain.handle('save-event', async (_, event) => {
  const filename = event.filename || `event-${Date.now()}.json`
  db.saveEvent({
    ...event,
    filename,
    repeat: event.repeat || false
  })
  sendToAllWindows('event-updated')
  return true
})

ipcMain.handle('load-events', async () => {
  const now = moment().startOf('day')
  const events = db.loadEvents()
  const processedEvents = []

  for (const event of events) {
    const eventDate = moment(event.date, 'YYYY-MM-DD')

    if (eventDate.isBefore(now)) {
      if (event.repeat) {
        const newDate = eventDate.add(1, 'year').format('YYYY-MM-DD')
        const newFilename = db.updateEventDate(event.filename, newDate)

        processedEvents.push({
          ...event,
          date: newDate,
          filename: newFilename
        })
      } else {
        db.deleteEvent(event.filename)
      }
    } else {
      processedEvents.push(event)
    }
  }

  if (processedEvents.length !== events.length) {
    sendToAllWindows('event-updated')
  }

  return processedEvents
})

ipcMain.handle('delete-event', async (_, filename) => {
  const success = db.deleteEvent(filename)
  if (success) {
    sendToAllWindows('event-updated')
  }
  return success
})

// ============================================================================
// SCHEDULE HANDLERS
// ============================================================================

ipcMain.handle('save-schedule', async (_, { key, text }) => {
  db.saveSchedule(key, text)
  sendToAllWindows('schedule-updated')
  return true
})

ipcMain.handle('load-schedule', async () => {
  return db.loadSchedule()
})

ipcMain.handle('delete-schedule', async (_, key) => {
  const success = db.deleteSchedule(key)
  if (success) {
    sendToAllWindows('schedule-updated')
  }
  return success
})

// ============================================================================
// ALARM HANDLERS
// ============================================================================

ipcMain.handle('save-alarm', async (_, { filename, data }) => {
  db.saveAlarm(filename, data)
  sendToAllWindows('alarm-updated')
  return true
})

ipcMain.handle('load-alarms', async () => {
  return db.loadAlarms()
})

ipcMain.handle('delete-alarm', async (_, filename) => {
  const success = db.deleteAlarm(filename)
  if (success) {
    sendToAllWindows('alarm-updated')
  }
  return success
})

// ============================================================================
// NOTE HANDLERS
// ============================================================================

ipcMain.handle('save-note', async (_, note) => {
  db.saveNote({
    id: String(note.id),
    title: note.title,
    content: note.content,
    timestamp: note.timestamp || new Date().toISOString()
  })
  sendToAllWindows('notes-updated')
  return true
})

ipcMain.handle('load-notes', async () => {
  return db.loadNotes()
})

ipcMain.handle('delete-notes', async (_, ids) => {
  db.deleteNotes(ids)
  sendToAllWindows('notes-updated')
  return true
})

// ============================================================================
// ENTRIES HANDLERS
// ============================================================================

ipcMain.handle('save-entries', (_, entries) => {
  db.saveEntries(entries)
  sendToAllWindows('entries-updated')
  return true
})

ipcMain.handle('load-entries', () => {
  return db.loadEntries()
})

// ============================================================================
// NOTIFICATION HANDLER
// ============================================================================

ipcMain.on('show-notification', (_, { title, body, sound }) => {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      silent: !sound
    }).show()
  }
})

// ============================================================================
// APP LIFECYCLE
// ============================================================================

if (app.isPackaged) {
  app.setAppUserModelId(app.name)
}

app.whenReady().then(() => {
  createWindow()

  // Ottimizza il database dopo che la finestra è stata creata
  setTimeout(() => {
    db.optimizeDatabase()
  }, 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  if (radioWindow.isRadioWindowOpen()) {
    await radioWindow.cleanup()
  }
  if (process.platform !== 'darwin') {
    db.closeDatabase()
    app.quit()
  }
})

app.on('before-quit', async () => {
  // Chiudi la finestra radio prima di uscire
  await radioWindow.cleanup()
  db.closeDatabase()
})
