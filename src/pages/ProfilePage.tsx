import { useParams } from 'react-router-dom'
import { ProfileView } from '../components/profile/ProfileView'
import { ProfileSkeleton } from '../components/ui/Skeletons'
import { useProfile } from '../hooks/useProfile'
import NotFound from './NotFound'

/** /profile/:handle — the profile as seen from the MavenScout directory.
 *  Availability shown; the Video Q&As tab (Featured) and the audio
 *  testimonials inline on employer entries and portfolio items are
 *  login-gated (PRD 7.2a). */
export default function ProfilePage() {
  const { handle } = useParams()
  const { data, notFound, error } = useProfile(handle)

  if (notFound) return <NotFound />
  if (error)
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-red-600">Couldn't load this profile: {error}</p>
      </div>
    )
  if (!data) return <ProfileSkeleton />
  return <ProfileView data={data} surface="platform" />
}
