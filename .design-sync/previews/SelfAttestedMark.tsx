import { SelfAttestedMark } from 'mavenscout'

export function Default() {
  return <SelfAttestedMark />
}

export function NextToSectionHeading() {
  return (
    <div className="flex items-baseline justify-between">
      <h4 className="font-display text-base font-semibold">Domain Expertise</h4>
      <SelfAttestedMark />
    </div>
  )
}
