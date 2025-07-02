'use client'

import { useState } from 'react'
import { useDebugBorders } from '../../../hooks/useDebugBorders'
import AdminParticipants from './AdminParticipants'
import AdminEvents from './AdminEvents'
import AdminSettings from './AdminSettings'

type AdminSection = 'participants' | 'events' | 'settings'

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>('participants')
  
  // Debug borders hook - Ctrl/Cmd + B to toggle
  useDebugBorders()

  const sections = [
    { id: 'participants' as AdminSection, label: 'Participants', icon: '👥' },
    { id: 'events' as AdminSection, label: 'Events', icon: '🎯' },
    { id: 'settings' as AdminSection, label: 'Settings', icon: '⚙️' },
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'participants':
        return <AdminParticipants />
      case 'events':
        return <AdminEvents />
      case 'settings':
        return <AdminSettings />
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
      <div className="bg-gray-800 rounded-lg p-6">
        {renderSection()}
      </div>
    </div>
  )
} 