'use client'

import { useState } from 'react'
import ColorPickerControls from './ColorPickerControls'
import YouTubeBackgroundControls from './YouTubeBackgroundControls'
import ImageBackgroundControls from './ImageBackgroundControls'

interface BackgroundControlsProps {
    triggerEvent: (eventType: string, options?: Record<string, unknown>) => Promise<void>
    isTriggering: boolean
}

export default function BackgroundControls({ triggerEvent, isTriggering }: BackgroundControlsProps) {
    const [backgroundType, setBackgroundType] = useState<'color' | 'youtube' | 'image'>('color')

    const handleBackgroundTypeChange = (type: 'color' | 'youtube' | 'image') => {
        setBackgroundType(type)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-white">Background</h4>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handleBackgroundTypeChange('color')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            backgroundType === 'color' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                    >
                        Color
                    </button>
                    <button
                        onClick={() => handleBackgroundTypeChange('youtube')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            backgroundType === 'youtube' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                    >
                        YouTube
                    </button>
                    <button
                        onClick={() => handleBackgroundTypeChange('image')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            backgroundType === 'image' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                    >
                        Image
                    </button>
                </div>
            </div>

            {/* Render all background control components */}
            <ColorPickerControls 
                triggerEvent={triggerEvent} 
                isTriggering={isTriggering} 
                backgroundType={backgroundType}
            />

            <YouTubeBackgroundControls 
                triggerEvent={triggerEvent} 
                isTriggering={isTriggering} 
                backgroundType={backgroundType}
            />

            <ImageBackgroundControls 
                triggerEvent={triggerEvent} 
                isTriggering={isTriggering} 
                backgroundType={backgroundType}
            />
        </div>
    )
}
