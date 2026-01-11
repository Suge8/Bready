import { globalShortcut, app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { ShortcutConfig } from '../../shared/ipc'

const DEFAULT_SHORTCUT = 'CommandOrControl+G'

class ShortcutService {
  private config: ShortcutConfig
  private configPath: string
  private onToggleWindow: (() => void) | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    this.configPath = join(userDataPath, 'shortcuts.json')
    this.config = this.loadConfig()
  }

  private loadConfig(): ShortcutConfig {
    try {
      if (existsSync(this.configPath)) {
        const data = readFileSync(this.configPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch {}
    return { toggleWindow: DEFAULT_SHORTCUT }
  }

  private saveConfig(): void {
    try {
      const dir = join(app.getPath('userData'))
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch {}
  }

  getConfig(): ShortcutConfig {
    return { ...this.config }
  }

  setToggleWindowCallback(callback: () => void): void {
    this.onToggleWindow = callback
  }

  registerShortcuts(): void {
    this.unregisterShortcuts()

    if (this.config.toggleWindow && this.onToggleWindow) {
      try {
        globalShortcut.register(this.config.toggleWindow, this.onToggleWindow)
      } catch {}
    }
  }

  unregisterShortcuts(): void {
    globalShortcut.unregisterAll()
  }

  updateShortcut(shortcut: string): { success: boolean; error?: string } {
    if (!this.validateShortcut(shortcut)) {
      return { success: false, error: 'Invalid shortcut format' }
    }

    this.unregisterShortcuts()
    this.config.toggleWindow = shortcut
    this.saveConfig()
    this.registerShortcuts()

    return { success: true }
  }

  private validateShortcut(shortcut: string): boolean {
    const modifiers = [
      'Command',
      'Cmd',
      'Control',
      'Ctrl',
      'CommandOrControl',
      'CmdOrCtrl',
      'Alt',
      'Option',
      'Shift',
      'Super',
      'Meta',
    ]
    const parts = shortcut.split('+')

    if (parts.length < 2) return false

    const hasModifier = parts.some((part) =>
      modifiers.some((mod) => part.toLowerCase() === mod.toLowerCase()),
    )

    return hasModifier
  }

  cleanup(): void {
    this.unregisterShortcuts()
  }
}

export const shortcutService = new ShortcutService()
