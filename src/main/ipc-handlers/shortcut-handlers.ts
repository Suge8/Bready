import { ipcMain } from 'electron'
import { shortcutService } from '../services/shortcut-service'

ipcMain.handle('shortcut:get', () => {
  return shortcutService.getConfig()
})

ipcMain.handle('shortcut:set', (_, shortcut: string) => {
  return shortcutService.updateShortcut(shortcut)
})
