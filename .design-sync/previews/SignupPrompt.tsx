import { SignupPrompt } from 'mavenscout'

export function Default() {
  return <SignupPrompt open onClose={() => {}} feature="Saving candidates to a shortlist" />
}

export function ForVideoQnA() {
  return <SignupPrompt open onClose={() => {}} feature="Watching Premium Video Q&As" />
}
