import { VideoTrack, TrackReferenceOrPlaceholder } from "@livekit/components-react"
import { RemoteParticipant } from "livekit-client"

interface VideoFeedProps {
  participantId: string | null
  tracks: TrackReferenceOrPlaceholder[]
  remoteParticipants: RemoteParticipant[]
}

export default function RightPaperVideoFeed({ participantId, tracks, remoteParticipants }: VideoFeedProps) {
    if (!participantId) return null
    
    const trackRef = tracks.find(track => track.participant.identity === participantId)
    
    // Get camera facing for the participant
    const getCameraFacing = (participantId: string) => {
      const participant = remoteParticipants.find(p => p.identity === participantId)
      try {
        const metadata = participant?.metadata
        if (metadata) {
          const parsed = JSON.parse(metadata)
          return parsed.cameraFacing || 'back'
        }
      } catch {
        // Metadata parsing failed, default to back camera
      }
      return 'back'
    }
    
    const cameraFacing = getCameraFacing(participantId)
    
    return (
      <div
        style={{
          position: 'absolute',

          transform: 'rotate(12deg)',
          top: '4%',
          left: '52%',
          width: '48%',
          overflow: 'hidden',
          zIndex: 9,
        }}
      >
        {trackRef?.publication ? (
          <VideoTrack
            trackRef={trackRef}
            className={`w-full h-full ${
              cameraFacing === 'front' ? 'scale-x-[-1]' : ''
            }`}
            style={{
              objectFit: 'contain',
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
            <div className="text-center">
              <div className="text-sm">Loading video...</div>
            </div>
          </div>
        )}
      </div>
    )
  } 