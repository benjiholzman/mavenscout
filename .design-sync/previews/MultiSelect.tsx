import { useState } from 'react'
import { MultiSelect, type OptionGroup } from 'mavenscout'

const TYPE_OPTIONS = ['Individual', 'Small Firm', 'Large Firm']

const EXPERTISE_GROUPS: OptionGroup[] = [
  { label: 'Monitoring, Evaluation & Learning', items: ['M&E Design', 'Impact Evaluation', 'Data Systems'] },
  { label: 'Governance', items: ['Public Financial Management', 'Anti-Corruption', 'Decentralization'] },
  { label: 'Gender & Social Inclusion', items: ['Gender Mainstreaming', 'Gender-Based Violence'] },
]

export function Closed() {
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  return <MultiSelect label="Type" options={TYPE_OPTIONS} selected={selected} onChange={setSelected} open={open} onToggle={setOpen} />
}

export function ClosedWithSelections() {
  const [selected, setSelected] = useState<string[]>(['Individual', 'Small Firm'])
  const [open, setOpen] = useState(false)
  return <MultiSelect label="Type" options={TYPE_OPTIONS} selected={selected} onChange={setSelected} open={open} onToggle={setOpen} />
}

export function OpenFlatOptions() {
  const [selected, setSelected] = useState<string[]>(['Small Firm'])
  const [open, setOpen] = useState(true)
  return (
    <div className="pb-72">
      <MultiSelect label="Type" options={TYPE_OPTIONS} selected={selected} onChange={setSelected} open={open} onToggle={setOpen} />
    </div>
  )
}

export function OpenGroupedOptions() {
  const [selected, setSelected] = useState<string[]>(['M&E Design'])
  const [open, setOpen] = useState(true)
  return (
    <div className="pb-96">
      <MultiSelect
        label="Domain Expertise"
        groups={EXPERTISE_GROUPS}
        selectableGroup
        selected={selected}
        onChange={setSelected}
        open={open}
        onToggle={setOpen}
      />
    </div>
  )
}

export function Disabled() {
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  return (
    <MultiSelect
      label="Career Level"
      options={['Early Career', 'Mid-Career', 'Senior']}
      selected={selected}
      onChange={setSelected}
      disabled
      disabledNote="Career level applies to individuals — it doesn't apply when filtering firms only"
      open={open}
      onToggle={setOpen}
    />
  )
}
