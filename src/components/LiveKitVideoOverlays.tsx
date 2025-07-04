import React from 'react'
import { VideoTrack, useRemoteParticipants, TrackReferenceOrPlaceholder } from "@livekit/components-react"
import { VideoSquare as VideoSquareType } from '../types/videoSquare'
import { generateParticipantShape, getParticipantDisplayName } from '../lib/participantUtils'
import { HiVideoCamera } from 'react-icons/hi2'

interface LiveKitVideoOverlaysProps {
  squares: VideoSquareType[]
  participantTracks: TrackReferenceOrPlaceholder[]
  canvasSize: { width: number, height: number }
  showNameLabels: boolean
}

// Video overlays component (renders outside Canvas)
export default function LiveKitVideoOverlays({ 
  squares, 
  participantTracks, 
  canvasSize, 
  showNameLabels 
}: LiveKitVideoOverlaysProps) {
  // Get remote participants to access metadata directly
  const remoteParticipants = useRemoteParticipants()
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
      }}
    >
      {squares.map(square => {
        // Find corresponding video track for participants
        const trackRef = participantTracks.find(
          track => track.participant.identity === square.participantId
        )
        
        // Find participant from remoteParticipants for metadata
        const participant = remoteParticipants.find(
          p => p.identity === square.participantId
        )
        
        // Check camera facing from metadata
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
      })}
    </div>
  )
} 