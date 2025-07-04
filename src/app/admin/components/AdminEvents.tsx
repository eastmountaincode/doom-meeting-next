'use client'

import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'



function hexToHSL(hex: string): { h: number, s: number, l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '')
  let r = 0, g = 0, b = 0
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  }
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

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

export default function AdminEvents() {
  const [isTriggering, setIsTriggering] = useState(false)
  const [lastEvent, setLastEvent] = useState<string>('')
  const [showNameLabels, setShowNameLabels] = useState(true)
  const [showQrCode, setShowQrCode] = useState(true)

  
  const [qrCodeColor, setQrCodeColor] = useState<'black' | 'white'>('white')
  const [backgroundColor, setBackgroundColor] = useState('#000000')
  const [colorCycleActive, setColorCycleActive] = useState(false)
  const [colorCycleSpeed, setColorCycleSpeed] = useState(30) // Default speed (lower = faster)
  const lastSpeedSentRef = useRef(0)
  
  // Video square movement speed state
  const [baseSpeed, setBaseSpeed] = useState(0.06)
  const [sliderValue, setSliderValue] = useState(sliderFromSpeed(0.06))
  const [customInput, setCustomInput] = useState('0.06')
  const [isUpdating, setIsUpdating] = useState(false)
  const lastBaseSpeedSentRef = useRef(0)
  
  // Listen for display color updates when cycle stops
  useEffect(() => {
    let pusher: { subscribe: (channel: string) => { bind: (event: string, callback: (data: { backgroundColor: string }) => void) => void; unbind_all: () => void }; connection: { bind: (event: string, callback: () => void) => void }; unsubscribe: (channel: string) => void; disconnect: () => void } | null = null
    let channel: { bind: (event: string, callback: (data: { backgroundColor: string }) => void) => void; unbind_all: () => void } | null = null

    const connectToPusher = async () => {
      try {
        const Pusher = (await import('pusher-js')).default
        pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        }) as typeof pusher
        if (pusher) {
          channel = pusher.subscribe('admin-channel')
          channel.bind('display-color-update', (data: { backgroundColor: string }) => {
            console.log('Received display color update:', data.backgroundColor)
            setBackgroundColor(data.backgroundColor)
            // Update S/L values from the new color
            const hsl = hexToHSL(data.backgroundColor)
            setSatBase(hsl.s)
            setLightBase(hsl.l)
          })
          pusher.connection.bind('connected', () => {
            console.log('Pusher connected for admin color updates!')
          })
        }
      } catch (error) {
        console.error('Failed to initialize Pusher for admin:', error)
      }
    }
    connectToPusher()
    return () => {
      if (channel) {
        channel.unbind_all()
        pusher?.unsubscribe('admin-channel')
      }
      if (pusher) {
        pusher.disconnect()
      }
    }
  }, [])
  
  // Initialize S/L values from the starting black color
  const initialHSL = hexToHSL('#000000')
  const [satBase, setSatBase] = useState(initialHSL.s)
  const [lightBase, setLightBase] = useState(initialHSL.l)

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

  // When color picker changes, just update local state (no API call)
  const handleColorChange = (color: string) => {
    setBackgroundColor(color)
    const hsl = hexToHSL(color)
    setSatBase(hsl.s)
    setLightBase(hsl.l)
  }

  // Send color transition on mouse/touch up
  const handleColorCommit = () => {
    // Only send if not cycling and color actually changed
    if (!colorCycleActive) {
      console.log('Sending color transition:', backgroundColor)
      triggerEvent('SET_BACKGROUND_COLOR_TRANSITION', { backgroundColor })
    }
  }

  // Start/stop color cycle
  const handleToggleColorCycle = async () => {
    const newState = !colorCycleActive
    setColorCycleActive(newState)
    if (newState) {
      // Calculate current hue from background color so animation continues from current position
      const currentHSL = hexToHSL(backgroundColor)
      console.log('Starting color cycle with S/L values:', { saturation: satBase, lightness: lightBase, currentHue: currentHSL.h })
      await triggerEvent('START_COLOR_CYCLE', { 
        saturation: satBase, 
        lightness: lightBase,
        speed: colorCycleSpeed,
        startHue: currentHSL.h
      })
    } else {
      await triggerEvent('STOP_COLOR_CYCLE')
    }
  }

  const toggleNameLabels = async () => {
    const newState = !showNameLabels
    setShowNameLabels(newState)
    await triggerEvent('TOGGLE_NAME_LABELS', { showNameLabels: newState })
  }

  const toggleQrCode = async () => {
    const newState = !showQrCode
    setShowQrCode(newState)
    await triggerEvent('TOGGLE_QR_CODE', { showQrCode: newState })
  }

  const toggleQrCodeColor = async () => {
    const newColor = qrCodeColor === 'black' ? 'white' : 'black'
    setQrCodeColor(newColor)
    await triggerEvent('SET_QR_CODE_COLOR', { qrCodeColor: newColor })
    }



  // Reset to black and stop color cycle
  const handleReset = async () => {
    setBackgroundColor('#000000')
    setColorCycleActive(false)
    await triggerEvent('STOP_COLOR_CYCLE')
    await triggerEvent('SET_BACKGROUND_COLOR', { backgroundColor: '#000000' })
  }

  // Handle speed change with throttling
  const handleSpeedChange = (newSpeed: number) => {
    setColorCycleSpeed(newSpeed)
    // If cycling is active, send throttled speed update
    if (colorCycleActive) {
      const now = Date.now()
      if (now - lastSpeedSentRef.current > 150) {
        lastSpeedSentRef.current = now
        triggerEvent('SET_COLOR_CYCLE_SPEED', { speed: newSpeed })
      }
    }
  }

  const [displayText, setDisplayText] = useState('')

  const handleTextChange = (text: string) => {
    setDisplayText(text)
    // Send text in real-time as user types
    triggerEvent('SET_DISPLAY_TEXT', { text })
  }

  const handleClearText = async () => {
    setDisplayText('')
    await triggerEvent('CLEAR_DISPLAY_TEXT')
  }

  // Video square speed control functions
  const throttledUpdateBaseSpeed = (newSpeed: number) => {
    const now = Date.now()
    if (now - lastBaseSpeedSentRef.current > 150) {
      lastBaseSpeedSentRef.current = now
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
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-white">Event Controls</h3>
      {lastEvent && (
        <div className="text-sm text-gray-300">Status: {lastEvent}</div>
      )}
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
            className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${showNameLabels ? 'bg-blue-600' : 'bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showNameLabels ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2">
          <div className="flex items-center space-x-3">
            <span className="text-lg">📱</span>
            <div>
              <div className="text-white font-medium">QR Code</div>
              <div className="text-gray-400 text-sm">Show QR code in upper left corner for easy access</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleQrCodeColor}
              disabled={isTriggering || !showQrCode}
              className={`cursor-pointer px-3 py-1 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${
                qrCodeColor === 'white' 
                  ? 'bg-white text-gray-800 border border-gray-300' 
                  : 'bg-gray-800 text-white border border-gray-600'
              }`}
            >
              {qrCodeColor === 'white' ? 'White' : 'Black'}
            </button>
            <button
              onClick={toggleQrCode}
              disabled={isTriggering}
              className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${showQrCode ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showQrCode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        {/* Background Color Picker & Color Cycle */}
        <div className="flex flex-row items-center p-4 bg-gray-700 rounded-lg gap-6">
          {/* Color Picker */}
          <div className="flex flex-col items-start" style={{ minWidth: 300 }}>
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-lg">🎨</span>
            <div>
              <div className="text-white font-medium">Background Color</div>
              <div className="text-gray-400 text-sm">Change the display background in real time</div>
            </div>
          </div>
            <div style={{ position: 'relative', width: 300, height: 300 }}>
              <HexColorPicker
                color={backgroundColor}
                onChange={handleColorChange}
                onMouseUp={handleColorCommit}
                onTouchEnd={handleColorCommit}
                onMouseLeave={handleColorCommit}
                onTouchCancel={handleColorCommit}
                style={{ width: 300, height: 300 }}
                aria-label="Pick background color"
              />
              {colorCycleActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255,255,255,0.6)',
                  zIndex: 2,
                  borderRadius: 12,
                  cursor: 'not-allowed',
                }} />
              )}
            </div>
          </div>
          {/* Buttons Stacked Vertically */}
          <div className="flex flex-col items-stretch justify-start gap-2" style={{ minWidth: 220 }}>
            <button
              onClick={handleReset}
              className="cursor-pointer px-4 py-2 rounded bg-white text-gray-800 font-semibold shadow hover:bg-gray-100 border border-gray-300 w-full"
              disabled={isTriggering}
            >
              Reset to Black
            </button>
            <button
              onClick={handleToggleColorCycle}
              className={`cursor-pointer px-4 py-2 rounded font-semibold shadow border w-full ${colorCycleActive ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}`}
              disabled={isTriggering}
              style={{ minHeight: 48 }}
            >
              {colorCycleActive ? 'Stop Color Cycle' : 'Start Color Cycle'}
            </button>
            {/* Color Cycle Speed Slider */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-white mb-2">
                Cycle Speed: {colorCycleSpeed}ms
              </label>
              <input
                type="range"
                min="0.1"
                max="75"
                step="0.1"
                value={colorCycleSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Fast</span>
                <span>Slow</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Video Square Movement Speed */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Video Square Movement</h4>
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-lg">🏃</span>
            <div>
              <div className="text-white font-medium">Movement Speed</div>
              <div className="text-gray-400 text-sm">Control how fast video squares move around the screen</div>
            </div>
          </div>
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
                className="cursor-pointer px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded disabled:opacity-50"
              >
                -0.01
              </button>
              <button
                onClick={() => incrementSpeed(0.01)}
                disabled={isUpdating}
                className="cursor-pointer px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded disabled:opacity-50"
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
                  className={`px-2 py-1 text-sm rounded transition-colors border font-semibold focus:outline-none cursor-pointer
                    ${
                      Math.abs(baseSpeed - speed) < 0.001
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-600 text-white border-gray-500 hover:bg-gray-500 hover:border-blue-400'
                    }
                    disabled:opacity-50`
                  }
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
                className="cursor-pointer px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded disabled:opacity-50"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Real-time Text Display */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Real-time Text Display</h4>
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-lg">📝</span>
            <div>
              <div className="text-white font-medium">Live Text Overlay</div>
              <div className="text-gray-400 text-sm">Type text to display over the video in real-time</div>
            </div>
          </div>
          <div className="space-y-3">
            <textarea
              value={displayText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Start typing to display text on screen..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 resize-none"
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
      
      {/* Event Buttons */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Event Triggers</h4>
        
        <div className="space-y-2">
          <button
            onClick={() => triggerEvent('EMPLOYEE_OF_MONTH', { message: 'Employee of the Month' })}
            disabled={isTriggering}
            className="cursor-pointer block w-full text-left p-3 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Employee of the Month
          </button>
          
          <button
            onClick={() => triggerEvent('HIGH_FIVE', { message: 'High Five Challenge' })}
            disabled={isTriggering}
            className="cursor-pointer block w-full text-left p-3 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            High Five Challenge
          </button>
          
          <button
            onClick={() => {
              const message = prompt('Enter custom message:')
              if (message) triggerEvent('CUSTOM', { message })
            }}
            disabled={isTriggering}
            className="cursor-pointer block w-full text-left p-3 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Custom Message
          </button>
          
          <button
            onClick={() => triggerEvent('RESET', { message: 'Display cleared' })}
            disabled={isTriggering}
            className="cursor-pointer block w-full text-left p-3 bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Display
          </button>
        </div>
      </div>
    </div>
  )
} 