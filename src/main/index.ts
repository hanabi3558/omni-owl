import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, session } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { setupIPC } from './ipc'
import { AudioCaptureService } from './services/AudioCaptureService'
import { StorageService } from './services/StorageService'
import { WhisperService } from './services/WhisperService'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const iconPath = is.dev
  ? join(__dirname, '../../resources/icon.png')
  : join(process.resourcesPath, 'icon.png')

// Services
const audioService = new AudioCaptureService()
const storageService = new StorageService()
const whisperService = new WhisperService()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    title: 'OmniOwl',
    icon: iconPath,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Allow desktop audio capture
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    if (mainWindow) {
      mainWindow.webContents.send('select-media-source')
    }
    callback({ video: null, audio: 'loopback' })
  })

  // Close → minimize to tray
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setupIPC(mainWindow, audioService, storageService, whisperService)
}

function createTray(): void {
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Recorder',
      click: () => mainWindow?.show()
    },
    {
      label: 'Start Recording',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('tray:start-recording')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('OmniOwl')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

app.whenReady().then(async () => {
  await storageService.waitReady()
  createWindow()
  createTray()

  // Global shortcut: Ctrl+Shift+R to toggle recording
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    mainWindow?.show()
    mainWindow?.webContents.send('shortcut:toggle-recording')
  })
})

app.on('before-quit', async () => {
  isQuitting = true
  await whisperService.dispose()
  storageService.close()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
  }
})
