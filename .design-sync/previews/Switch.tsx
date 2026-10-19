import { useState } from 'react'
import { Switch } from 'mavenscout'

export function Off() {
  const [checked, setChecked] = useState(false)
  return <Switch checked={checked} onChange={setChecked} label="Verified only" />
}

export function On() {
  const [checked, setChecked] = useState(true)
  return <Switch checked={checked} onChange={setChecked} label="Verified only" />
}

export function InFilterBar() {
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [remoteOnly, setRemoteOnly] = useState(false)
  return (
    <div className="flex items-center gap-4 rounded-card border border-line bg-white p-3">
      <Switch checked={verifiedOnly} onChange={setVerifiedOnly} label="Verified only" />
      <Switch checked={remoteOnly} onChange={setRemoteOnly} label="Remote only" />
    </div>
  )
}
