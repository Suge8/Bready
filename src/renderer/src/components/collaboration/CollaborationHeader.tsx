import React from "react"
import { ArrowLeft, Settings } from "lucide-react"
import { cn } from "../../lib/utils"

interface AudioModeOption {
  value: "system" | "microphone"
  label: string
  icon: React.ReactNode
  description: string
}

interface CollaborationHeaderProps {
  isMac: boolean
  title: string
  status: string
  isConnected: boolean
  audioModeOptions: AudioModeOption[]
  currentAudioMode: "system" | "microphone"
  showAudioModeDropdown: boolean
  onToggleAudioModeDropdown: () => void
  onAudioModeChange: (mode: "system" | "microphone") => void
  onOpenPermissions: () => void
  onExit: () => void
}

const CollaborationHeader: React.FC<CollaborationHeaderProps> = ({
  isMac,
  title,
  status,
  isConnected,
  audioModeOptions,
  currentAudioMode,
  showAudioModeDropdown,
  onToggleAudioModeDropdown,
  onAudioModeChange,
  onOpenPermissions,
  onExit,
}) => {
  return (
    <div className="w-full bg-[var(--bready-bg)] z-50 flex-shrink-0 app-drag pt-[15px]">
      <div className="h-8 w-full flex items-center justify-between app-drag">
        <button
          onClick={onExit}
          className={cn(
            "p-1.5 -mt-7 text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] transition-all duration-200 hover:bg-[var(--bready-surface-2)] rounded-lg cursor-pointer app-no-drag",
            isMac ? "ml-[68px]" : "ml-0"
          )}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex flex-col items-center pointer-events-none">
          <h1 className="font-semibold text-[var(--bready-text)]">{title}</h1>
          <div className="flex items-center justify-center space-x-2 text-xs text-[var(--bready-text-muted)]">
            {isConnected ? (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ) : (
              <div className="w-2 h-2 bg-red-500 rounded-full" />
            )}
            <span>{status}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 app-no-drag">
          <div className="relative app-no-drag">
            <button
              onClick={onToggleAudioModeDropdown}
              className="flex items-center space-x-1 px-2 py-1.5 bg-[var(--bready-surface-2)] text-[var(--bready-text)] rounded-lg text-xs hover:bg-[var(--bready-surface-3)] transition-all duration-200 cursor-pointer"
            >
              {audioModeOptions.find((option) => option.value === currentAudioMode)
                ?.icon}
              <span className="font-medium whitespace-nowrap">
                {audioModeOptions.find((option) => option.value === currentAudioMode)
                  ?.label}
              </span>
            </button>

            {showAudioModeDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-xl shadow-lg z-50 min-w-48">
                {audioModeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onAudioModeChange(option.value)}
                    className={`w-full px-3 py-2.5 text-left hover:bg-[var(--bready-surface-2)] transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg cursor-pointer ${
                      currentAudioMode === option.value
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "text-[var(--bready-text)]"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`mt-0.5 ${
                          currentAudioMode === option.value
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-[var(--bready-text-muted)]"
                        }`}
                      >
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-sm font-medium ${
                            currentAudioMode === option.value
                              ? "text-emerald-600 dark:text-emerald-300"
                              : "text-[var(--bready-text)]"
                          }`}
                        >
                          {option.label}
                        </div>
                        <div className="text-xs text-[var(--bready-text-muted)] mt-0.5">
                          {option.description}
                        </div>
                      </div>
                      {currentAudioMode === option.value && (
                        <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onOpenPermissions}
            className="p-2 text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] transition-all duration-200 hover:bg-[var(--bready-surface-2)] rounded-lg cursor-pointer app-no-drag"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CollaborationHeader
