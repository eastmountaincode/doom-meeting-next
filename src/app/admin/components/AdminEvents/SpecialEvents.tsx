'use client'

import { HiSparkles } from 'react-icons/hi2'
import { RESERVED_SCREEN_NAME } from '../../../../config/constants'

interface SpecialEventsProps {
    activeEvent: string | null
    isTriggering: boolean
    startEvent: (eventType: string, options?: Record<string, unknown>) => Promise<void>
    stopEvent: () => Promise<void>
}

export default function SpecialEvents({ 
    activeEvent, 
    isTriggering, 
    startEvent, 
    stopEvent 
}: SpecialEventsProps) {
    return (
        <div className="space-y-4">
            <h4 className="text-md font-semibold text-white flex items-center gap-2"><HiSparkles className="text-lg" /> Special Events</h4>

            <div className="p-4 bg-gray-700 rounded-lg">


                <div className="mb-4 p-3 rounded" style={{
                    backgroundColor: activeEvent ? 'rgba(59, 130, 246, 0.3)' : 'rgba(75, 85, 99, 0.3)',
                    border: activeEvent ? '1px solid rgb(59, 130, 246)' : '1px solid rgb(75, 85, 99)'
                }}>
                    <div className={`text-sm font-medium ${activeEvent ? 'text-blue-300' : 'text-gray-400'}`}>
                        {activeEvent ? `Active Event: ${activeEvent}` : 'No active events'}
                    </div>
                </div>

                <div className="space-y-3">
                    {/* QR Code Event */}
                    <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                        <div>
                            <div className="text-white font-medium">QR Code Display</div>
                            <div className="text-gray-300 text-sm">Show large QR code in center of screen</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => startEvent('QR_CODE_EVENT')}
                                disabled={isTriggering || activeEvent === 'QR_CODE_EVENT'}
                                className={`cursor-pointer px-3 py-1 text-sm rounded font-medium transition-colors ${activeEvent === 'QR_CODE_EVENT'
                                        ? 'bg-green-600 text-white cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    } disabled:opacity-50`}
                            >
                                {activeEvent === 'QR_CODE_EVENT' ? 'Active' : 'Start'}
                            </button>
                            {activeEvent === 'QR_CODE_EVENT' && (
                                <button
                                    onClick={stopEvent}
                                    disabled={isTriggering}
                                    className="cursor-pointer px-3 py-1 text-sm bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                                >
                                    Stop
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Evolution of Universe Event */}
                    <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                        <div>
                            <div className="text-white font-medium">Evolution of Universe</div>
                            <div className="text-gray-300 text-sm">Show the evolution of the universe timeline as background</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => startEvent('EVOLUTION_OF_UNIVERSE')}
                                disabled={isTriggering || activeEvent === 'EVOLUTION_OF_UNIVERSE'}
                                className={`cursor-pointer px-3 py-1 text-sm rounded font-medium transition-colors ${activeEvent === 'EVOLUTION_OF_UNIVERSE'
                                        ? 'bg-green-600 text-white cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    } disabled:opacity-50`}
                            >
                                {activeEvent === 'EVOLUTION_OF_UNIVERSE' ? 'Active' : 'Start'}
                            </button>
                            {activeEvent === 'EVOLUTION_OF_UNIVERSE' && (
                                <button
                                    onClick={stopEvent}
                                    disabled={isTriggering}
                                    className="cursor-pointer px-3 py-1 text-sm bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                                >
                                    Stop
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Highlight Laila Event */}
                    <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                        <div>
                            <div className="text-white font-medium">Highlight Laila</div>
                            <div className="text-gray-300 text-sm">Show Laila&apos;s video feed in the center, hide all other participants</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => startEvent('HIGHLIGHT_LAILA', { participantId: RESERVED_SCREEN_NAME })}
                                disabled={isTriggering || activeEvent === 'HIGHLIGHT_LAILA'}
                                className={`cursor-pointer px-3 py-1 text-sm rounded font-medium transition-colors ${activeEvent === 'HIGHLIGHT_LAILA'
                                        ? 'bg-green-600 text-white cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    } disabled:opacity-50`}
                            >
                                {activeEvent === 'HIGHLIGHT_LAILA' ? 'Active' : 'Start'}
                            </button>
                            {activeEvent === 'HIGHLIGHT_LAILA' && (
                                <button
                                    onClick={stopEvent}
                                    disabled={isTriggering}
                                    className="cursor-pointer px-3 py-1 text-sm bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                                >
                                    Stop
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Same Picture Event */}
                    <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                        <div>
                            <div className="text-white font-medium">Same Picture</div>
                            <div className="text-gray-300 text-sm">Show the classic corporate &quot;same picture&quot; meme</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => startEvent('SAME_PICTURE_EVENT')}
                                disabled={isTriggering || activeEvent === 'SAME_PICTURE_EVENT'}
                                className={`cursor-pointer px-3 py-1 text-sm rounded font-medium transition-colors ${activeEvent === 'SAME_PICTURE_EVENT'
                                        ? 'bg-green-600 text-white cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    } disabled:opacity-50`}
                            >
                                {activeEvent === 'SAME_PICTURE_EVENT' ? 'Active' : 'Start'}
                            </button>
                            {activeEvent === 'SAME_PICTURE_EVENT' && (
                                <button
                                    onClick={stopEvent}
                                    disabled={isTriggering}
                                    className="cursor-pointer px-3 py-1 text-sm bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                                >
                                    Stop
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 