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
  showNameLabels 
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
                    clipPath: generateParticipantShape(square.participantId).clipPath,
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
                    className="bg-black bg-opacity-80 px-2 py-1 text-white font-medium rounded text-center"
                    style={{
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
                    clipPath: generateParticipantShape(square.participantId).clipPath,
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
                        className="bg-black bg-opacity-80 px-2 py-1 text-white font-medium rounded text-center"
                        style={{
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
              </div>
            </div>
          )
        }
      })}
    </div>
  )
} 