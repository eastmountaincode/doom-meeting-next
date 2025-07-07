'use client'

import { useTracks, VideoTrack } from "@livekit/components-react"
import { Track } from "livekit-client"
import { RESERVED_SCREEN_NAME } from "../../config/constants"
import { generateParticipantShape } from "../../lib/participantUtils"

interface HighlightLailaEventProps {
  participantId?: string
  canvasSize: { width: number; height: number }
}

export default function HighlightLailaEvent({ participantId, canvasSize }: HighlightLailaEventProps) {
  // Get all participant video tracks - try different approaches
  const allTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ], { onlySubscribed: false })
  
  const subscribedTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
  ], { onlySubscribed: true })
  
  // Use whichever has more tracks
  const tracks = allTracks.length > 0 ? allTracks : subscribedTracks
  
  // Use the reserved screen name or the provided participantId
  const targetParticipantId = participantId || RESERVED_SCREEN_NAME
  
  // Debug: Log all participants and their identities
  console.log('All tracks (with placeholders):', allTracks.length)
  console.log('Subscribed tracks:', subscribedTracks.length)
  console.log('Using tracks:', tracks.length)
  console.log('All tracks:', tracks.map(t => ({
    identity: t.participant.identity,
    name: t.participant.name,
    metadata: t.participant.metadata,
    isSubscribed: t.publication?.isSubscribed,
    hasPublication: !!t.publication,
    isPlaceholder: !t.publication
  })))
  console.log('Looking for participant:', targetParticipantId)
  
  // Find the specific participant's track - match displayName from metadata
  const participantTrack = tracks.find(
    track => {
      try {
        const metadata = JSON.parse(track.participant.metadata || '{}')
        return metadata.displayName === targetParticipantId && track.publication
      } catch {
        return false
      }
    }
  )
  
  console.log('Found participant track:', !!participantTrack, participantTrack?.participant.identity)
  
  // Extract camera facing from participant metadata (same logic as VideoContent.tsx)
  let cameraFacing = 'back'
  try {
    const metadata = participantTrack?.participant.metadata
    if (metadata) {
      const parsed = JSON.parse(metadata)
      cameraFacing = parsed.cameraFacing || 'back'
    }
  } catch {
    // Metadata parsing failed, default to back camera
  }
  
  if (!participantTrack) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasSize.width,
          height: canvasSize.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          Waiting for {targetParticipantId} to join...
        </div>
      </div>
    )
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasSize.width,
        height: canvasSize.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        // No background - completely transparent
      }}
    >
      <div
        style={{
          // Make it actually square by using the smaller dimension
          width: Math.min(canvasSize.width * 0.8, canvasSize.height * 0.8),
          height: Math.min(canvasSize.width * 0.8, canvasSize.height * 0.8),
          position: 'relative',
        }}
      >
        {/* Video with square clipping consistent with other videos */}
        <div
          style={{
            width: '100%',
            height: '100%',
            clipPath: generateParticipantShape(targetParticipantId, true).clipPath, // Use square shape
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            backgroundColor: 'transparent',
          }}
        >
                     {participantTrack.publication && (
             <VideoTrack
               trackRef={participantTrack}
               className={`w-full h-full object-cover ${
                 cameraFacing === 'front' ? 'scale-x-[-1]' : ''
               }`}
             />
           )}
        </div>
        
        {/* Name label in bottom-left corner like other videos */}
        <div
          className="bg-black bg-opacity-80 px-2 py-1 text-white font-medium"
          style={{
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
          }}
        >
          {targetParticipantId}
        </div>
      </div>
    </div>
  )
} 