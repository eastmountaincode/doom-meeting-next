'use client'

import { useState, useEffect } from 'react'
import { PlaceholderStream } from '../../../types/videoSquare'

export default function AdminSettings() {
  const [placeholders, setPlaceholders] = useState<PlaceholderStream[]>([])
  const [editingPlaceholders, setEditingPlaceholders] = useState<PlaceholderStream[]>([])
  const [setStreamStatus, setSetStreamStatus] = useState<string | null>(null)

  // Initialize with 5 default placeholders if none exist
  useEffect(() => {
    const saved = localStorage.getItem('placeholderStreams')
    if (saved) {
      const savedPlaceholders = JSON.parse(saved)
      setPlaceholders(savedPlaceholders)
      setEditingPlaceholders([...savedPlaceholders])
    } else {
      // Create 5 default placeholders
      const defaultPlaceholders: PlaceholderStream[] = Array.from({ length: 5 }, (_, index) => ({
        id: `placeholder_${index + 1}`,
        name: 'Stork',
        url: 'https://www.youtube.com/watch?v=hKnuDloDCF8',
        enabled: true,
        createdAt: Date.now()
      }))
      setPlaceholders(defaultPlaceholders)
      setEditingPlaceholders([...defaultPlaceholders])
      localStorage.setItem('placeholderStreams', JSON.stringify(defaultPlaceholders))
    }
  }, [])

  // Save placeholders to localStorage whenever they change
  useEffect(() => {
    if (placeholders.length > 0) {
      localStorage.setItem('placeholderStreams', JSON.stringify(placeholders))
    }
  }, [placeholders])

  const updateEditingPlaceholder = (index: number, field: keyof PlaceholderStream, value: string | boolean) => {
    const updated = [...editingPlaceholders]
    updated[index] = { ...updated[index], [field]: value }
    setEditingPlaceholders(updated)
  }

  const setStream = (index: number) => {
    const editingPlaceholder = editingPlaceholders[index]
    if (!editingPlaceholder.name.trim() || !editingPlaceholder.url.trim()) {
      setSetStreamStatus('Please enter both name and URL')
      setTimeout(() => setSetStreamStatus(null), 3000)
      return
    }

    const updated = [...placeholders]
    updated[index] = {
      ...editingPlaceholder,
      name: editingPlaceholder.name.trim(),
      url: editingPlaceholder.url.trim()
    }
    setPlaceholders(updated)
    
    // Dispatch event to notify VideoSquareManager of placeholder updates
    const event = new CustomEvent('placeholderStreamsUpdated', {
      detail: { placeholders: updated }
    })
    window.dispatchEvent(event)
    
    setSetStreamStatus(`Stream ${index + 1} updated successfully!`)
    setTimeout(() => setSetStreamStatus(null), 3000)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-white">Settings</h3>
      
      {/* Placeholder Stream Management */}
      <div className="p-4 bg-gray-700 rounded-lg">
        <h4 className="text-md font-semibold text-white mb-4">Placeholder Video Streams</h4>
        <p className="text-gray-400 text-sm mb-4">
          These 5 streams will be shown when no users are present. When users join, placeholder streams are replaced with user video feeds.
        </p>

        {/* Status Message */}
        {setStreamStatus && (
          <div className={`mb-4 p-3 rounded text-sm ${
            setStreamStatus.includes('successfully') 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            {setStreamStatus}
          </div>
        )}

        {/* Placeholder Streams */}
        <div className="space-y-4">
          {editingPlaceholders.map((placeholder, index) => (
            <div key={placeholder.id} className="p-4 bg-gray-600 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-white">Stream {index + 1}</h5>
                <button
                  onClick={() => setStream(index)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Set Stream
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={placeholder.name}
                    onChange={(e) => updateEditingPlaceholder(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-500 border border-gray-400 rounded text-white text-sm placeholder-gray-300"
                    placeholder="Stream Name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Stream URL</label>
                  <input
                    type="url"
                    value={placeholder.url}
                    onChange={(e) => updateEditingPlaceholder(index, 'url', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-500 border border-gray-400 rounded text-white text-sm placeholder-gray-300"
                    placeholder="YouTube URL, etc."
                  />
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-400">
                Current: {placeholder.name} - {placeholder.url}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 