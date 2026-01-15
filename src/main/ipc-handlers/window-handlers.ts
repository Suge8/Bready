import { ipcMain } from 'electron'
import { createFloatingWindow, getMainWindow, getFloatingWindow } from '../window-manager'
import { createLogger } from '../utils/logging'

const logger = createLogger('window-handlers')
const debugApp = process.env.DEBUG_APP === '1'

ipcMain.handle('enter-collaboration-mode', () => {
  try {
    if (debugApp) logger.debug('进入协作模式')
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (debugApp) logger.debug('协作模式保持主窗口尺寸')
      return true
    }
    return false
  } catch (error) {
    logger.error('进入协作模式失败', { error })
    return false
  }
})

ipcMain.handle('exit-collaboration-mode', () => {
  try {
    if (debugApp) logger.debug('退出协作模式')
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (debugApp) logger.debug('退出协作模式，保持当前窗口尺寸')
      return true
    }
    return false
  } catch (error) {
    logger.error('退出协作模式失败', { error })
    return false
  }
})

ipcMain.handle('create-floating-window', () => {
  try {
    if (debugApp) logger.debug('正在创建浮窗')
    let floatingWindow = getFloatingWindow()
    if (!floatingWindow) {
      floatingWindow = createFloatingWindow()
      if (debugApp) logger.debug('浮窗创建结果', { created: !!floatingWindow })
      return true
    } else {
      if (debugApp) logger.debug('浮窗已存在')
      floatingWindow.show()
      floatingWindow.focus()
      return true
    }
  } catch (error) {
    logger.error('创建浮窗失败', { error })
    return false
  }
})

ipcMain.handle('close-floating-window', () => {
  const floatingWindow = getFloatingWindow()
  if (floatingWindow) {
    floatingWindow.close()
  }
  return true
})

export {}
