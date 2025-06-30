'use client'

import { useEffect, useState } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { 
  displayModeAtom, 
  currentEventAtom, 
  triggerEventAtom,
  type DisplayEvent 
} from '../../../store/atoms'

export default function DisplayNewPage() {
  const [displayMode] = useAtom(displayModeAtom)
  const [currentEvent] = useAtom(currentEventAtom)
  const triggerEvent = useSetAtom(triggerEventAtom)
  
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [eventHistory, setEventHistory] = useState<DisplayEvent[]>([])

  // Initialize Pusher connection
  useEffect(() => {
    let pusher: any = null
    let channel: any = null

    const connectToPusher = async () => {
      try {
        setConnectionStatus('connecting')
        
        // Dynamically import Pusher to avoid SSR issues
        const Pusher = (await import('pusher-js')).default
        
        pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        })
        
        // Subscribe to display channel
        channel = pusher.subscribe('display-channel')
        
        // Listen for admin events
        channel.bind('admin-event', (data: DisplayEvent) => {
          console.log('Received event:', data)
          
          // Update Jotai state
          triggerEvent(data)
          
          // Add to history
          setEventHistory(prev => [data, ...prev.slice(0, 9)]) // Keep last 10 events
        })
        
        // Connection status handlers
        pusher.connection.bind('connected', () => {
          console.log('Pusher connected!')
          setConnectionStatus('connected')
        })
        
        pusher.connection.bind('disconnected', () => {
          console.log('Pusher disconnected')
          setConnectionStatus('disconnected')
        })
        
        pusher.connection.bind('error', (error: any) => {
          console.error('Pusher error:', error)
          setConnectionStatus('error')
        })
        
      } catch (error) {
        console.error('Failed to initialize Pusher:', error)
        setConnectionStatus('error')
      }
    }

    connectToPusher()

    // Cleanup
    return () => {
      if (channel) {
        channel.unbind_all()
        pusher?.unsubscribe('display-channel')
      }
      if (pusher) {
        pusher.disconnect()
      }
    }
  }, [triggerEvent])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStatusColor = (status: typeof connectionStatus) => {
    switch (status) {
      case 'connected': return 'text-green-400'
      case 'connecting': return 'text-yellow-400'
      case 'disconnected': return 'text-gray-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Display New - Pusher Test</h1>
          <p className="text-gray-400">Testing real-time event reception</p>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400' :
              connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              connectionStatus === 'disconnected' ? 'bg-gray-400' :
              'bg-red-400'
            }`} />
            <span className={`capitalize ${getStatusColor(connectionStatus)}`}>
              {connectionStatus}
            </span>
            {connectionStatus === 'connected' && (
              <span className="text-sm text-gray-400">- Listening for events</span>
            )}
          </div>
        </div>

        {/* Current State */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400">Display Mode:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                displayMode === 'idle' ? 'bg-gray-600' :
                displayMode === 'default' ? 'bg-blue-600' :
                'bg-purple-600'
              }`}>
                {displayMode.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Active Event:</span>
              <span className="ml-2">
                {currentEvent ? currentEvent.type : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Current Event Display */}
        {currentEvent && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">🎯 ACTIVE EVENT</h2>
            <div className="text-4xl mb-4">
              {currentEvent.type === 'EMPLOYEE_OF_MONTH' && '🏆'}
              {currentEvent.type === 'HIGH_FIVE' && '🙌'}
              {currentEvent.type === 'CUSTOM' && '💬'}
              {currentEvent.type === 'RESET' && '🔄'}
            </div>
            <h3 className="text-xl font-medium mb-2">{currentEvent.type.replace('_', ' ')}</h3>
            {currentEvent.message && (
              <p className="text-lg opacity-90">{currentEvent.message}</p>
            )}
            <div className="text-sm opacity-75 mt-2">
              Triggered at {formatTimestamp(currentEvent.timestamp)}
            </div>
          </div>
        )}

        {/* Event History */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Event History</h2>
          {eventHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No events received yet. Try triggering an event from the admin panel!
            </p>
          ) : (
            <div className="space-y-3">
              {eventHistory.map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{event.type.replace('_', ' ')}</div>
                      {event.message && (
                        <div className="text-sm text-gray-400 mt-1">{event.message}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2 text-blue-400">📋 Instructions</h2>
          <ol className="text-sm space-y-2 text-gray-300">
            <li>1. Make sure you've added the Pusher environment variables to .env.local</li>
            <li>2. Open the admin panel in another browser tab (/admin)</li>
            <li>3. Go to the "Events" tab in the admin panel</li>
            <li>4. Click any event button to test the connection</li>
            <li>5. Watch this page update in real-time! 🎉</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 