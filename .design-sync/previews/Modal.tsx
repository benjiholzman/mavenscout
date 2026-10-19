import { Modal } from 'mavenscout'

export function Default() {
  return (
    <Modal open onClose={() => {}} title="Availability">
      <p className="text-sm leading-relaxed text-ink-soft">
        Let hiring managers know when you can start part-time or full-time work.
      </p>
    </Modal>
  )
}

export function Wide() {
  return (
    <Modal open onClose={() => {}} title="Rank by Job Description" wide>
      <p className="text-sm leading-relaxed text-ink-soft">
        Paste a job description and MavenScout will rank the directory against it, with a
        weighted breakdown across domain expertise, skills, career level, and availability.
      </p>
    </Modal>
  )
}
