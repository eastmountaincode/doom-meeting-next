'use client'

import { Canvas } from "@react-three/fiber"
import { useEffect, useState } from "react"
import { 
    LiveKitRoom, 
    useTracks
} from "@livekit/components-react"
import { Track } from "livekit-client"
import { VideoSquare as VideoSquareType } from '../../../types/videoSquare'
import { useCanvasSize } from '../../../hooks/useCanvasSize'
import { useColorSystem } from '../../../hooks/useColorSystem'
import { usePusherEvents } from '../../../hooks/usePusherEvents'
import MovingSquares from '../../../components/MovingSquares'
import VideoContent from '../../../components/VideoContent'
import TextOverlay from '../../../components/TextOverlay'
import ResponsiveCamera from '../../../components/ResponsiveCamera'
import QRCode from '../../../components/QRCode'
import QRCodeOverlay from '../../../components/QRCodeOverlay'
import TriviaOverlay from '../../../components/TriviaOverlay'
import EventSpace from '../../../components/EventSpace/EventSpace'
import { RESERVED_SCREEN_NAME } from '../../../config/constants'

// LiveKit integration component with video overlay system
function VideoSquareDisplay() {
  const canvasSize = useCanvasSize()
  const [squares, setSquares] = useState<VideoSquareType[]>([])
  const [currentBaseSpeed, setCurrentBaseSpeed] = useState(0.06)
  const [showNameLabels, setShowNameLabels] = useState(true)
  const [showQrCode, setShowQrCode] = useState(true)
  const [qrCodeColor, setQrCodeColor] = useState<'black' | 'white'>('white')
  const [useSquareShapes, setUseSquareShapes] = useState(true)
  const [invertColors, setInvertColors] = useState(false)
  const [showVideoSquares, setShowVideoSquares] = useState(true)
  
  // Text display state
  const [displayText, setDisplayText] = useState('')
  const [showText, setShowText] = useState(false)
  const [textFont, setTextFont] = useState('Arial, sans-serif')
  
  // Speech messages state
  const [speechMessages, setSpeechMessages] = useState<Array<{
    id: string
    participantId: string
    message: string
    timestamp: number
  }>>([])
  
  // YouTube background state
  const [youtubeVideoId, setYoutubeVideoId] = useState<string>('')
  const [showYoutubeBackground, setShowYoutubeBackground] = useState(false)
  
  // Image background state
  const [backgroundImage, setBackgroundImage] = useState<string>('')
  const [showImageBackground, setShowImageBackground] = useState(false)
  
  // QR code overlay state
  const [showQrCodeOverlay, setShowQrCodeOverlay] = useState(false)
  const [originalQrCodeState, setOriginalQrCodeState] = useState<boolean>(true)
  const [originalQrCodeStateForHighlight, setOriginalQrCodeStateForHighlight] = useState<boolean>(true)
  
  // Event space state
  const [showEventSpace, setShowEventSpace] = useState(false)
  const [eventSpaceType, setEventSpaceType] = useState<string>('')
  const [eventSpaceParticipantId, setEventSpaceParticipantId] = useState<string>('')
  
  // Trivia state
  const [showTrivia, setShowTrivia] = useState(false)
  const [triviaQuestion, setTriviaQuestion] = useState<string>('')
  const [triviaChoices, setTriviaChoices] = useState<string[]>([])
  const [triviaTopicName, setTriviaTopicName] = useState<string>('')
  const [triviaAnswerStats, setTriviaAnswerStats] = useState<{
    totalAnswers: number
    correctAnswers: number
  }>({ totalAnswers: 0, correctAnswers: 0 })
  const [triviaAnswerBreakdown, setTriviaAnswerBreakdown] = useState<{
    choiceIndex: number
    count: number
    percentage: number
  }[]>([])
  const [triviaCorrectAnswer, setTriviaCorrectAnswer] = useState<number>(0)
  const [showTriviaStats, setShowTriviaStats] = useState<boolean>(false)
  const [triviaAnswerRevealed, setTriviaAnswerRevealed] = useState<boolean>(false)
  
  // Use color system hook
  const colorSystem = useColorSystem()
  
  // Set up Pusher event handlers
  const pusherHandlers = {
    onSetBaseSpeed: (speed: number) => setCurrentBaseSpeed(speed),
    onToggleNameLabels: (show: boolean) => setShowNameLabels(show),
    onToggleQrCode: (show: boolean) => setShowQrCode(show),
    onSetQrCodeColor: (color: 'black' | 'white') => setQrCodeColor(color),
    onToggleVideoShapes: (useSquareShapes: boolean) => setUseSquareShapes(useSquareShapes),
    onToggleInvertColors: (invertColors: boolean) => setInvertColors(invertColors),
    onToggleVideoSquares: (showVideoSquares: boolean) => setShowVideoSquares(showVideoSquares),
    onSetBackgroundColor: (color: string) => {
      colorSystem.setBackgroundColor(color)
      colorSystem.setColorCycleActive(false)
    },
    onSetBackgroundColorTransition: (color: string) => {
      colorSystem.startColorTransition(color)
    },
    onStartColorCycle: (data: { saturation?: number, lightness?: number, speed?: number, startHue?: number }) => {
      colorSystem.setColorCycleActive(true)
      if (data.saturation !== undefined) colorSystem.setColorCycleSaturation(data.saturation)
      if (data.lightness !== undefined) colorSystem.setColorCycleLightness(data.lightness)
      if (data.speed !== undefined) colorSystem.setColorCycleSpeed(data.speed)
      // Calculate start time so animation begins from the current hue position
      if (data.startHue !== undefined && data.speed !== undefined) {
        const now = Date.now()
        const startTime = now - (data.startHue * data.speed)
        colorSystem.setColorCycleStartTime(startTime)
      }
    },
    onStopColorCycle: () => {
      colorSystem.setColorCycleActive(false)
      // Send back the actual color that was showing during the animation
      colorSystem.sendColorUpdateToAdmin(colorSystem.getCurrentDisplayedColor())
    },
    onSetColorCycleSpeed: (speed: number) => {
      colorSystem.setColorCycleSpeed(speed)
    },
    onSetDisplayText: (text: string) => {
      setDisplayText(text)
      setShowText(text.trim().length > 0)
    },
    onClearDisplayText: () => {
      setDisplayText('')
      setShowText(false)
    },
    onSetTextFont: (fontFamily: string) => {
      setTextFont(fontFamily)
    },
    onSpeakMessage: (data: { message: string, participantId: string }) => {
      console.log(`💬 ${data.participantId}: "${data.message}"`)
      
      // Add message to speech messages array
      const newMessage = {
        id: `${data.participantId}-${Date.now()}`,
        participantId: data.participantId,
        message: data.message,
        timestamp: Date.now()
      }
      
      setSpeechMessages(prev => [...prev, newMessage])
      
      // Auto-remove message after 5 seconds
      setTimeout(() => {
        setSpeechMessages(prev => prev.filter(msg => msg.id !== newMessage.id))
      }, 10000)
    },
    onSetYoutubeBackground: (videoId: string) => {
      setYoutubeVideoId(videoId)
      setShowYoutubeBackground(true)
      setShowImageBackground(false)
      // Stop color cycling when YouTube background is active
      colorSystem.setColorCycleActive(false)
    },
    onClearYoutubeBackground: () => {
      setYoutubeVideoId('')
      setShowYoutubeBackground(false)
    },
    onSetImageBackground: async () => {
      try {
        const response = await fetch('/api/admin/image-background')
        const data = await response.json()
        
        if (data.success && data.imageUrl) {
          setBackgroundImage(data.imageUrl)
          setShowImageBackground(true)
          setShowYoutubeBackground(false)
          // Stop color cycling when image background is active
          colorSystem.setColorCycleActive(false)
        }
      } catch (error) {
        console.error('Error fetching image background:', error)
      }
    },
    onClearImageBackground: () => {
      setBackgroundImage('')
      setShowImageBackground(false)
    },
    onStartEvent: (eventType: string, data?: { participantId?: string; question?: string; choices?: string[]; topicName?: string; correctAnswer?: number; showAnswerStats?: boolean }) => {
      if (eventType === 'QR_CODE_EVENT') {
        // Store the current QR code state
        setOriginalQrCodeState(showQrCode)
        // Hide the small QR code and show the overlay
        setShowQrCode(false)
        setShowQrCodeOverlay(true)
      } else if (eventType === 'HIGHLIGHT_LAILA') {
        // Store the current QR code state and hide it
        setOriginalQrCodeStateForHighlight(showQrCode)
        setShowQrCode(false)
        setEventSpaceType('HIGHLIGHT_LAILA')
        setEventSpaceParticipantId(data?.participantId || RESERVED_SCREEN_NAME)
        setShowEventSpace(true)
      } else if (eventType === 'SAME_PICTURE_EVENT') {
        // Show the same picture event in event space
        setEventSpaceType('SAME_PICTURE_EVENT')
        setShowEventSpace(true)
        setOriginalQrCodeState(showQrCode)
        setShowQrCode(false)
      } else if (eventType === 'EVOLUTION_OF_UNIVERSE') {
        // Show the evolution of universe event in event space
        setEventSpaceType('EVOLUTION_OF_UNIVERSE')
        setShowEventSpace(true)
        setOriginalQrCodeState(showQrCode)
        setShowQrCode(false)
      } else if (eventType === 'TRIVIA_QUESTION') {
        // Show the trivia question on the main display
        setTriviaQuestion(data?.question || '')
        setTriviaChoices(data?.choices || [])
        setTriviaTopicName(data?.topicName || '')
        setTriviaCorrectAnswer(data?.correctAnswer || 0)
        setShowTrivia(true)
        setShowTriviaStats(data?.showAnswerStats || false)
        setTriviaAnswerRevealed(false) // Reset reveal state when starting new trivia
        setTriviaAnswerBreakdown([]) // Reset breakdown when starting new trivia
        setOriginalQrCodeState(showQrCode)
        setShowQrCode(false)
        
        // Start trivia session for answer collection
        if (data?.question && data?.correctAnswer !== undefined) {
          fetch('/api/admin/trivia-answer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
                          body: JSON.stringify({
                action: 'start-session',
                question: data.question,
                correctAnswer: data.correctAnswer,
                choices: data.choices || [],
                topicName: data.topicName || 'Unknown Topic'
              }),
          }).then(response => response.json())
            .then(result => {
              if (result.success) {
                console.log('Trivia session started for answer collection')
                setTriviaAnswerStats({ totalAnswers: 0, correctAnswers: 0 })
                setTriviaAnswerBreakdown([])
              }
            })
            .catch(error => {
              console.error('Failed to start trivia session:', error)
            })
        }
      }
    },
    onStopEvent: (eventType: string) => {
      if (eventType === 'QR_CODE_EVENT') {
        // Hide the overlay and restore the original QR code state
        setShowQrCodeOverlay(false)
        setShowQrCode(originalQrCodeState)
      } else if (eventType === 'HIGHLIGHT_LAILA') {
        // Restore the original QR code state
        setShowQrCode(originalQrCodeStateForHighlight)
        setShowEventSpace(false)
        setEventSpaceType('')
        setEventSpaceParticipantId('')
      } else if (eventType === 'SAME_PICTURE_EVENT') {
        // Hide the same picture event
        setShowEventSpace(false)
        setEventSpaceType('')
        setShowQrCode(originalQrCodeState)
      } else if (eventType === 'EVOLUTION_OF_UNIVERSE') {
        // Hide the evolution of universe event
        setShowEventSpace(false)
        setEventSpaceType('')
        setShowQrCode(originalQrCodeState)
      } else if (eventType === 'TRIVIA_QUESTION') {
        // Hide the trivia question
        setShowTrivia(false)
        setTriviaQuestion('')
        setTriviaChoices([])
        setTriviaTopicName('')
        setTriviaCorrectAnswer(0)
        setTriviaAnswerRevealed(false) // Reset reveal state when stopping trivia
        setTriviaAnswerBreakdown([]) // Reset breakdown when stopping trivia
        setShowQrCode(originalQrCodeState)
        
        // End trivia session
        fetch('/api/admin/trivia-answer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'end-session'
          }),
        }).then(response => response.json())
          .then(result => {
            if (result.success) {
              console.log('Trivia session ended:', result.finalStats)
              setTriviaAnswerStats({ totalAnswers: 0, correctAnswers: 0 })
              setTriviaAnswerBreakdown([])
            }
          })
          .catch(error => {
            console.error('Failed to end trivia session:', error)
          })
      }
    },
    onTriviaAnswerStats: (data: { totalAnswers: number, correctAnswers: number, question: string, answerBreakdown: { choiceIndex: number, count: number, percentage: number }[] }) => {
      console.log('Received trivia answer stats:', data)
      setTriviaAnswerStats({
        totalAnswers: data.totalAnswers,
        correctAnswers: data.correctAnswers
      })
      setTriviaAnswerBreakdown(data.answerBreakdown || [])
    },
    onTriviaRevealAnswer: (data: { eventType: string }) => {
      console.log('Received trivia reveal answer:', data)
      if (data.eventType === 'TRIVIA_QUESTION') {
        setTriviaAnswerRevealed(true)
      }
    },
  }
  
  // Initialize Pusher events
  usePusherEvents(pusherHandlers)
  
  // Get participant video tracks (excluding admin)
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
  ], { onlySubscribed: false })
  
  const participantTracks = tracks.filter(
    track => !track.participant.identity.startsWith('admin') &&
             !track.participant.identity.startsWith('display') &&
             track.publication && 
             track.publication.isSubscribed
  )
  
  // Also include unsubscribed tracks for broader compatibility
  const allParticipantTracks = tracks.filter(
    track => !track.participant.identity.startsWith('admin') &&
             !track.participant.identity.startsWith('display') &&
             track.publication
  )
  
  const tracksToUse = participantTracks.length > 0 ? participantTracks : allParticipantTracks
  
  return (
    <div 
      className="h-screen w-screen" 
      style={{ 
        background: (showYoutubeBackground || showImageBackground) ? 'transparent' : colorSystem.backgroundColor,
        filter: invertColors ? 'invert(1)' : 'none'
      }}
    >
      {/* YouTube Background */}
      {showYoutubeBackground && youtubeVideoId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            overflow: 'hidden',
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=0`}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '177.77vh', // 16:9 aspect ratio scaled to viewport height
              height: '56.25vw', // 16:9 aspect ratio scaled to viewport width
              minWidth: '100vw',
              minHeight: '100vh',
              transform: 'translate(-50%, -50%)',
              border: 'none',
              pointerEvents: 'none',
            }}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}
      
      {/* Image Background */}
      {showImageBackground && backgroundImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            overflow: 'hidden',
          }}
        >
          <img
            src={backgroundImage}
            alt="Background"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100vw',
              height: '100vh',
              objectFit: 'contain',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
      
      <div 
        style={{ 
          width: canvasSize.width, 
          height: canvasSize.height 
        }}
        className="relative"
      >
        <Canvas
          orthographic
          camera={{ position: [0, 0, 100] }}
          style={{ 
            width: "100%", 
            height: "100%", 
            background: (showYoutubeBackground || showImageBackground) ? 'transparent' : colorSystem.backgroundColor 
          }}
        >
          <ResponsiveCamera />
          {/* Just the squares, handles the physics - hide during event space or when video squares are disabled */}
          {!showEventSpace && showVideoSquares && (
            <MovingSquares 
              participantTracks={tracksToUse} 
              onSquaresUpdate={setSquares}
              baseSpeed={currentBaseSpeed}
              useSquareShapes={useSquareShapes}
            />
          )}
        </Canvas>
        
        {/* Video content - handles both participant videos and placeholders - hide during event space or when video squares are disabled */}
        {!showEventSpace && showVideoSquares && (
          <VideoContent 
            squares={squares}
            participantTracks={tracksToUse}
            canvasSize={canvasSize}
            showNameLabels={showNameLabels}
            speechMessages={speechMessages}
            useSquareShapes={useSquareShapes}
          />
        )}
        
        {/* Event Space - shows special events like highlighting participants */}
        <EventSpace 
          show={showEventSpace}
          eventType={eventSpaceType}
          participantId={eventSpaceParticipantId}
          canvasSize={canvasSize}
        />
        
        {/* Text Overlay */}
        <TextOverlay 
          displayText={displayText}
          showText={showText}
          canvasSize={canvasSize}
          fontFamily={textFont}
        />
        
        {/* QR Code Overlay */}
        <QRCodeOverlay 
          show={showQrCodeOverlay}
          color={qrCodeColor}
          canvasSize={canvasSize}
        />
        
        {/* Trivia Overlay */}
                    <TriviaOverlay
              show={showTrivia}
              question={triviaQuestion}
              choices={triviaChoices}
              topicName={triviaTopicName}
              canvasSize={canvasSize}
              answerStats={showTriviaStats ? triviaAnswerStats : undefined}
              answerBreakdown={showTriviaStats ? triviaAnswerBreakdown : undefined}
              correctAnswer={triviaCorrectAnswer}
              answerRevealed={triviaAnswerRevealed}
            />
      </div>
      
      {/* QR Code */}
      <QRCode show={showQrCode} color={qrCodeColor} />
    </div>
  )
}

// Main page component with LiveKit connection
export default function DisplayNewPage() {
  const [token, setToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [displayId] = useState(() => `display-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Generate token for display with unique identity
  useEffect(() => {
    const generateToken = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(
          `/api/token?room=doom&username=${displayId}`
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
        console.error('Token generation failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate token')
      } finally {
        setIsLoading(false)
      }
    }

    generateToken()
  }, [displayId])

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-center text-black">
          <div className="text-6xl mb-8">🔗</div>
          <p className="text-2xl font-semibold">Connecting to DOOM Meeting...</p>
          <p className="text-lg text-gray-600 mt-2">Initializing video squares system</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-6xl mb-8">⚠️</div>
          <p className="text-2xl mb-4">Connection Failed</p>
          <p className="text-lg bg-red-50 p-4 rounded">{error}</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="text-6xl mb-8">🎫</div>
          <p className="text-2xl">No access token</p>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      onError={(error) => setError(`LiveKit connection failed: ${error.message}`)}
      data-lk-theme="default"
      style={{ height: "100vh" }}
    >
      <VideoSquareDisplay />
    </LiveKitRoom>
  )
} 