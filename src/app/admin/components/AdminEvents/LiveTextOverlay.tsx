
'use client'

import { useState, useEffect } from 'react'
import { HiChatBubbleLeftRight } from 'react-icons/hi2'

interface LiveTextOverlayProps {
  triggerEvent: (eventType: string, options?: Record<string, unknown>) => Promise<void>
  isTriggering: boolean
}

const FONT_OPTIONS = [
  { name: 'Times', value: 'Times New Roman, serif' },
  { name: 'Helvetica', value: 'Helvetica, sans-serif' },
  { name: 'Courier', value: 'Courier New, monospace' },
  { name: 'Impact', value: 'Impact, fantasy' },
  { name: 'Comic Sans', value: 'Comic Sans MS, cursive' },
  { name: 'UnifrakturMaguntia', value: 'var(--font-unifraktur-maguntia), serif' },
  { name: 'Press Start 2P', value: 'var(--font-press-start-2p), monospace' },
  { name: 'VT323', value: 'var(--font-vt323), monospace' },
  { name: 'Silkscreen', value: 'var(--font-silkscreen), monospace' },
  { name: 'Webdings', value: 'Webdings, cursive' },
]

export default function LiveTextOverlay({ triggerEvent, isTriggering }: LiveTextOverlayProps) {
  const [displayText, setDisplayText] = useState('')
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].value)

  const handleTextChange = (text: string) => {
    setDisplayText(text)
    // Send text in real-time as user types
    triggerEvent('SET_DISPLAY_TEXT', { text })
  }

  const handleClearText = async () => {
    setDisplayText('')
    await triggerEvent('CLEAR_DISPLAY_TEXT')
  }

  const handleFontChange = async (fontFamily: string) => {
    setSelectedFont(fontFamily)
    await triggerEvent('SET_TEXT_FONT', { fontFamily })
  }

  // Keyboard navigation for font cycling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        
        const currentIndex = FONT_OPTIONS.findIndex(font => font.value === selectedFont)
        let newIndex
        
        if (event.key === 'ArrowLeft') {
          // Go to previous font (wrap to end if at beginning)
          newIndex = currentIndex <= 0 ? FONT_OPTIONS.length - 1 : currentIndex - 1
        } else {
          // Go to next font (wrap to beginning if at end)
          newIndex = currentIndex >= FONT_OPTIONS.length - 1 ? 0 : currentIndex + 1
        }
        
        handleFontChange(FONT_OPTIONS[newIndex].value)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFont])  // Re-run when selectedFont changes

  return (
    <div className="space-y-4">
      <h4 className="text-md font-semibold text-white">Live Text Overlay</h4>
      <div className="p-4 bg-gray-700 rounded-lg">
        <div className="flex items-center space-x-3 mb-4">
          <HiChatBubbleLeftRight className="text-lg" />
          <div>
            <div className="text-white font-medium">Real-time Text Display</div>
            <div className="text-gray-400 text-sm">Type text to display over the video in real-time</div>
          </div>
        </div>
        
        {/* Font Selection Grid */}
        <div className="mb-4">
          <div className="text-white font-medium mb-2">Font Style</div>
          <div className="flex flex-wrap gap-1.5">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.value}
                onClick={() => handleFontChange(font.value)}
                disabled={isTriggering}
                className={`cursor-pointer px-2.5 py-1.5 rounded text-center min-w-[60px] ${
                  selectedFont === font.value
                    ? 'bg-blue-600 text-white border-2 border-blue-400'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border-2 border-transparent'
                } disabled:opacity-50`}
                style={{ fontFamily: font.value }}
                title={font.name}
              >
                <div className="text-md font-bold">abc</div>
                <div className="text-xs mt-0.5">{font.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-3">
          <textarea
            value={displayText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Start typing to display text on screen..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 resize-none"
            style={{ fontFamily: selectedFont }}
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {displayText.length}/500 characters
            </div>
            <button
              onClick={handleClearText}
              disabled={isTriggering || !displayText.trim()}
              className="cursor-pointer px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Text
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 