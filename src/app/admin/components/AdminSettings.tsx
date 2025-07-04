'use client'

import { useState, useRef } from 'react'

export default function AdminSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Settings</h3>
      <div className="p-4 bg-gray-700 rounded-lg">
        <div className="text-gray-400">
          <p className="mb-2">Video square movement speed control has moved to the Events tab.</p>
          <p className="text-sm">Future settings will appear here.</p>
        </div>
      </div>
    </div>
  )
} 