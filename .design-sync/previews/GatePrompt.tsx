import { GatePrompt } from 'mavenscout'

export function Default() {
  return (
    <div className="w-[420px]">
      <GatePrompt what="listen to audio testimonials" />
    </div>
  )
}

export function VideoQnA() {
  return (
    <div className="w-[420px]">
      <GatePrompt what="watch Premium Video Q&As" />
    </div>
  )
}
