import { useState, useEffect, useRef, useCallback } from 'react'
import { VideoSquare, SquareConfig } from '../types/videoSquare'
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
                setSquares(event.data.squares)
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

    const updatePhysics = useCallback((deltaTime: number) => {
        managerRef.current?.updatePhysics(deltaTime)
    }, [])

    const updateWorldBounds = useCallback((width: number, height: number) => {
        managerRef.current?.updateWorldBounds(width, height)
    }, [])

    // Subscribe to custom events
    const onSquareEvent = useCallback((eventType: string, callback: (event: any) => void) => {
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
        removeParticipant,
        updateSquareVideo,
        clearAllSquares,
        updatePhysics,
        updateWorldBounds,

        // Events
        onSquareEvent,

        // Utils
        getSquareCount,
        manager: managerRef.current
    }
} 