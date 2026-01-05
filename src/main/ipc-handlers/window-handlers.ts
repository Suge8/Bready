import { ipcMain } from 'electron'
import { createWindow, createFloatingWindow, getMainWindow, getFloatingWindow } from '../window-manager'

const debugApp = process.env.DEBUG_APP === '1'

// 协作模式处理
ipcMain.handle('enter-collaboration-mode', () => {
  try {
    if (debugApp) {
      console.log('进入协作模式...')
    }
    const mainWindow = getMainWindow()
    if (mainWindow) {
      // 协作模式保持和主页相同的窗口大小，保持原位置
      if (debugApp) {
        console.log('协作模式保持主窗口尺寸')
      }
      return true
    }
    return false
  } catch (error) {
    console.error('进入协作模式失败:', error)
    return false
  }
})

ipcMain.handle('exit-collaboration-mode', () => {
  try {
    if (debugApp) {
      console.log('退出协作模式...')
    }
    const mainWindow = getMainWindow()
    if (mainWindow) {
      // 恢复主窗口原始大小，保持原位置
      mainWindow.setSize(1000, 700)
      if (debugApp) {
        console.log('主窗口已恢复到默认尺寸')
      }
      return true
    }
    return false
  } catch (error) {
    console.error('退出协作模式失败:', error)
    return false
  }
})

// 浮窗处理
ipcMain.handle('create-floating-window', () => {
  try {
    if (debugApp) {
      console.log('正在创建浮窗...')
    }
    let floatingWindow = getFloatingWindow()
    if (!floatingWindow) {
      floatingWindow = createFloatingWindow()
      if (debugApp) {
        console.log('浮窗创建结果:', !!floatingWindow)
      }
      return true
    } else {
      if (debugApp) {
        console.log('浮窗已存在')
      }
      floatingWindow.show()
      floatingWindow.focus()
      return true
    }
  } catch (error) {
    console.error('创建浮窗失败:', error)
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
