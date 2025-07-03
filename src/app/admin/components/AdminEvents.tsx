'use client'

import { useState, useRef } from 'react'
import { HexColorPicker } from 'react-colorful'

export default function AdminEvents() {
  const [isTriggering, setIsTriggering] = useState(false)
  const [lastEvent, setLastEvent] = useState<string>('')
  const [showNameLabels, setShowNameLabels] = useState(true)
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const lastColorSentRef = useRef(0)

  const triggerEvent = async (eventType: string, options: Record<string, unknown> = {}) => {
    try {
      setIsTriggering(true)
      
      const response = await fetch('/api/admin/trigger-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: eventType,
          ...options,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setLastEvent(`${eventType} sent`)
        console.log('Event triggered:', result.event)
      } else {
        setLastEvent(`Failed: ${result.error}`)
        console.error('Event failed:', result.error)
      }
    } catch (error) {
      setLastEvent(`Error: ${error}`)
      console.error('Trigger error:', error)
    } finally {
      setIsTriggering(false)
    }
  }

  const toggleNameLabels = async () => {
    const newState = !showNameLabels
    setShowNameLabels(newState)
    await triggerEvent('TOGGLE_NAME_LABELS', { showNameLabels: newState })
  }

  // Throttled real-time color update (50ms)
  const handleColorChange = (color: string) => {
    setBackgroundColor(color)
    const now = Date.now()
    if (now - lastColorSentRef.current > 50) {
      lastColorSentRef.current = now
      triggerEvent('SET_BACKGROUND_COLOR', { backgroundColor: color })
    }
  }

  // Reset to white
  const handleReset = async () => {
    setBackgroundColor('#ffffff')
    await triggerEvent('SET_BACKGROUND_COLOR', { backgroundColor: '#ffffff' })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-white">Event Controls</h3>
      
      {/* Status */}
      {lastEvent && (
        <div className="text-sm text-gray-300">
          Status: {lastEvent}
        </div>
      )}

      {/* Display Controls */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Display Settings</h4>
        
        <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2">
          <div className="flex items-center space-x-3">
            <span className="text-lg">🏷️</span>
            <div>
              <div className="text-white font-medium">Screen Name Labels</div>
              <div className="text-gray-400 text-sm">Show participant names below video feeds</div>
            </div>
          </div>
          <button
            onClick={toggleNameLabels}
            disabled={isTriggering}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${
              showNameLabels ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showNameLabels ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Background Color Picker */}
        <div className="flex flex-col items-center justify-center p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-lg">🎨</span>
            <div>
              <div className="text-white font-medium">Background Color</div>
              <div className="text-gray-400 text-sm">Change the display background in real time</div>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-4 w-full">
            <div className="w-full flex justify-center">
              <HexColorPicker
                color={backgroundColor}
                onChange={handleColorChange}
                style={{ width: 220, height: 220 }}
                aria-label="Pick background color"
              />
            </div>
            <button
              onClick={handleReset}
              className="mt-2 px-6 py-2 rounded bg-white text-gray-800 font-semibold shadow hover:bg-gray-100 border border-gray-300"
              disabled={isTriggering}
            >
              Reset to White
            </button>
          </div>
        </div>
      </div>

      {/* Event Buttons */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Event Triggers</h4>
        
        <div className="space-y-2">
          <button
            onClick={() => triggerEvent('EMPLOYEE_OF_MONTH', { message: 'Employee of the Month' })}
            disabled={isTriggering}
            className="block w-full text-left p-3 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Employee of the Month
          </button>
          
          <button
            onClick={() => triggerEvent('HIGH_FIVE', { message: 'High Five Challenge' })}
            disabled={isTriggering}
            className="block w-full text-left p-3 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            High Five Challenge
          </button>
          
          <button
            onClick={() => {
              const message = prompt('Enter custom message:')
              if (message) triggerEvent('CUSTOM', { message })
            }}
            disabled={isTriggering}
            className="block w-full text-left p-3 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Custom Message
          </button>
          
          <button
            onClick={() => triggerEvent('RESET', { message: 'Display cleared' })}
            disabled={isTriggering}
            className="block w-full text-left p-3 bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Display
          </button>
        </div>
      </div>
    </div>
  )
} 