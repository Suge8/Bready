import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useVisibilityWatchdog(
  selectors: string[],
  options: { delay?: number; checkInterval?: number } = {},
) {
  if (import.meta.env.PROD) return

  const { delay = 1500, checkInterval = 500 } = options

  setTimeout(() => {
    selectors.forEach((selector) => {
      const el = document.querySelector(selector) as HTMLElement | null
      if (!el) return

      const checkVisibility = () => {
        const style = getComputedStyle(el)
        const opacity = parseFloat(style.opacity)
        if (opacity < 0.1) {
          console.error(`[Visibility Watchdog] Element invisible: ${selector}`, {
            opacity,
            transform: style.transform,
            visibility: style.visibility,
            element: el,
          })

          let parent = el.parentElement
          while (parent) {
            const ps = getComputedStyle(parent)
            if (parseFloat(ps.opacity) < 1 || ps.transform !== 'none') {
              console.warn(`[Visibility Watchdog] Ancestor issue:`, {
                element: parent,
                opacity: ps.opacity,
                transform: ps.transform,
              })
            }
            parent = parent.parentElement
          }
        }
      }

      checkVisibility()
      const intervalId = setInterval(checkVisibility, checkInterval)
      setTimeout(() => clearInterval(intervalId), 10000)
    })
  }, delay)
}
