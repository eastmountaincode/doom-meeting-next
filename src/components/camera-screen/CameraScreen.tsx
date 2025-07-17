'use client'

import { useAtomValue, useSetAtom } from 'jotai'
import { screenNameAtom, navigateToLandingAtom, selectedCameraAtom } from '../../store'
import { useState, useEffect } from 'react'
import { LiveKitRoom, useTracks, useLocalParticipant } from '@livekit/components-react'
import { Track } from 'livekit-client'
import LiveKitCameraView from './LiveKitCameraView'
import TriviaDisplay from './TriviaDisplay'
import { usePusherEvents } from '../../hooks/usePusherEvents'
import '@livekit/components-styles'

function CameraScreen() {
  const screenName = useAtomValue(screenNameAtom)
  const selectedCamera = useAtomValue(selectedCameraAtom)
  const navigateToLanding = useSetAtom(navigateToLandingAtom)
  
  const [token, setToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Trivia state
  const [triviaActive, setTriviaActive] = useState(false)
  const [triviaData, setTriviaData] = useState<{
    question: string
    choices: string[]
    correctAnswer: number
    topicName: string
  } | null>(null)
  // Handle trivia answer selection
  const handleTriviaAnswerSelected = (selectedIndex: number, isCorrect: boolean) => {
    console.log('User answered trivia:', { selectedIndex, isCorrect })
    // No timer logic - trivia stays open until admin stops it
  }

  // Pusher event handlers
  const {} = usePusherEvents({
    onStartEvent: (eventType, data) => {
      console.log('Camera screen received START_EVENT:', { eventType, data })
      if (eventType === 'TRIVIA_QUESTION') {
        setTriviaData({
          question: data?.question || '',
          choices: data?.choices || [],
          correctAnswer: data?.correctAnswer || 0,
          topicName: data?.topicName || 'Unknown Topic'
        })
        setTriviaActive(true)
      }
    },
    onStopEvent: (eventType) => {
      console.log('Camera screen received STOP_EVENT:', { eventType })
      if (eventType === 'TRIVIA_QUESTION') {
        setTriviaActive(false)
        setTriviaData(null)
      }
    },
  })

  // Generate user token
  useEffect(() => {
    const generateUserToken = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(
          `/api/token?room=doom&username=${encodeURIComponent(screenName)}&displayName=${encodeURIComponent(screenName)}&makeUnique=true`
        )
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        setToken(data.token)
        
        // Store participant ID for trivia answer submission
        localStorage.setItem('participantId', screenName)
        
        console.log(`🎫 Generated token for user: ${screenName}`)
      } catch (err) {
        console.error('User token generation failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate user token')
      } finally {
        setIsLoading(false)
      }
    }

    if (screenName) {
      generateUserToken()
    }
  }, [screenName])

  const handleConnectionError = (error: Error) => {
    console.error('LiveKit user connection error:', error)
    setError(`Connection failed: ${error.message}`)
  }

  const handleDisconnected = () => {
    console.log('🔴 Disconnected from room - returning to landing')
    navigateToLanding()
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="text-3xl mb-4">🔗</div>
          <p className="text-lg">Joining DOOM meeting...</p>
          <p className="text-sm text-gray-400 mt-2">Connecting as {screenName}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-red-400 max-w-md">
          <div className="text-3xl mb-4">⚠️</div>
          <p className="text-lg mb-2">Connection Failed</p>
          <p className="text-sm mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigateToLanding()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-4">🎫</div>
          <p>No access token available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <LiveKitRoom
        video={false} // We'll enable camera manually with custom constraints
        audio={false} // No audio for this app
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        data-lk-theme="default"
        style={{ height: '100%' }}
        onError={handleConnectionError}
        onDisconnected={handleDisconnected}
        className="bg-gray-900"
      >
        <CameraScreenContent 
          triviaActive={triviaActive}
          triviaData={triviaData}
          selectedCamera={selectedCamera}
          onTriviaAnswerSelected={handleTriviaAnswerSelected}
        />
      </LiveKitRoom>
    </div>
  )
}

// Separate component to access LiveKit context
function CameraScreenContent({ 
  triviaActive, 
  triviaData, 
  selectedCamera,
  onTriviaAnswerSelected
}: {
  triviaActive: boolean
  triviaData: {
    question: string
    choices: string[]
    correctAnswer: number
    topicName: string
  } | null
  selectedCamera: 'front' | 'back' | null
  onTriviaAnswerSelected: (selectedIndex: number, isCorrect: boolean) => void
}) {
  // Get the local participant (works even without video track)
  const { localParticipant } = useLocalParticipant()
  
  // Get the local video track
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
  ], { onlySubscribed: false })
  
  const localVideoTrack = tracks.find(track => 
    track.participant.isLocal && track.publication
  ) as import('@livekit/components-react').TrackReference | null

  return (
    <>
      <LiveKitCameraView />
      
      {/* Trivia Display Overlay */}
      {triviaActive && triviaData && (
        <TriviaDisplay
          question={triviaData.question}
          choices={triviaData.choices}
          correctAnswer={triviaData.correctAnswer}
          topicName={triviaData.topicName}
          localVideoTrack={localVideoTrack}
          selectedCamera={selectedCamera}
          onAnswerSelected={onTriviaAnswerSelected}
          participantId={localParticipant?.identity}
        />
      )}
    </>
  )
}

export default CameraScreen 