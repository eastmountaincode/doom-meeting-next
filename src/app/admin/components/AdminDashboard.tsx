'use client'

import { useState, useEffect } from 'react'
import { 
  LiveKitRoom, 
  useParticipants,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { useDebugBorders } from '../../../hooks/useDebugBorders'

type AdminSection = 'participants' | 'events' | 'settings'

function ParticipantsList() {
  const participants = useParticipants()

  return (
    <div className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">Room Participants</h3>
        <p className="text-gray-400 text-sm">Total: {participants.length}</p>
      </div>
      
      {participants.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg mb-2">No Participants</h3>
            <p>Waiting for users to join the DOOM meeting...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map((participant) => (
            <div 
              key={participant.identity} 
              className="bg-gray-700 rounded-lg p-4 border border-gray-600"
            >
              <div className="flex items-center justify-between">
                {/* Left group: Name and joined date */}
                <div className="flex flex-col">
                  <h4 className="text-white font-medium">{participant.identity}</h4>
                  <div className="text-xs text-gray-500">
                    Joined: {new Date(participant.joinedAt || Date.now()).toLocaleTimeString()}
                  </div>
                </div>
                
                {/* Right group: Status indicators */}
                <div className="flex items-center space-x-4">
                  {/* Camera status */}
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-gray-400 mb-1">C</div>
                    <div className={`w-5 h-5 rounded-full ${
                      participant.isCameraEnabled ? 'bg-green-500' : 'bg-gray-500'
                    }`} title={participant.isCameraEnabled ? 'Camera On' : 'Camera Off'} />
                  </div>
                  
                  {/* Camera direction */}
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-gray-400 mb-1">Dir</div>
                    {(() => {
                      try {
                        const metadata = participant.metadata ? JSON.parse(participant.metadata) : {}
                        const facing = metadata.cameraFacing
                        if (facing && participant.identity !== 'admin-observer') {
                          return (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              facing === 'front' ? 'bg-blue-500/20 text-blue-400' : 
                              facing === 'back' ? 'bg-purple-500/20 text-purple-400' : ''
                            }`}>
                              {facing === 'front' ? 'Front' : facing === 'back' ? 'Back' : ''}
                            </span>
                          )
                        }
                        return <div className="w-12 h-5"></div> // Placeholder to maintain spacing
                      } catch {
                        return <div className="w-12 h-5"></div> // Placeholder to maintain spacing
                      }
                    })()}
                  </div>
                  
                  {/* Connection quality */}
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-gray-400 mb-1">Q</div>
                    <div className={`w-5 h-5 rounded-full ${
                      participant.connectionQuality === 'excellent' ? 'bg-green-500' :
                      participant.connectionQuality === 'good' ? 'bg-yellow-500' :
                      participant.connectionQuality === 'poor' ? 'bg-red-500' : 'bg-gray-500'
                    }`} title={`Connection: ${participant.connectionQuality || 'unknown'}`} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ParticipantsSection() {
  const [token, setToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Generate admin token
  useEffect(() => {
    const generateAdminToken = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(
          `/api/token?room=doom&username=admin-observer`
        )
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        setToken(data.token)
      } catch (err) {
        console.error('Admin token generation failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate admin token')
      } finally {
        setIsLoading(false)
      }
    }

    generateAdminToken()
  }, [])

  const handleConnectionError = (error: Error) => {
    console.error('LiveKit admin connection error:', error)
    setError(`Connection failed: ${error.message}`)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-3xl mb-4">🔗</div>
          <p className="text-lg">Connecting to room...</p>
          <p className="text-sm text-gray-400 mt-2">Generating admin access</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-400 max-w-md">
          <div className="text-3xl mb-4">⚠️</div>
          <p className="text-lg mb-2">Connection Failed</p>
          <p className="text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-4">🎫</div>
          <p>No admin access token available</p>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      video={false} // Admin doesn't publish video
      audio={false} // Admin doesn't publish audio
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      onError={handleConnectionError}
      className="bg-transparent"
    >
      <ParticipantsList />
    </LiveKitRoom>
  )
}

function EventsSection() {
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
        setLastEvent(`${eventType} triggered successfully`)
        console.log('Event triggered:', result.event)
      } else {
        setLastEvent(`Failed to trigger ${eventType}`)
        console.error('Event failed:', result.error)
      }
    } catch (error) {
      setLastEvent(`Error: ${error}`)
      console.error('Trigger error:', error)
    } finally {
      setIsTriggering(false)
    }
  }

  const eventButtons = [
    {
      id: 'employee-of-month',
      label: 'Employee of the Month 🏆',
      description: 'Celebrate someone special',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      onClick: () => triggerEvent('EMPLOYEE_OF_MONTH', {
        message: 'Employee of the Month! 🏆',
        duration: 15000,
      }),
    },
    {
      id: 'high-five',
      label: 'High Five Challenge 🙌',
      description: 'Encourage team bonding',
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => triggerEvent('HIGH_FIVE', {
        message: 'Give each other a high five! 🙌',
        duration: 10000,
      }),
    },
    {
      id: 'custom-message',
      label: 'Custom Message 💬',
      description: 'Show a custom message',
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => {
        const message = prompt('Enter your custom message:')
        if (message) {
          triggerEvent('CUSTOM', {
            message,
            duration: 12000,
          })
        }
      },
    },
    {
      id: 'reset',
      label: 'Reset Display 🔄',
      description: 'Clear any active events',
      color: 'bg-gray-600 hover:bg-gray-700',
      onClick: () => triggerEvent('RESET', {
        message: 'Display reset',
        duration: 1000,
      }),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-2">Display Events</h3>
        <p className="text-gray-400 text-sm">
          Trigger special events on the display screen for all participants to see
        </p>
      </div>

      {/* Status */}
      {lastEvent && (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3">
          <p className="text-sm text-gray-300">
            <span className="text-green-400">✓</span> {lastEvent}
          </p>
        </div>
      )}

      {/* Event Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {eventButtons.map((event) => (
          <button
            key={event.id}
            onClick={event.onClick}
            disabled={isTriggering}
            className={`${event.color} text-white p-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left`}
          >
            <div className="font-medium mb-1">{event.label}</div>
            <div className="text-sm opacity-90">{event.description}</div>
          </button>
        ))}
      </div>

      {/* Test Connection */}
      <div className="border-t border-gray-700 pt-6">
        <h4 className="text-white font-medium mb-3">Connection Test</h4>
        <button
          onClick={() => triggerEvent('CUSTOM', {
            message: 'Connection test! 🚀',
            duration: 3000,
          })}
          disabled={isTriggering}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {isTriggering ? 'Sending...' : 'Test Connection'}
        </button>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>('participants')
  
  // Debug borders hook - Ctrl/Cmd + B to toggle
  useDebugBorders()

  const sections = [
    { id: 'participants' as AdminSection, label: 'Participants', icon: '👥' },
    { id: 'events' as AdminSection, label: 'Events', icon: '🎯' },
    { id: 'settings' as AdminSection, label: 'Settings', icon: '⚙️' },
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'participants':
        return <ParticipantsSection />
      case 'events':
        return <EventsSection />
      case 'settings':
        return (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-lg mb-2">Admin Settings</h3>
            <p>Coming soon - room settings and configuration</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                activeSection === section.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span className="text-lg">{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Section Content */}
      <div className="bg-gray-800 rounded-lg p-6 min-h-[500px]">
        {renderSection()}
      </div>
    </div>
  )
} 