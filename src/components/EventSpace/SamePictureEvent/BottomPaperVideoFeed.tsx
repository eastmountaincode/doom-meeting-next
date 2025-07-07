import { VideoTrack, TrackReferenceOrPlaceholder } from "@livekit/components-react"
import { RemoteParticipant } from "livekit-client"

interface VideoFeedProps {
    participantId: string | null
    tracks: TrackReferenceOrPlaceholder[]
    remoteParticipants: RemoteParticipant[]
}

export default function BottomPaperVideoFeed({ participantId, tracks, remoteParticipants }: VideoFeedProps) {
    if (!participantId) return null

    const trackRef = tracks.find(track => track.participant.identity === participantId)

    const getCameraFacing = (id: string) => {
        const participant = remoteParticipants.find(p => p.identity === id)
        try {
            return JSON.parse(participant?.metadata || '{}').cameraFacing || 'back'
        } catch {
            return 'back'
        }
    }

    const cameraFacing = getCameraFacing(participantId)

    return (
        <div
            style={{
                position: 'absolute',

                top: '55%',
                left: '45%',
                width: '42%', 
                overflow: 'hidden',
                zIndex: 9,
            }}
        >
            {trackRef?.publication ? (
                <VideoTrack
                    trackRef={trackRef}
                    className={cameraFacing === 'front' ? 'w-full h-full scale-x-[-1]' : 'w-full h-full'}
                    style={{ objectFit: 'cover' }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                    <span className="text-sm">Loading video...</span>
                </div>
            )}
        </div>
    )
} 