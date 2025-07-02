'use client'

import { useState } from 'react'

export default function AdminSettings() {
  const [baseSpeed, setBaseSpeed] = useState(0.06)
  const [customInput, setCustomInput] = useState('0.06')
  const [isUpdating, setIsUpdating] = useState(false)

  const updateBaseSpeed = async (newSpeed: number) => {
    try {
      setIsUpdating(true)
      
      const response = await fetch('/api/admin/trigger-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'SET_BASE_SPEED',
          baseSpeed: newSpeed,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('Base speed updated:', result.event)
      } else {
        console.error('Speed update failed:', result.error)
      }
    } catch (error) {
      console.error('Update error:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const setSpeed = (speed: number) => {
    setBaseSpeed(speed)
    setCustomInput(speed.toString())
    updateBaseSpeed(speed)
  }

  const incrementSpeed = (amount: number) => {
    const newSpeed = Math.max(0.01, Math.round((baseSpeed + amount) * 100) / 100)
    setBaseSpeed(newSpeed)
    setCustomInput(newSpeed.toString())
    updateBaseSpeed(newSpeed)
  }

  const handleCustomSet = () => {
    const newSpeed = parseFloat(customInput)
    if (!isNaN(newSpeed) && newSpeed > 0) {
      setBaseSpeed(newSpeed)
      updateBaseSpeed(newSpeed)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSet()
    }
  }

  const presets = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10, 0.12, 0.15]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Physics Settings</h3>
      
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Current Speed: {baseSpeed.toFixed(3)}
        </label>
        
        {/* Increment/Decrement */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => incrementSpeed(-0.01)}
            disabled={isUpdating || baseSpeed <= 0.01}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded disabled:opacity-50"
          >
            -0.01
          </button>
          <button
            onClick={() => incrementSpeed(0.01)}
            disabled={isUpdating}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded disabled:opacity-50"
          >
            +0.01
          </button>
        </div>
        
        {/* Numbered Presets */}
        <div className="grid grid-cols-5 gap-2">
          {presets.map((speed) => (
            <button
              key={speed}
              onClick={() => setSpeed(speed)}
              disabled={isUpdating}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                Math.abs(baseSpeed - speed) < 0.001
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } disabled:opacity-50`}
            >
              {speed.toFixed(2)}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">Custom:</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isUpdating}
            className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="0.06"
          />
          <button
            onClick={handleCustomSet}
            disabled={isUpdating}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded disabled:opacity-50"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  )
} 