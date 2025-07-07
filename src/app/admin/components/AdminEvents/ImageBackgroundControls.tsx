'use client'

import { useState } from 'react'
import { HiPhoto } from 'react-icons/hi2'

interface ImageBackgroundControlsProps {
    triggerEvent: (eventType: string, options?: Record<string, unknown>) => Promise<void>
    isTriggering: boolean
    backgroundType?: 'color' | 'youtube' | 'image'
}

export default function ImageBackgroundControls({ triggerEvent, isTriggering, backgroundType = 'image' }: ImageBackgroundControlsProps) {
    const [backgroundImage, setBackgroundImage] = useState<string>('')
    const [isDragging, setIsDragging] = useState(false)

    const handleImageUpload = async (file: File) => {
        if (!file || !file.type.startsWith('image/')) return
        const reader = new FileReader()
        reader.onload = async (e) => {
            const imageUrl = e.target?.result as string
            setBackgroundImage(imageUrl)

            /* store + notify display */
            await fetch('/api/admin/image-background', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl }),
            })
            await triggerEvent('SET_IMAGE_BACKGROUND', { imageId: 'stored' })
        }
        reader.readAsDataURL(file)
    }

    const clearImage = async () => {
        setBackgroundImage('')
        await triggerEvent('CLEAR_IMAGE_BACKGROUND')
    }

    /* ---------- drag & drop ---------- */
    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
    const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false)
        if (e.dataTransfer.files[0]) handleImageUpload(e.dataTransfer.files[0])
    }
    /* --------------------------------- */

    return (
        <div className="p-4 bg-gray-700 rounded-lg" style={{ opacity: backgroundType === 'image' ? 1 : 0.5 }}>
            <div className="flex items-center space-x-3 mb-4">
                <HiPhoto className="text-lg" />
                <div>
                    <div className="text-white font-medium">Image Background</div>
                    <div className="text-gray-400 text-sm">Drag and drop an image or click to upload</div>
                </div>
            </div>

            <div
                onDragOver={backgroundType === 'image' ? onDragOver : undefined}
                onDragLeave={backgroundType === 'image' ? onDragLeave : undefined}
                onDrop={backgroundType === 'image' ? onDrop : undefined}
                onClick={backgroundType === 'image' ? () => document.getElementById('image-upload')!.click() : undefined}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    backgroundType === 'image' 
                        ? `cursor-pointer ${isDragging ? 'border-blue-400 bg-blue-50/10' : 'border-gray-500 hover:border-gray-400'}`
                        : 'border-gray-600 cursor-not-allowed'
                }`}
            >
                <div className="text-4xl mb-2">📸</div>
                <div className="text-white font-medium mb-1">
                    {isDragging ? 'Drop image here' : 'Drag image here or click to upload'}
                </div>
                <div className="text-gray-400 text-sm">
                    Supports JPG, PNG, GIF formats
                </div>
            </div>

            <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                className="hidden"
            />

            {backgroundImage && (
                <div className="mt-4">
                    <img
                        src={backgroundImage}
                        alt="Background preview"
                        className="w-full max-w-md rounded mb-2"
                        style={{ height: 158, objectFit: 'cover' }}
                    />

                    <button
                        onClick={clearImage}
                        disabled={isTriggering || backgroundType !== 'image'}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                    >
                        Clear Image
                    </button>
                </div>
            )}
        </div>
    )
}
