import { RowsSkeleton } from 'mavenscout'

export function Default() {
  return (
    <div className="w-[360px]">
      <RowsSkeleton />
    </div>
  )
}

export function TwoRows() {
  return (
    <div className="w-[360px]">
      <RowsSkeleton rows={2} />
    </div>
  )
}
