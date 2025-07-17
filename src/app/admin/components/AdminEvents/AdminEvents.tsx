'use client'

import { useState, useEffect } from 'react'
import {
    HiTag,
    HiQrCode,
    HiSparkles
} from 'react-icons/hi2'
import BackgroundControls from './BackgroundControls'
import VideoSpeedControls from './VideoSpeedControls'
import LiveTextOverlay from './LiveTextOverlay'
import SpecialEvents from './SpecialEvents'
import TriviaControls from './TriviaControls'

export default function AdminEvents() {
    const [isTriggering, setIsTriggering] = useState(false)
    const [lastEvent, setLastEvent] = useState<string>('')
    const [showNameLabels, setShowNameLabels] = useState(true)
    const [showQrCode, setShowQrCode] = useState(true)
    const [qrCodeColor, setQrCodeColor] = useState<'black' | 'white'>('white')
    const [useSquareShapes, setUseSquareShapes] = useState(true)
    const [invertColors, setInvertColors] = useState(false)
    const [showVideoSquares, setShowVideoSquares] = useState(true)

    // Event system state
    const [activeEvent, setActiveEvent] = useState<string | null>(null)

    // Listen for display color updates when cycle stops
    useEffect(() => {
        let pusher: { subscribe: (channel: string) => { bind: (event: string, callback: (data: { backgroundColor: string }) => void) => void; unbind_all: () => void }; connection: { bind: (event: string, callback: () => void) => void }; unsubscribe: (channel: string) => void; disconnect: () => void } | null = null
        let channel: { bind: (event: string, callback: (data: { backgroundColor: string }) => void) => void; unbind_all: () => void } | null = null

        const connectToPusher = async () => {
            try {
                const Pusher = (await import('pusher-js')).default
                pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
                    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
                }) as typeof pusher
                if (pusher) {
                    channel = pusher.subscribe('admin-channel')
                    pusher.connection.bind('connected', () => {
                        console.log('Pusher connected for admin!')
                    })
                }
            } catch (error) {
                console.error('Failed to initialize Pusher for admin:', error)
            }
        }
        connectToPusher()
        return () => {
            if (channel) {
                channel.unbind_all()
                pusher?.unsubscribe('admin-channel')
            }
            if (pusher) {
                pusher.disconnect()
            }
        }
    }, [])

    const triggerEvent = async (eventType: string, options: Record<string, unknown> = {}) => {
        try {
            setIsTriggering(true)
            const response = await fetch('/api/admin/trigger-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: eventType,
                    ...options,
                }),
            })
            const result = await response.json()
            if (result.success) {
                setLastEvent(`${eventType} sent`)
                console.log('Event triggered:', result.event)
            } else {
                setLastEvent(`Failed: ${result.error}`)
                console.error('Event failed:', result.error)
            }
        } catch (error) {
            setLastEvent(`Error: ${error}`)
            console.error('Trigger error:', error)
        } finally {
            setIsTriggering(false)
        }
    }

    const toggleNameLabels = async () => {
        const newState = !showNameLabels
        setShowNameLabels(newState)
        await triggerEvent('TOGGLE_NAME_LABELS', { showNameLabels: newState })
    }

    const toggleQrCode = async () => {
        const newState = !showQrCode
        setShowQrCode(newState)
        await triggerEvent('TOGGLE_QR_CODE', { showQrCode: newState })
    }

    const toggleQrCodeColor = async () => {
        const newColor = qrCodeColor === 'black' ? 'white' : 'black'
        setQrCodeColor(newColor)
        await triggerEvent('SET_QR_CODE_COLOR', { qrCodeColor: newColor })
    }

    const toggleVideoShapes = async () => {
        const newState = !useSquareShapes
        setUseSquareShapes(newState)
        await triggerEvent('TOGGLE_VIDEO_SHAPES', { useSquareShapes: newState })
    }

    const toggleInvertColors = async () => {
        const newState = !invertColors
        setInvertColors(newState)
        await triggerEvent('TOGGLE_INVERT_COLORS', { invertColors: newState })
    }

    const toggleVideoSquares = async () => {
        const newState = !showVideoSquares
        setShowVideoSquares(newState)
        await triggerEvent('TOGGLE_VIDEO_SQUARES', { showVideoSquares: newState })
    }



    // Event system functions
    const startEvent = async (eventType: string, options: Record<string, unknown> = {}) => {
        if (activeEvent) {
            // Stop current event first
            await stopEvent()
        }

        setActiveEvent(eventType)
        await triggerEvent('START_EVENT', { eventType, ...options })
    }

    const stopEvent = async () => {
        if (activeEvent) {
            await triggerEvent('STOP_EVENT', { eventType: activeEvent })
            setActiveEvent(null)
        }
    }

    const revealAnswer = async () => {
        await triggerEvent('REVEAL_ANSWER', { eventType: activeEvent })
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-white">Event Controls</h3>
            {lastEvent && (
                <div className="text-sm text-gray-300">Status: {lastEvent}</div>
            )}
            <div className="space-y-4">
                <h4 className="text-md font-semibold text-white">Display Settings</h4>
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2">
                    <div className="flex items-center space-x-3">
                        <HiTag className="text-lg" />
                        <div>
                            <div className="text-white font-medium">Screen Name Labels</div>
                            <div className="text-gray-400 text-sm">Show participant names below video feeds</div>
                        </div>
                    </div>
                    <button
                        onClick={toggleNameLabels}
                        disabled={isTriggering}
                        className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${showNameLabels ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showNameLabels ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2">
                    <div className="flex items-center space-x-3">
                        <HiQrCode className="text-lg" />
                        <div>
                            <div className="text-white font-medium">QR Code</div>
                            <div className="text-gray-400 text-sm">Show QR code in upper left corner for easy access</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={toggleQrCodeColor}
                            disabled={isTriggering || !showQrCode}
                            className={`cursor-pointer px-3 py-1 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${qrCodeColor === 'white'
                                    ? 'bg-white text-gray-800 border border-gray-300'
                                    : 'bg-gray-800 text-white border border-gray-600'
                                }`}
                        >
                            {qrCodeColor === 'white' ? 'White' : 'Black'}
                        </button>
                        <button
                            onClick={toggleQrCode}
                            disabled={isTriggering}
                            className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${showQrCode ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showQrCode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2">
                    <div className="flex items-center space-x-3">
                        <HiSparkles className="text-lg" />
                        <div>
                            <div className="text-white font-medium">Video Shapes</div>
                            <div className="text-gray-400 text-sm">Switch between circle blobs and square shapes (Zoom-like)</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className={`text-sm font-medium ${!useSquareShapes ? 'text-white' : 'text-gray-400'}`}>
                            Circles
                        </span>
                        <button
                            onClick={toggleVideoShapes}
                            disabled={isTriggering}
                            className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${useSquareShapes ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useSquareShapes ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-sm font-medium ${useSquareShapes ? 'text-white' : 'text-gray-400'}`}>
                            Squares
                        </span>
                    </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2">
                    <div className="flex items-center space-x-3">
                        <HiSparkles className="text-lg" />
                        <div>
                            <div className="text-white font-medium">Invert Colors</div>
                            <div className="text-gray-400 text-sm">Toggle inverted color display for a dramatic visual effect</div>
                        </div>
                    </div>
                    <button
                        onClick={toggleInvertColors}
                        disabled={isTriggering}
                        className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${invertColors ? 'bg-purple-600' : 'bg-gray-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${invertColors ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-2">
                    <div className="flex items-center space-x-3">
                        <HiSparkles className="text-lg" />
                        <div>
                            <div className="text-white font-medium">Video Squares</div>
                            <div className="text-gray-400 text-sm">Show or hide all video squares (both participants and placeholders)</div>
                        </div>
                    </div>
                    <button
                        onClick={toggleVideoSquares}
                        disabled={isTriggering}
                        className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 ${showVideoSquares ? 'bg-green-600' : 'bg-gray-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showVideoSquares ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <div className="space-y-4 mt-5">
                    <BackgroundControls triggerEvent={triggerEvent} isTriggering={isTriggering} />
                </div>
            </div>

            <VideoSpeedControls />

            {/* Live Text Overlay */}
            <LiveTextOverlay triggerEvent={triggerEvent} isTriggering={isTriggering} />

            {/* Trivia Controls */}
            <TriviaControls
                triggerEvent={triggerEvent}
                isTriggering={isTriggering}
                activeEvent={activeEvent}
                startEvent={startEvent}
                stopEvent={stopEvent}
                revealAnswer={revealAnswer}
            />

            {/* Special Events */}
            <SpecialEvents
                activeEvent={activeEvent}
                isTriggering={isTriggering}
                startEvent={startEvent}
                stopEvent={stopEvent}
            />
        </div>
    )
} 