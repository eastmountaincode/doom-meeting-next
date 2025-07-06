'use client'

import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { 
  HiTag, 
  HiQrCode, 
  HiPaintBrush, 
  HiPlay, 
  HiArrowPath,
  HiChatBubbleLeftRight,
  HiPhoto,
  HiSparkles
} from 'react-icons/hi2'



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
  
  // Background type and YouTube video state
  const [backgroundType, setBackgroundType] = useState<'color' | 'youtube' | 'image'>('color')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeVideoId, setYoutubeVideoId] = useState('')
  
  // Image background state
  const [backgroundImage, setBackgroundImage] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  
  // Event system state
  const [activeEvent, setActiveEvent] = useState<string | null>(null)
  
  // YouTube notes state with localStorage persistence
  const [youtubeNotes, setYoutubeNotes] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('youtube-notes') || ''
    }
    return ''
  })

  // Helper to extract video ID from URL
  function extractYouTubeVideoId(url: string): string | null {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
    return match ? match[1] : null
  }

  const handleSetYouTube = () => {
    const id = extractYouTubeVideoId(youtubeUrl)
    if (id) {
      setYoutubeVideoId(id)
      setBackgroundType('youtube')
      triggerEvent('SET_YOUTUBE_BACKGROUND', { videoId: id })
    }
  }

  const handleClearYouTube = () => {
    setYoutubeVideoId('')
    setYoutubeUrl('')
    setBackgroundType('color')
    triggerEvent('CLEAR_YOUTUBE_BACKGROUND')
  }

  const handleNotesChange = (value: string) => {
    setYoutubeNotes(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('youtube-notes', value)
    }
  }

  const handleClearNotes = () => {
    if (confirm('Are you sure you want to clear all your YouTube notes?')) {
      setYoutubeNotes('')
      if (typeof window !== 'undefined') {
        localStorage.removeItem('youtube-notes')
      }
    }
  }

  const handleImageUpload = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string
        setBackgroundImage(imageUrl)
        setBackgroundType('image')
        
        // Store image via API endpoint and send signal to display
        try {
          const response = await fetch('/api/admin/image-background', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl }),
          })
          
          if (response.ok) {
            triggerEvent('SET_IMAGE_BACKGROUND', { imageId: 'stored' })
          } else {
            console.error('Failed to store image')
          }
        } catch (error) {
          console.error('Error storing image:', error)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleClearImage = () => {
    setBackgroundImage('')
    setBackgroundType('color')
    triggerEvent('CLEAR_IMAGE_BACKGROUND')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleImageUpload(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }



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

  // Event system functions
  const startEvent = async (eventType: string) => {
    if (activeEvent) {
      // Stop current event first
      await stopEvent()
    }
    
    setActiveEvent(eventType)
    await triggerEvent('START_EVENT', { eventType })
  }

  const stopEvent = async () => {
    if (activeEvent) {
      await triggerEvent('STOP_EVENT', { eventType: activeEvent })
      setActiveEvent(null)
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
            <HiTag className="text-lg" />
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
            <HiQrCode className="text-lg" />
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
        <div className="space-y-4 mt-5">
          {/* Background Type Selection */}
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-white">Background</h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setBackgroundType('color')
                  triggerEvent('SET_BACKGROUND_COLOR', { backgroundColor })
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  backgroundType === 'color' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Color
              </button>
              <button
                onClick={() => {
                  setBackgroundType('youtube')
                  if (youtubeVideoId) triggerEvent('SET_YOUTUBE_BACKGROUND', { videoId: youtubeVideoId })
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  backgroundType === 'youtube' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                YouTube
              </button>
              <button
                onClick={async () => {
                  setBackgroundType('image')
                  if (backgroundImage) {
                    // Store current image and trigger event
                    try {
                      const response = await fetch('/api/admin/image-background', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ imageUrl: backgroundImage }),
                      })
                      
                      if (response.ok) {
                        triggerEvent('SET_IMAGE_BACKGROUND', { imageId: 'stored' })
                      }
                    } catch (error) {
                      console.error('Error storing image:', error)
                    }
                  }
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  backgroundType === 'image' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Image
              </button>
            </div>
          </div>
          
          {/* Color Background Section */}
          <div className="flex flex-row items-start p-4 bg-gray-700 rounded-lg gap-6">
            {/* Color Picker */}
            <div className="flex flex-col items-start" style={{ minWidth: 300, opacity: backgroundType === 'color' ? 1 : 0.5 }}>
              <div className="flex items-center space-x-3 mb-4">
                <HiPaintBrush className="text-lg" />
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
                {(colorCycleActive || backgroundType !== 'color') && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: colorCycleActive ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)',
                    zIndex: 2,
                    borderRadius: 12,
                    cursor: 'not-allowed',
                  }} />
                )}
              </div>
            </div>
            {/* Color Controls */}
            <div className="flex flex-col items-stretch justify-center gap-2" style={{ minWidth: 220, height: 340, opacity: backgroundType === 'color' ? 1 : 0.5 }}>
              <button
                onClick={handleReset}
                className="cursor-pointer px-4 py-2 rounded bg-white text-gray-800 font-semibold shadow hover:bg-gray-100 border border-gray-300 w-full"
                disabled={isTriggering || backgroundType !== 'color'}
              >
                Reset to Black
              </button>
              <button
                onClick={handleToggleColorCycle}
                className={`cursor-pointer px-4 py-2 rounded font-semibold shadow border w-full ${colorCycleActive ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}`}
                disabled={isTriggering || backgroundType !== 'color'}
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
                  disabled={backgroundType !== 'color'}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Fast</span>
                  <span>Slow</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* YouTube Video Section */}
          <div className="p-4 bg-gray-700 rounded-lg" style={{ opacity: backgroundType === 'youtube' ? 1 : 0.5 }}>
            <div className="flex items-center space-x-3 mb-4">
              <HiPlay className="text-lg" />
              <div>
                <div className="text-white font-medium">YouTube Video</div>
                <div className="text-gray-400 text-sm">Set a YouTube video as the background</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded border border-gray-400 bg-gray-800 text-white mb-3"
                  placeholder="Paste YouTube URL or video ID"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  disabled={backgroundType !== 'youtube'}
                />
                <div className="flex flex-row gap-2">
                  <button
                    className={`cursor-pointer px-4 py-2 rounded text-sm font-medium ${youtubeUrl ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-500 text-gray-300'}`}
                    onClick={handleSetYouTube}
                    disabled={!youtubeUrl || backgroundType !== 'youtube'}
                  >
                    Set Video
                  </button>
                  <button
                    className={`cursor-pointer px-4 py-2 rounded text-sm font-medium ${youtubeVideoId ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-500 text-gray-300'}`}
                    onClick={handleClearYouTube}
                    disabled={!youtubeVideoId || backgroundType !== 'youtube'}
                  >
                    Clear Video
                  </button>
                </div>
              </div>
              {/* Video Preview */}
              {youtubeVideoId && (
                <div className="flex-shrink-0">
                  <div style={{ width: 280, height: 158, background: '#111', borderRadius: 8, overflow: 'hidden' }}>
                    <iframe
                      width="280"
                      height="158"
                      src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                      title="YouTube video preview"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* YouTube Notes Section */}
            <div className="mt-4 pt-4 border-t border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-white font-medium">YouTube Video Notes</div>
                </div>
                <button
                  onClick={handleClearNotes}
                  className="cursor-pointer px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium"
                  disabled={!youtubeNotes.trim()}
                >
                  Clear Notes
                </button>
              </div>
              <textarea
                value={youtubeNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 resize-vertical"
                rows={12}
                style={{ minHeight: '200px', maxHeight: '400px' }}
              />
            </div>
          </div>
          
          {/* Image Background Section */}
          <div className="p-4 bg-gray-700 rounded-lg" style={{ opacity: backgroundType === 'image' ? 1 : 0.5 }}>
            <div className="flex items-center space-x-3 mb-4">
              <HiPhoto className="text-lg" />
              <div>
                <div className="text-white font-medium">Image Background</div>
                <div className="text-gray-400 text-sm">Drag and drop an image or click to upload</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1">
                {/* Drag and Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging 
                      ? 'border-blue-400 bg-blue-50/10' 
                      : 'border-gray-500 hover:border-gray-400'
                  } ${backgroundType !== 'image' ? 'pointer-events-none' : ''}`}
                  onClick={() => {
                    if (backgroundType === 'image') {
                      document.getElementById('image-upload')?.click()
                    }
                  }}
                >
                  <div className="text-4xl mb-2">📸</div>
                  <div className="text-white font-medium mb-1">
                    {isDragging ? 'Drop image here' : 'Drag image here or click to upload'}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Supports JPG, PNG, GIF formats
                  </div>
                </div>
                
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {backgroundImage && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleClearImage}
                      className="cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium"
                      disabled={backgroundType !== 'image'}
                    >
                      Clear Image
                    </button>
                  </div>
                )}
              </div>
              
              {/* Image Preview */}
              {backgroundImage && (
                <div className="flex-shrink-0">
                  <div style={{ width: 280, height: 158, background: '#111', borderRadius: 8, overflow: 'hidden' }}>
                    <img
                      src={backgroundImage}
                      alt="Background preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 8
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Video Square Movement Speed */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Video Square Movement</h4>
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <HiArrowPath className="text-lg" />
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
            <HiChatBubbleLeftRight className="text-lg" />
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
      
      {/* Event System */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Event Triggers</h4>
        
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <HiSparkles className="text-lg" />
            <div>
              <div className="text-white font-medium">Special Events</div>
              <div className="text-gray-400 text-sm">Trigger special event displays (only one can be active at a time)</div>
            </div>
          </div>
          
          {activeEvent && (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500 rounded">
              <div className="text-blue-300 text-sm font-medium">
                Active Event: {activeEvent}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {/* Big Bang Event */}
            <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
              <div>
                <div className="text-white font-medium">Big Bang</div>
                <div className="text-gray-300 text-sm">Spotlight a single participant in the center</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEvent('BIG_BANG')}
                  disabled={isTriggering || activeEvent === 'BIG_BANG'}
                  className={`cursor-pointer px-3 py-1 text-sm rounded font-medium transition-colors ${
                    activeEvent === 'BIG_BANG'
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {activeEvent === 'BIG_BANG' ? 'Active' : 'Start'}
                </button>
                {activeEvent === 'BIG_BANG' && (
                  <button
                    onClick={stopEvent}
                    disabled={isTriggering}
                    className="cursor-pointer px-3 py-1 text-sm bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
            
            {/* Future events can be added here */}
            <div className="text-center text-gray-400 text-sm py-2">
              More events coming soon...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 