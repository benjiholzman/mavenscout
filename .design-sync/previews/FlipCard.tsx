import { FlipCard } from 'mavenscout'
import type { Profile, PortfolioItem, VideoResponse } from '../../src/types/db'

// Realistic data lifted from this repo's own seed set
// (supabase/002_seed_profiles.sql) — not invented placeholders.

function baseProfile(overrides: Partial<Profile>): Profile {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: null,
    consultant_type: 'Individual',
    handle: 'preview',
    name: 'Preview',
    headline: '',
    location: null,
    career_level: null,
    year_founded: null,
    contracting_work_eligibility: null,
    work_types: [],
    part_time_availability: { status: 'unavailable', from: null, until: null },
    full_time_availability: { status: 'unavailable', from: null, until: null },
    availability_updated_at: null,
    photo_url: null,
    cover_image_url: null,
    resume_path: null,
    resume_url: null,
    detailed_bio: null,
    expertise: [],
    skills: [],
    tiered_expertise: [],
    accreditations: [],
    languages: [],
    work_history: [],
    education_history: [],
    additional_experience: [],
    website_name: null,
    website_url: null,
    social_links: [],
    is_premium: false,
    verification_status: 'unverified',
    custom_domain: null,
    subscription_status: 'active',
    approval_status: 'approved',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const amara = baseProfile({
  id: '388093d4-21e1-413a-a718-4296a10a44fc',
  handle: 'amara-diallo',
  name: 'Amara Diallo',
  headline: 'M&E Specialist | Gender & Social Inclusion | USAID & FCDO Programs',
  location: 'Nairobi, Kenya',
  career_level: 'mid_career',
  work_types: ['Remote', 'Hybrid'],
  part_time_availability: { status: 'available_now', from: null, until: '2026-05-01' },
  full_time_availability: { status: 'available_from', from: '2026-08-01', until: null },
  photo_url: 'https://i.pravatar.cc/150?u=amara-diallo',
  cover_image_url: 'https://picsum.photos/seed/amara-diallo/800/200',
  expertise: [
    { name: 'Gender Mainstreaming', tier: 'primary', level: 'item' },
    { name: 'Gender-Based Violence', tier: 'primary', level: 'item' },
  ],
  skills: [
    { name: 'Monitoring & Evaluation', tier: 'primary', level: 'item' },
    { name: 'Qualitative Research', tier: 'primary', level: 'item' },
  ],
  tiered_expertise: [
    { name: 'Gender Mainstreaming', tier: 'core' },
    { name: 'Gender-Based Violence', tier: 'core' },
    { name: 'Monitoring & Evaluation', tier: 'core' },
    { name: 'Qualitative Research', tier: 'strong' },
    { name: 'Survey Design', tier: 'strong' },
    { name: 'Statistical Analysis', tier: 'strong' },
  ],
  work_history: [
    {
      organization: 'Palladium Group',
      role: 'Senior M&E Advisor',
      start_year: 2021,
      end_year: 2024,
      logo_url: null,
      description: 'Led MEAL functions for a $45M FCDO governance program across four East African countries.',
    },
    {
      organization: 'UN Women',
      role: 'M&E Consultant',
      start_year: 2018,
      end_year: 2021,
      logo_url: null,
      description: 'Designed data systems and conducted mid-term evaluations for gender equality programs.',
    },
  ],
  is_premium: true,
  verification_status: 'verified',
})

const amaraPortfolio: PortfolioItem[] = [
  {
    id: 'p1',
    profile_id: amara.id,
    project_name: 'M&E Framework for USAID Youth Employment Program, Ghana',
    role: 'Lead M&E Specialist',
    description:
      'Designed a comprehensive performance monitoring plan with 42 indicators aligned to USAID CDCS priorities.',
    results: 'Framework adopted as the program’s system of record; 42 indicators tracked quarterly across 6 districts.',
    cover_image: 'https://picsum.photos/seed/amara-portfolio-1/600/400',
    images: [{ url: 'https://picsum.photos/seed/amara-portfolio-1-img1/900/600', caption: 'Baseline enumeration in Ashanti region' }],
    links: [{ label: 'Program page (USAID)', url: 'https://www.usaid.gov/ghana' }],
    sort_order: 1,
  },
]

const amaraIntro: VideoResponse = {
  id: 'v1',
  profile_id: amara.id,
  kind: 'intro',
  question_id: null,
  portfolio_item_id: null,
  video_url: null,
  video_path: 'intro.mp4',
  transcript: null,
  duration_seconds: 62,
}

const ifeoma = baseProfile({
  id: '27a9dee9-67c0-4867-9922-8746254e504a',
  consultant_type: 'Small Firm',
  handle: 'ifeoma-obi-and-associates',
  name: 'Ifeoma Obi & Associates',
  headline: 'Agricultural Development Boutique | Food Systems & Rural Finance | IFAD & FAO',
  location: 'Abuja, Nigeria',
  year_founded: 2016,
  work_types: ['Hybrid', 'On-site'],
  part_time_availability: { status: 'available_now', from: null, until: null },
  full_time_availability: { status: 'available_now', from: null, until: '2027-03-01' },
  photo_url: 'https://i.pravatar.cc/150?u=ifeoma-obi',
  cover_image_url: 'https://picsum.photos/seed/ifeoma-obi/800/200',
  expertise: [
    { name: 'Food Security', tier: 'primary', level: 'item' },
    { name: 'Agribusiness', tier: 'primary', level: 'item' },
  ],
  skills: [
    { name: 'Qualitative Research', tier: 'primary', level: 'item' },
    { name: 'Survey Design', tier: 'primary', level: 'item' },
  ],
  tiered_expertise: [
    { name: 'Food Security', tier: 'core' },
    { name: 'Agribusiness & Value Chains', tier: 'core' },
    { name: 'Qualitative Research', tier: 'core' },
    { name: 'Survey Design', tier: 'strong' },
    { name: 'Rural Development', tier: 'strong' },
    { name: 'Sustainable Agriculture', tier: 'strong' },
    { name: 'Financial Inclusion', tier: 'strong' },
    { name: 'Monitoring & Evaluation', tier: 'strong' },
  ],
  work_history: [
    {
      organization: 'IFAD',
      role: 'Value Chain Lead',
      start_year: 2020,
      end_year: null,
      logo_url: null,
      description: 'Smallholder rice value chain development across Kebbi and Ebonyi states.',
    },
  ],
  is_premium: true,
  verification_status: 'verified',
})

const ifeomaPortfolio: PortfolioItem[] = [
  {
    id: 'p2',
    profile_id: ifeoma.id,
    project_name: 'Smallholder Rice Value Chain Development, IFAD, Nigeria',
    role: 'Value Chain Lead',
    description: 'Designed market linkage models connecting 12,000 smallholder rice farmers to agro-processors and export buyers.',
    results: 'Value-chain program linked 12,000+ smallholders to structured off-take arrangements.',
    cover_image: 'https://picsum.photos/seed/ifeoma-portfolio-1/600/400',
    images: [{ url: 'https://picsum.photos/seed/ifeoma-portfolio-1-img1/900/600', caption: 'Smallholder rice cooperative, Nigeria' }],
    links: [{ label: 'IFAD', url: 'https://www.ifad.org/' }],
    sort_order: 1,
  },
]

const rohan = baseProfile({
  id: '382822da-2b19-45d6-8c2f-6296957fcdc4',
  handle: 'rohan-mehta',
  name: 'Rohan Mehta',
  headline: 'WASH & Climate Resilience Specialist | Delta & Coastal Systems | World Bank & UNICEF',
  location: 'Dhaka, Bangladesh',
  career_level: 'mid_career',
  work_types: ['Hybrid', 'On-site'],
  part_time_availability: { status: 'unavailable', from: null, until: null },
  full_time_availability: { status: 'available_from', from: '2026-11-01', until: null },
  photo_url: 'https://i.pravatar.cc/150?u=rohan-mehta',
  cover_image_url: 'https://picsum.photos/seed/rohan-mehta/800/200',
  expertise: [{ name: 'WASH', tier: 'primary', level: 'item' }],
  skills: [{ name: 'Project Management', tier: 'primary', level: 'item' }],
  tiered_expertise: [
    { name: 'WASH', tier: 'core' },
    { name: 'Project Management', tier: 'core' },
  ],
  work_history: [
    {
      organization: 'UNICEF Bangladesh',
      role: 'WASH Specialist (Consultant)',
      start_year: 2022,
      end_year: null,
      logo_url: null,
      description: 'Technical lead on climate-resilient WASH programming in cyclone-affected coastal districts.',
    },
  ],
  is_premium: false,
  verification_status: 'unverified',
})

export function Default() {
  return (
    <div className="w-[320px]">
      <FlipCard profile={amara} portfolio={amaraPortfolio} intro={amaraIntro} audioCount={2} onFavorite={() => {}} onTopPick={() => {}} />
    </div>
  )
}

export function Firm() {
  return (
    <div className="w-[320px]">
      <FlipCard profile={ifeoma} portfolio={ifeomaPortfolio} intro={null} audioCount={0} onFavorite={() => {}} onTopPick={() => {}} />
    </div>
  )
}

export function MinimalUnverified() {
  return (
    <div className="w-[320px]">
      <FlipCard profile={rohan} portfolio={[]} intro={null} audioCount={0} onFavorite={() => {}} onTopPick={() => {}} />
    </div>
  )
}
