import { OrgLogo } from 'mavenscout'

export function WithImage() {
  return <OrgLogo url="https://i.pravatar.cc/64?u=palladium-group-logo" name="Palladium Group" />
}

export function MonogramFallback() {
  return <OrgLogo url={null} name="UN Women" />
}

export function InPillComposition() {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-paper px-2 py-1 text-xs text-ink-soft">
      <OrgLogo url={null} name="Palladium Group" />
      <span className="truncate">Palladium Group</span>
    </span>
  )
}
