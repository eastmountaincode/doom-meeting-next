'use client'

import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { screenNameAtom } from '../../store'

interface SpeakSectionProps {
  participantId?: string // LiveKit participant ID
  onSpeak?: (message: string) => void // Keep for backward compatibility/logging
}

export default function SpeakSection({ participantId, onSpeak }: SpeakSectionProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const screenName = useAtomValue(screenNameAtom)

  const sendSpeechMessage = async (text: string) => {
    try {
      setIsSending(true)
      
      const response = await fetch('/api/admin/trigger-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'SPEAK_MESSAGE',
          participantId: participantId || screenName, // Use participantId if available, fallback to screenName
          message: text,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('🗣️ Speech message sent successfully:', result)
      
      // Call the callback for any additional handling (like logging)
      onSpeak?.(text)
      
    } catch (error) {
      console.error('❌ Failed to send speech message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleSpeak = async () => {
    if (message.trim() && !isSending) {
      await sendSpeechMessage(message.trim())
      setMessage('') // Clear after sending
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSpeak()
    }
  }

  return (
    <div className="py-2 sm:py-3 space-y-2 sm:space-y-3">
      <div className="flex gap-1 sm:gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isSending}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 pr-10 text-sm sm:text-base bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {message && (
            <button
              onClick={() => setMessage('')}
              disabled={isSending}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded-full flex items-center justify-center text-white text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear message"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={handleSpeak}
          disabled={!message.trim() || isSending}
          className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? 'Sending...' : 'Speak'}
        </button>
      </div>
    </div>
  )
} 