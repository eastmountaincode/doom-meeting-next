'use client'

import { useState } from 'react'

export default function AdminEvents() {
  const [isTriggering, setIsTriggering] = useState(false)
  const [lastEvent, setLastEvent] = useState<string>('')

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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Event Controls</h3>
      
      {/* Status */}
      {lastEvent && (
        <div className="text-sm text-gray-300">
          Status: {lastEvent}
        </div>
      )}

      {/* Simple Buttons */}
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
  )
} 