'use client'

import { useState } from 'react'
import VideoFeedsDashboard from './VideoFeedsDashboard'

type AdminSection = 'video-feeds' | 'participants' | 'settings'

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>('video-feeds')

  const sections = [
    { id: 'video-feeds' as AdminSection, label: 'Video Feeds', icon: '📹' },
    { id: 'participants' as AdminSection, label: 'Participants', icon: '👥' },
    { id: 'settings' as AdminSection, label: 'Settings', icon: '⚙️' },
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'video-feeds':
        return <VideoFeedsDashboard />
      case 'participants':
        return (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg mb-2">Participants Management</h3>
            <p>Coming soon - participant list and controls</p>
          </div>
        )
      case 'settings':
        return (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-lg mb-2">Admin Settings</h3>
            <p>Coming soon - room settings and configuration</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                activeSection === section.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span className="text-lg">{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Section Content */}
      <div className="bg-gray-800 rounded-lg p-6 min-h-[500px]">
        {renderSection()}
      </div>
    </div>
  )
} 