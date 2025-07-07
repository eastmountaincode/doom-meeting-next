'use client'

import { useTracks, useRemoteParticipants } from "@livekit/components-react"
import { Track } from "livekit-client"
import { useMemo } from "react"
import LeftPaperVideoFeed from "./LeftPaperVideoFeed"
import RightPaperVideoFeed from "./RightPaperVideoFeed"
import BottomPaperVideoFeed from "./BottomPaperVideoFeed"

interface SamePictureEventProps {
    canvasSize: { width: number; height: number }
}

export default function SamePictureEvent({ canvasSize }: SamePictureEventProps) {
    // Calculate the maximum size for the image (80% of screen with padding)
    const maxWidth = canvasSize.width * 0.8
    const maxHeight = canvasSize.height * 0.8

    // Get participant tracks similar to other components
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

    // Select three random participants using useMemo to avoid infinite loops
    const selectedParticipants = useMemo(() => {
        if (tracks.length > 0) {
            const availableParticipants = tracks
                .filter(track =>
                    !track.participant.identity.startsWith('admin') &&
                    !track.participant.identity.startsWith('display') &&
                    track.publication
                )
                .map(track => track.participant.identity)

            if (availableParticipants.length >= 3) {
                // Shuffle and take first 3
                const shuffled = [...availableParticipants].sort(() => Math.random() - 0.5)
                return shuffled.slice(0, 3)
            } else if (availableParticipants.length === 2) {
                // If only two participants, use them for first two slots, repeat first for third
                return [availableParticipants[0], availableParticipants[1], availableParticipants[0]]
            } else if (availableParticipants.length === 1) {
                // If only one participant, use them for all three slots
                return [availableParticipants[0], availableParticipants[0], availableParticipants[0]]
            }
        }
        return []
    }, [tracks.length, participantIdentities])

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
                    position: 'relative',
                    maxWidth: maxWidth,
                    maxHeight: maxHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden', // This will clip anything outside the container
                }}
            >
                {/* Video containers positioned absolutely - these will be clipped by the container */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}
                >
                    <LeftPaperVideoFeed 
                        participantId={selectedParticipants[0]} 
                        tracks={tracks}
                        remoteParticipants={remoteParticipants}
                    />
                    
                    <RightPaperVideoFeed 
                        participantId={selectedParticipants[1]} 
                        tracks={tracks}
                        remoteParticipants={remoteParticipants}
                    />

                    <BottomPaperVideoFeed 
                        participantId={selectedParticipants[2]} 
                        tracks={tracks}
                        remoteParticipants={remoteParticipants}
                    />
                </div>

                {/* Image on top for visibility */}
                <img
                    src="/images/corporate_same_picture_3.png"
                    alt="Corporate Same Picture"
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