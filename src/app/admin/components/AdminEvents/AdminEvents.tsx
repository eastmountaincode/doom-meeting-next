'use client'

import { useState, useEffect } from 'react'
import { 
  HiTag, 
  HiQrCode, 
  HiChatBubbleLeftRight,
  HiSparkles
} from 'react-icons/hi2'
import BackgroundControls from './BackgroundControls'
import VideoSpeedControls from './VideoSpeedControls'
import { RESERVED_SCREEN_NAME } from '../../../../config/constants'

export default function AdminEvents() {
  const [isTriggering, setIsTriggering] = useState(false)
  const [lastEvent, setLastEvent] = useState<string>('')
  const [showNameLabels, setShowNameLabels] = useState(true)
  const [showQrCode, setShowQrCode] = useState(true)
  const [qrCodeColor, setQrCodeColor] = useState<'black' | 'white'>('white')
  const [useSquareShapes, setUseSquareShapes] = useState(true)
  const [invertColors, setInvertColors] = useState(false)
  
  // Event system state
  const [activeEvent, setActiveEvent] = useState<string | null>(null)
  
  // Text display state
  const [displayText, setDisplayText] = useState('')

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
          pusher.connection.bind('connected', () => {
            console.log('Pusher connected for admin!')
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

  const toggleVideoShapes = async () => {
    const newState = !useSquareShapes
    setUseSquareShapes(newState)
    await triggerEvent('TOGGLE_VIDEO_SHAPES', { useSquareShapes: newState })
  }

  const toggleInvertColors = async () => {
    const newState = !invertColors
    setInvertColors(newState)
    await triggerEvent('TOGGLE_INVERT_COLORS', { invertColors: newState })
  }

  const handleTextChange = (text: string) => {
    setDisplayText(text)
    // Send text in real-time as user types
    triggerEvent('SET_DISPLAY_TEXT', { text })
  }

  const handleClearText = async () => {
    setDisplayText('')
    await triggerEvent('CLEAR_DISPLAY_TEXT')
  }

  // Event system functions
  const startEvent = async (eventType: string, options: Record<string, unknown> = {}) => {
    if (activeEvent) {
      // Stop current event first
      await stopEvent()
    }
    
    setActiveEvent(eventType)
    await triggerEvent('START_EVENT', { eventType, ...options })
  }

  const stopEvent = async () => {
    if (activeEvent) {
      await triggerEvent('STOP_EVENT', { eventType: activeEvent })
      setActiveEvent(null)
    }
  }

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
        <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2">
          <div className="flex items-center space-x-3">
            <HiSparkles className="text-lg" />
            <div>
              <div className="text-white font-medium">Video Shapes</div>
              <div className="text-gray-400 text-sm">Switch between circle blobs and square shapes (Zoom-like)</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${!useSquareShapes ? 'text-white' : 'text-gray-400'}`}>
              Circles
            </span>
            <button
              onClick={toggleVideoShapes}
              disabled={isTriggering}
              className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${useSquareShapes ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useSquareShapes ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium ${useSquareShapes ? 'text-white' : 'text-gray-400'}`}>
              Squares
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2">
          <div className="flex items-center space-x-3">
            <HiSparkles className="text-lg" />
            <div>
              <div className="text-white font-medium">Invert Colors</div>
              <div className="text-gray-400 text-sm">Toggle inverted color display for a dramatic visual effect</div>
            </div>
          </div>
          <button
            onClick={toggleInvertColors}
            disabled={isTriggering}
            className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${invertColors ? 'bg-purple-600' : 'bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${invertColors ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="space-y-4 mt-5">
          <BackgroundControls triggerEvent={triggerEvent} isTriggering={isTriggering} />
        </div>
      </div>
      
                <VideoSpeedControls />
      
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
          
          <div className="mb-4 p-3 rounded" style={{ 
            backgroundColor: activeEvent ? 'rgba(59, 130, 246, 0.3)' : 'rgba(75, 85, 99, 0.3)',
            border: activeEvent ? '1px solid rgb(59, 130, 246)' : '1px solid rgb(75, 85, 99)'
          }}>
            <div className={`text-sm font-medium ${activeEvent ? 'text-blue-300' : 'text-gray-400'}`}>
              {activeEvent ? `Active Event: ${activeEvent}` : 'No active events'}
            </div>
          </div>
          
          <div className="space-y-3">
            {/* QR Code Event */}
            <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
              <div>
                <div className="text-white font-medium">QR Code Display</div>
                <div className="text-gray-300 text-sm">Show large QR code in center of screen</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEvent('QR_CODE_EVENT')}
                  disabled={isTriggering || activeEvent === 'QR_CODE_EVENT'}
                  className={`cursor-pointer px-3 py-1 text-sm rounded font-medium transition-colors ${
                    activeEvent === 'QR_CODE_EVENT'
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {activeEvent === 'QR_CODE_EVENT' ? 'Active' : 'Start'}
                </button>
                {activeEvent === 'QR_CODE_EVENT' && (
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
            
            {/* Highlight Laila Event */}
            <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
              <div>
                <div className="text-white font-medium">Highlight Laila</div>
                <div className="text-gray-300 text-sm">Show Laila&apos;s video feed in the center, hide all other participants</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEvent('HIGHLIGHT_LAILA', { participantId: RESERVED_SCREEN_NAME })}
                  disabled={isTriggering || activeEvent === 'HIGHLIGHT_LAILA'}
                  className={`cursor-pointer px-3 py-1 text-sm rounded font-medium transition-colors ${
                    activeEvent === 'HIGHLIGHT_LAILA'
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {activeEvent === 'HIGHLIGHT_LAILA' ? 'Active' : 'Start'}
                </button>
                {activeEvent === 'HIGHLIGHT_LAILA' && (
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
            
            {/* Same Picture Event */}
            <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
              <div>
                <div className="text-white font-medium">Same Picture</div>
                <div className="text-gray-300 text-sm">Show the classic corporate &quot;same picture&quot; meme</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEvent('SAME_PICTURE_EVENT')}
                  disabled={isTriggering || activeEvent === 'SAME_PICTURE_EVENT'}
                  className={`cursor-pointer px-3 py-1 text-sm rounded font-medium transition-colors ${
                    activeEvent === 'SAME_PICTURE_EVENT'
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {activeEvent === 'SAME_PICTURE_EVENT' ? 'Active' : 'Start'}
                </button>
                {activeEvent === 'SAME_PICTURE_EVENT' && (
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