'use client'

import { useTracks, useRemoteParticipants, VideoTrack } from "@livekit/components-react"
import { Track } from "livekit-client"
import { useMemo } from "react"

interface EvolutionOfUniverseEventProps {
    canvasSize: { width: number; height: number }
}

export default function EvolutionOfUniverseEvent({ canvasSize }: EvolutionOfUniverseEventProps) {
    const maxWidth = canvasSize.width 
    const maxHeight = canvasSize.height

    // Get participant tracks similar to SamePictureEvent
    const allTracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: true },
    ], { onlySubscribed: false })

    const subscribedTracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: false },
    ], { onlySubscribed: true })

    // Use whichever has more tracks
    const tracks = allTracks.length > 0 ? allTracks : subscribedTracks

    // Get remote participants to access metadata
    const remoteParticipants = useRemoteParticipants()

    // Create a memoized participant identity string for dependency tracking
    const participantIdentities = useMemo(() => 
        tracks.map(t => t.participant.identity).join(','), 
        [tracks]
    )

    // Select one random participant using useMemo to avoid infinite loops
    const selectedParticipant = useMemo(() => {
        if (tracks.length > 0) {
            const availableParticipants = tracks
                .filter(track =>
                    !track.participant.identity.startsWith('admin') &&
                    !track.participant.identity.startsWith('display') &&
                    track.publication
                )

            if (availableParticipants.length >= 1) {
                // Shuffle and take first one
                const shuffled = [...availableParticipants].sort(() => Math.random() - 0.5)
                return shuffled[0]
            }
        }
        return null
    }, [tracks.length, participantIdentities])

    // Get camera facing for the selected participant
    const getCameraFacing = (participantId: string) => {
        const participant = remoteParticipants.find(p => p.identity === participantId)
        try {
            return JSON.parse(participant?.metadata || '{}').cameraFacing || 'back'
        } catch {
            return 'back'
        }
    }

    const cameraFacing = selectedParticipant ? getCameraFacing(selectedParticipant.participant.identity) : 'back'

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
                border: "1px solid red"
            }}
        >
            <div
                style={{
                    position: 'relative',
                    maxWidth: maxWidth,
                    maxHeight: maxHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: "3px solid blue"
                }}
            >
                {/* Video feed positioned over the timeline */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 11,
                    }}
                >
                    {selectedParticipant && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '44%', // Position along the timeline
                                right: '80%', // Near the "Today" section
                                width: '15%', // Percentage-based width
                                height: '20%', // Percentage-based height
                                overflow: 'hidden',
                                zIndex: 12,
                            }}
                        >
                            {selectedParticipant.publication ? (
                                <VideoTrack
                                    trackRef={selectedParticipant}
                                    className={`w-full h-full ${
                                        cameraFacing === 'front' ? 'scale-x-[-1]' : ''
                                    }`}
                                    style={{
                                        objectFit: 'cover',
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                                    <span className="text-sm">Loading video...</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Evolution of Universe Image */}
                <img
                    src="/images/evolution_of_universe.jpg"
                    alt="Evolution of the Universe"
                    style={{
                        maxWidth: maxWidth,
                        maxHeight: maxHeight,
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        zIndex: 10,
                    }}
                />
            </div>
        </div>
    )
} 