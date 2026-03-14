import React from 'react'
import { RecordingControls } from './components/RecordingControls'
import { SessionList } from './components/SessionList'
import { Settings } from './components/Settings'

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen select-none bg-slate-900 text-slate-100">
      <RecordingControls />
      <SessionList />
      <Settings />
    </div>
  )
}
