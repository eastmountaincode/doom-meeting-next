import { useState, useEffect, useRef, useCallback } from 'react'
import { VideoSquare, SquareConfig, VideoSquareEvent } from '../types/videoSquare'
import { VideoSquareManager } from '../lib/VideoSquareManager'
import { VIDEO_SQUARE_CONFIG } from '../config/videoSquareConfig'

export function useVideoSquares(config: SquareConfig = VIDEO_SQUARE_CONFIG) {
    const [squares, setSquares] = useState<VideoSquare[]>([])
    const [isInitialized, setIsInitialized] = useState(false)
    const managerRef = useRef<VideoSquareManager | null>(null)

    // Initialize manager
    useEffect(() => {
        if (!managerRef.current) {
            managerRef.current = new VideoSquareManager(config)

            // Subscribe to square updates
            managerRef.current.on('squares.updated', (event) => {
                if (event.data && typeof event.data === 'object' && 'squares' in event.data) {
                    const newSquares = (event.data as { squares: VideoSquare[] }).squares
                    setSquares(newSquares)
                }
            })

            setIsInitialized(true)
        }

        // Cleanup on unmount
        return () => {
            if (managerRef.current) {
                managerRef.current.destroy()
                managerRef.current = null
            }
        }
    }, [config])

    // API methods
    const addParticipant = useCallback((participantId: string, options?: { color?: string }) => {
        return managerRef.current?.addParticipant(participantId, options) || null
    }, [])

    const addPlaceholder = useCallback((placeholderId: string, options?: { color?: string }) => {
        return managerRef.current?.addPlaceholder(placeholderId, options) || null
    }, [])

    const removeParticipant = useCallback((participantId: string) => {
        return managerRef.current?.removeParticipant(participantId) || false
    }, [])

    const updateSquareVideo = useCallback((participantId: string, videoTrack?: MediaStreamTrack) => {
        return managerRef.current?.updateSquareVideo(participantId, videoTrack) || false
    }, [])

    const clearAllSquares = useCallback(() => {
        managerRef.current?.clear()
    }, [])

    const getSquareCount = useCallback(() => {
        return managerRef.current?.getSquareCount() || 0
    }, [])

    const convertPlaceholderToParticipant = useCallback((placeholderId: string, newParticipantId: string) => {
        return managerRef.current?.convertPlaceholderToParticipant(placeholderId, newParticipantId) || false
    }, [])

    const convertParticipantToPlaceholder = useCallback((participantId: string, newPlaceholderId: string) => {
        return managerRef.current?.convertParticipantToPlaceholder(participantId, newPlaceholderId) || false
    }, [])

    const getParticipantCount = useCallback(() => {
        return managerRef.current?.getParticipantCount() || 0
    }, [])

    const getPlaceholderCount = useCallback(() => {
        return managerRef.current?.getPlaceholderCount() || 0
    }, [])

    const getFirstPlaceholder = useCallback(() => {
        return managerRef.current?.getFirstPlaceholder() || null
    }, [])

    const updateWorldBounds = useCallback((width: number, height: number) => {
        managerRef.current?.updateWorldBounds(width, height)
    }, [])

    // Subscribe to custom events
    const onSquareEvent = useCallback((eventType: string, callback: (event: VideoSquareEvent) => void) => {
        managerRef.current?.on(eventType, callback)

        // Return cleanup function
        return () => {
            managerRef.current?.off(eventType, callback)
        }
    }, [])

    return {
        // State
        squares,
        isInitialized,
        squareCount: squares.length,

        // Actions
        addParticipant,
        addPlaceholder,
        removeParticipant,
        updateSquareVideo,
        clearAllSquares,
        updateWorldBounds,

        // Conversion methods
        convertPlaceholderToParticipant,
        convertParticipantToPlaceholder,

        // Events
        onSquareEvent,

        // Utils
        getSquareCount,
        getParticipantCount,
        getPlaceholderCount,
        getFirstPlaceholder,
        manager: managerRef.current
    }
} 