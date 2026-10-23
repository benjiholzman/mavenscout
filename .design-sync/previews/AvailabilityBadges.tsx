import { AvailabilityBadges } from 'mavenscout'
import type { Profile } from '../../src/types/db'

function withAvailability(part_time: Profile['part_time_availability'], full_time: Profile['full_time_availability']): Profile {
  return {
    id: '0', user_id: null, consultant_type: 'Individual', handle: 'x', name: 'x', headline: '',
    location: null, career_level: null, year_founded: null, contracting_work_eligibility: null,
    work_types: [], part_time_availability: part_time, full_time_availability: full_time,
    availability_updated_at: null, photo_url: null, cover_image_url: null, resume_path: null,
    resume_url: null, detailed_bio: null, tiered_expertise: [], accreditations: [],
    spoken_languages: [], work_history: [], education_history: [], additional_experience: [],
    website_name: null, website_url: null, social_links: [], is_premium: false,
    custom_domain: null, subscription_status: 'active',
    approval_status: 'approved', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  }
}

export function AvailableNowAndFuture() {
  return (
    <AvailabilityBadges
      profile={withAvailability(
        { status: 'available_now', from: null, until: '2026-05-01' },
        { status: 'available_from', from: '2026-08-01', until: null },
      )}
    />
  )
}

export function BothUnavailable() {
  return (
    <AvailabilityBadges
      profile={withAvailability(
        { status: 'unavailable', from: null, until: null },
        { status: 'unavailable', from: null, until: null },
      )}
    />
  )
}

export function BothAvailableNow() {
  return (
    <AvailabilityBadges
      profile={withAvailability(
        { status: 'available_now', from: null, until: null },
        { status: 'available_now', from: null, until: '2027-03-01' },
      )}
    />
  )
}
