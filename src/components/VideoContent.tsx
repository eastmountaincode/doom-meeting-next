import React, { useState, useEffect } from 'react'
import { VideoTrack, useRemoteParticipants, TrackReferenceOrPlaceholder } from "@livekit/components-react"
import { VideoSquare as VideoSquareType } from '../types/videoSquare'
import { generateParticipantShape, getParticipantDisplayName } from '../lib/participantUtils'
import { HiVideoCamera } from 'react-icons/hi2'
import { PlaceholderStream } from '../types/videoSquare'

interface VideoContentProps {
  squares: VideoSquareType[]
  participantTracks: TrackReferenceOrPlaceholder[]
  canvasSize: { width: number, height: number }
  showNameLabels: boolean
  speechMessages: Array<{
    id: string
    participantId: string
    message: string
    timestamp: number
  }>
  useSquareShapes: boolean
}

// Helper function to convert YouTube URL to embed URL
function getYouTubeEmbedUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    let videoId = ''
    
    if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v') || ''
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1)
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&showinfo=0`
    }
  } catch {
    console.error('Invalid YouTube URL:', url)
  }
  
  return ''
}

// Video content component (renders outside Canvas)
export default function VideoContent({ 
  squares, 
  participantTracks, 
  canvasSize, 
  showNameLabels,
  speechMessages,
  useSquareShapes
}: VideoContentProps) {
  // Get remote participants to access metadata directly
  const remoteParticipants = useRemoteParticipants()
  
  // State for placeholder streams from admin settings
  const [placeholderStreams, setPlaceholderStreams] = useState<PlaceholderStream[]>([])
  
  // Load placeholder streams from localStorage
  useEffect(() => {
    const loadPlaceholderStreams = () => {
      const saved = localStorage.getItem('placeholderStreams')
      if (saved) {
        try {
          const streams = JSON.parse(saved) as PlaceholderStream[]
          setPlaceholderStreams(streams)
        } catch (error) {
          console.error('Failed to load placeholder streams:', error)
        }
      }
    }
    
    loadPlaceholderStreams()
    
    // Listen for updates from admin settings
    const handlePlaceholderUpdate = (event: CustomEvent) => {
      setPlaceholderStreams(event.detail.placeholders)
    }
    
    window.addEventListener('placeholderStreamsUpdated', handlePlaceholderUpdate as EventListener)
    
    return () => {
      window.removeEventListener('placeholderStreamsUpdated', handlePlaceholderUpdate as EventListener)
    }
  }, [])
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
      }}
    >
      {squares.map(square => {
        if (square.type === 'placeholder') {
          // Find the corresponding placeholder stream from admin settings
          const placeholderIndex = parseInt(square.participantId.split('-')[1]) - 1
          const placeholderStream = placeholderStreams[placeholderIndex]
          const embedUrl = placeholderStream?.url ? getYouTubeEmbedUrl(placeholderStream.url) : ''
          
          return (
            <div
              key={square.participantId}
              className="absolute"
              data-participant-id={square.participantId}
              style={{ width: '100%', height: '100%' }}
            >
              <div className="relative flex flex-col items-center w-full h-full">
                {/* Blob shape with video content */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    clipPath: generateParticipantShape(square.participantId, useSquareShapes).clipPath,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    backgroundColor: square.color || '#666', // Fallback color
                  }}
                >
                  {/* YouTube video or fallback content */}
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      style={{
                        border: 'none',
                        width: '160%',
                        height: '160%',
                        transform: 'translate(-20%, -20%)',
                        objectFit: 'cover',
                      }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="text-2xl mb-2">{square.placeholderData?.name || '📺'}</div>
                        <div className="text-sm font-medium">Placeholder</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Placeholder name label */}
                {showNameLabels && (placeholderStream?.name || square.placeholderData?.name) && (
                  <div
                    className="bg-black bg-opacity-80 px-2 py-1 text-white font-medium text-center"
                    style={useSquareShapes ? {
                      // Square shapes: flush in bottom-left corner within clipped area
                      position: 'absolute',
                      bottom: '7.8%', // 8% clipPath boundary + 2% padding
                      left: '7.8%',   // 8% clipPath boundary + 2% padding
                      fontSize: '0.9em',
                      pointerEvents: 'auto',
                      zIndex: 10,
                      maxWidth: '80%', // Stay within the clipped square area
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    } : {
                      // Circle shapes: centered below video
                      fontSize: '1.1em',
                      pointerEvents: 'auto',
                      zIndex: 10,
                      minWidth: '100px',
                      maxWidth: '350px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '-2.5em',
                    }}
                  >
                    {placeholderStream?.name || square.placeholderData?.name}
                  </div>
                )}
              </div>
            </div>
          )
        } else {
          // Render real participant video (existing LiveKit logic)
          const trackRef = participantTracks.find(
            track => track.participant.identity === square.participantId
          )
          
          const participant = remoteParticipants.find(
            p => p.identity === square.participantId
          )
          
          let cameraFacing = 'back'
          try {
            const metadata = participant?.metadata
            if (metadata) {
              const parsed = JSON.parse(metadata)
              cameraFacing = parsed.cameraFacing || 'back'
            }
          } catch {
            // Metadata parsing failed, default to back camera
          }

          return (
            <div
              key={square.participantId}
              className="absolute"
              data-participant-id={square.participantId}
              style={{ width: '100%', height: '100%' }}
            >
              <div className="relative flex flex-col items-center w-full h-full">
                {/* Blob video shape */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    clipPath: generateParticipantShape(square.participantId, useSquareShapes).clipPath,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    backgroundColor: trackRef?.publication ? 'transparent' : '#000',
                  }}
                >
                  {/* Show video if we have a track reference and publication */}
                  {trackRef?.publication && (
                    <VideoTrack
                      trackRef={trackRef}
                      className={`w-full h-full object-cover ${
                        cameraFacing === 'front' ? 'scale-x-[-1]' : ''
                      }`}
                    />
                  )}
                  
                  {/* Fallback content if no video track */}
                  {!trackRef?.publication && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                      <div className="text-center">
                        <HiVideoCamera className="text-4xl mb-2 mx-auto text-gray-400" />
                        <div className="text-sm font-medium">Waiting for camera...</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Name label */}
                {showNameLabels && (() => {
                  const displayName = getParticipantDisplayName(participant || {})
                  if (displayName) {
                    return (
                      <div
                        className="bg-black bg-opacity-80 px-2 py-1 text-white font-medium  text-center"
                        style={useSquareShapes ? {
                          // Square shapes: flush in bottom-left corner within clipped area
                          position: 'absolute',
                          bottom: '7.8%', // 8% clipPath boundary + 2% padding
                          left: '7.8%',   // 8% clipPath boundary + 2% padding
                          fontSize: '0.9em',
                          pointerEvents: 'auto',
                          zIndex: 10,
                          maxWidth: '80%', // Stay within the clipped square area
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        } : {
                          // Circle shapes: centered below video
                          fontSize: '1.1em',
                          pointerEvents: 'auto',
                          zIndex: 10,
                          minWidth: '100px',
                          maxWidth: '350px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '-2.5em',
                        }}
                      >
                        {displayName}
                      </div>
                    )
                  }
                  return null
                })()}
                
                {/* Speech bubble for participant */}
                {(() => {
                  // Get the most recent message for this participant
                  const participantMessages = speechMessages.filter(msg => msg.participantId === square.participantId)
                  const mostRecentMessage = participantMessages.length > 0 
                    ? participantMessages.reduce((latest, current) => 
                        current.timestamp > latest.timestamp ? current : latest
                      ) 
                    : null
                  
                  return mostRecentMessage ? (
                    <div
                      key={mostRecentMessage.id}
                      className="speech-bubble"
                      style={{
                        position: 'absolute',
                        top: '1%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        color: '#2c3e50',
                        padding: '12px 16px',
                        borderRadius: '18px',
                        fontSize: '0.85em',
                        fontWeight: '500',
                        pointerEvents: 'none',
                        zIndex: 20,
                        maxWidth: '280px',
                        wordWrap: 'break-word',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        animation: 'speechBubbleIn 0.3s ease-out',
                        lineHeight: '1.3',
                      }}
                    >
                      {mostRecentMessage.message}
                      {/* Speech bubble tail */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '0',
                          height: '0',
                          borderLeft: '8px solid transparent',
                          borderRight: '8px solid transparent',
                          borderTop: '8px solid #ffffff',
                          filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))',
                        }}
                      />
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          )
        }
      })}
    </div>
  )
} 