'use client'

import { useState, useRef } from 'react'

function speedFromSlider(sliderValue: number) {
  if (sliderValue <= 0.75) {
    return sliderValue / 0.75;
  } else {
    return 1.0 + ((sliderValue - 0.75) / 0.25) * 2.0;
  }
}

function sliderFromSpeed(speed: number) {
  if (speed <= 1.0) {
    return speed * 0.75;
  } else {
    return 0.75 + ((speed - 1.0) / 2.0) * 0.25;
  }
}

export default function AdminSettings() {
  const [baseSpeed, setBaseSpeed] = useState(0.06)
  const [sliderValue, setSliderValue] = useState(sliderFromSpeed(0.06))
  const [customInput, setCustomInput] = useState('0.06')
  const [isUpdating, setIsUpdating] = useState(false)
  const lastSpeedSentRef = useRef(0)

  const throttledUpdateBaseSpeed = (newSpeed: number) => {
    const now = Date.now()
    if (now - lastSpeedSentRef.current > 50) {
      lastSpeedSentRef.current = now
      updateBaseSpeed(newSpeed)
    }
  }

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

  // Slider handler (sliderValue is 0-1)
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSliderValue = parseFloat(e.target.value)
    const newSpeed = speedFromSlider(newSliderValue)
    setSliderValue(newSliderValue)
    setBaseSpeed(newSpeed)
    setCustomInput(newSpeed.toFixed(2))
    throttledUpdateBaseSpeed(newSpeed)
  }

  const setSpeed = (speed: number) => {
    setBaseSpeed(speed)
    setSliderValue(sliderFromSpeed(speed))
    setCustomInput(speed.toString())
    throttledUpdateBaseSpeed(speed)
  }

  const incrementSpeed = (amount: number) => {
    const newSpeed = Math.max(0, Math.round((baseSpeed + amount) * 100) / 100)
    setBaseSpeed(newSpeed)
    setSliderValue(sliderFromSpeed(newSpeed))
    setCustomInput(newSpeed.toString())
    throttledUpdateBaseSpeed(newSpeed)
  }

  const handleCustomSet = () => {
    const newSpeed = parseFloat(customInput)
    if (!isNaN(newSpeed) && newSpeed >= 0) {
      setBaseSpeed(newSpeed)
      setSliderValue(sliderFromSpeed(newSpeed))
      throttledUpdateBaseSpeed(newSpeed)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSet()
    }
  }

  const presets = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10, 0.12, 0.15, 0.25, 0.5, 1.0, 2.0, 3.0]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Physics Settings</h3>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Current Speed: {baseSpeed.toFixed(3)}
        </label>
        {/* Slider */}
        <div className="flex items-center gap-4 py-6">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={sliderValue}
            onChange={handleSliderChange}
            onMouseUp={() => updateBaseSpeed(baseSpeed)}
            onTouchEnd={() => updateBaseSpeed(baseSpeed)}
            className="w-full h-12 appearance-none slider-touch"
          />
          <span className="text-white w-12 text-right text-lg">{baseSpeed.toFixed(2)}</span>
        </div>
        <style jsx>{`
          input[type='range'].slider-touch {
            background: transparent;
            height: 48px;
          }
          input[type='range'].slider-touch::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #3b82f6;
            border: 4px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            cursor: pointer;
            margin-top: -14px;
            transition: background 0.2s;
          }
          input[type='range'].slider-touch::-webkit-slider-runnable-track {
            height: 20px;
            border-radius: 10px;
            background: #4b5563;
          }
          input[type='range'].slider-touch::-moz-range-thumb {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #3b82f6;
            border: 4px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            cursor: pointer;
            transition: background 0.2s;
          }
          input[type='range'].slider-touch::-ms-thumb {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #3b82f6;
            border: 4px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            cursor: pointer;
            transition: background 0.2s;
          }
          input[type='range'].slider-touch::-ms-fill-lower {
            background: #4b5563;
            border-radius: 10px;
          }
          input[type='range'].slider-touch::-ms-fill-upper {
            background: #4b5563;
            border-radius: 10px;
          }
          input[type='range'].slider-touch:focus {
            outline: none;
          }
        `}</style>
        {/* Increment/Decrement */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => incrementSpeed(-0.01)}
            disabled={isUpdating || baseSpeed <= 0}
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
        <div className="grid grid-cols-7 gap-2">
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
            min="0"
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