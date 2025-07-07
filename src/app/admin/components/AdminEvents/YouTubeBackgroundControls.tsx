'use client'

import { useState, useEffect } from 'react'
import { HiPlay } from 'react-icons/hi2'

interface YouTubeBackgroundControlsProps {
    triggerEvent: (eventType: string, options?: Record<string, unknown>) => Promise<void>
    backgroundType?: 'color' | 'youtube' | 'image'
}

function extractYouTubeVideoId(url: string): string | null {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
    return match ? match[1] : null
}

export default function YouTubeBackgroundControls({ triggerEvent, backgroundType = 'youtube' }: YouTubeBackgroundControlsProps) {
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [youtubeVideoId, setYoutubeVideoId] = useState('')
    const [youtubeNotes, setYoutubeNotes] = useState('')

    /* -------- localStorage for notes -------- */
    useEffect(() => {
        setYoutubeNotes(localStorage.getItem('youtube-notes') || '')
    }, [])

    const saveNotes = (notes: string) => {
        setYoutubeNotes(notes)
        localStorage.setItem('youtube-notes', notes)
    }
    /* ---------------------------------------- */

    const handleSetYouTube = async () => {
        const id = extractYouTubeVideoId(youtubeUrl) || youtubeUrl.trim()
        if (id.length === 11) {
            setYoutubeVideoId(id)
            await triggerEvent('SET_YOUTUBE_BACKGROUND', { videoId: id })
            setYoutubeUrl('')
        }
    }

    const handleClearYouTube = async () => {
        setYoutubeVideoId('')
        await triggerEvent('CLEAR_YOUTUBE_BACKGROUND')
    }

    const handleClearNotes = () => {
        if (confirm('Are you sure you want to clear all your YouTube notes?')) {
            saveNotes('')
        }
    }

    return (
        <div className="p-4 bg-gray-700 rounded-lg" style={{ opacity: backgroundType === 'youtube' ? 1 : 0.5 }}>
            <div className="flex items-center space-x-3 mb-4">
                <HiPlay className="text-lg" />
                <div>
                    <div className="text-white font-medium">YouTube Video</div>
                    <div className="text-gray-400 text-sm">Set a YouTube video as the background</div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        className="w-full px-3 py-2 rounded border border-gray-400 bg-gray-800 text-white mb-3 disabled:opacity-50"
                        placeholder="Paste YouTube URL or video ID"
                        value={youtubeUrl}
                        onChange={e => setYoutubeUrl(e.target.value)}
                        disabled={backgroundType !== 'youtube'}
                    />
                    <div className="flex flex-row gap-2">
                        <button
                            className={`cursor-pointer px-4 py-2 rounded text-sm font-medium disabled:opacity-50 ${youtubeUrl ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-500 text-gray-300'}`}
                            onClick={handleSetYouTube}
                            disabled={!youtubeUrl || backgroundType !== 'youtube'}
                        >
                            Set Video
                        </button>
                        <button
                            className={`cursor-pointer px-4 py-2 rounded text-sm font-medium disabled:opacity-50 ${youtubeVideoId ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-500 text-gray-300'}`}
                            onClick={handleClearYouTube}
                            disabled={!youtubeVideoId || backgroundType !== 'youtube'}
                        >
                            Clear Video
                        </button>
                    </div>
                </div>
                {/* Video Preview */}
                {youtubeVideoId && (
                    <div className="flex-shrink-0">
                        <div style={{ width: 280, height: 158, background: '#111', borderRadius: 8, overflow: 'hidden' }}>
                            <iframe
                                width="280"
                                height="158"
                                src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                                title="YouTube video preview"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* YouTube Notes Section */}
            <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-white font-medium">YouTube Video Notes</div>
                    </div>
                    <button
                        onClick={handleClearNotes}
                        className="cursor-pointer px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium disabled:opacity-50"
                        disabled={!youtubeNotes.trim() || backgroundType !== 'youtube'}
                    >
                        Clear Notes
                    </button>
                </div>
                <textarea
                    value={youtubeNotes}
                    onChange={(e) => saveNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 resize-vertical disabled:opacity-50"
                    rows={12}
                    style={{ minHeight: '200px', maxHeight: '400px' }}
                    disabled={backgroundType !== 'youtube'}
                />
            </div>
        </div>
    )
}
