// Canonical vocabularies for the demo seed (and for later migrations).
//
// Locations are "City, Country". Country names are common English short names
// (CLDR-style): "United States", "United Kingdom", "Vietnam", "Tanzania",
// "Côte d'Ivoire", "Democratic Republic of the Congo", "Türkiye", "Palestine".
// Each maps to its UN M49 sub-region (Melanesia stands in for Oceania).
// Languages are standard English names.

export const COUNTRIES = {
  // Western Africa
  Benin: 'Western Africa', 'Burkina Faso': 'Western Africa', 'Cabo Verde': 'Western Africa',
  "Côte d'Ivoire": 'Western Africa', Gambia: 'Western Africa', Ghana: 'Western Africa',
  Guinea: 'Western Africa', Liberia: 'Western Africa', Mali: 'Western Africa',
  Niger: 'Western Africa', Nigeria: 'Western Africa', Senegal: 'Western Africa',
  'Sierra Leone': 'Western Africa', Togo: 'Western Africa',
  // Eastern Africa
  Burundi: 'Eastern Africa', Ethiopia: 'Eastern Africa', Kenya: 'Eastern Africa',
  Madagascar: 'Eastern Africa', Malawi: 'Eastern Africa', Mozambique: 'Eastern Africa',
  Rwanda: 'Eastern Africa', Somalia: 'Eastern Africa', 'South Sudan': 'Eastern Africa',
  Tanzania: 'Eastern Africa', Uganda: 'Eastern Africa', Zambia: 'Eastern Africa',
  Zimbabwe: 'Eastern Africa',
  // Middle Africa
  Angola: 'Middle Africa', Cameroon: 'Middle Africa', 'Central African Republic': 'Middle Africa',
  Chad: 'Middle Africa', 'Democratic Republic of the Congo': 'Middle Africa',
  // Southern Africa
  Botswana: 'Southern Africa', Eswatini: 'Southern Africa', Lesotho: 'Southern Africa',
  Namibia: 'Southern Africa', 'South Africa': 'Southern Africa',
  // Northern Africa
  Algeria: 'Northern Africa', Egypt: 'Northern Africa', Libya: 'Northern Africa',
  Morocco: 'Northern Africa', Sudan: 'Northern Africa', Tunisia: 'Northern Africa',
  // Western Asia
  Armenia: 'Western Asia', Georgia: 'Western Asia', Iraq: 'Western Asia', Jordan: 'Western Asia',
  Lebanon: 'Western Asia', Palestine: 'Western Asia', Syria: 'Western Asia',
  'Türkiye': 'Western Asia', Yemen: 'Western Asia',
  // Southern Asia
  Afghanistan: 'Southern Asia', Bangladesh: 'Southern Asia', Bhutan: 'Southern Asia',
  India: 'Southern Asia', Nepal: 'Southern Asia', Pakistan: 'Southern Asia', 'Sri Lanka': 'Southern Asia',
  // South-eastern Asia
  Cambodia: 'South-eastern Asia', Indonesia: 'South-eastern Asia', Laos: 'South-eastern Asia',
  Malaysia: 'South-eastern Asia', Myanmar: 'South-eastern Asia', Philippines: 'South-eastern Asia',
  Singapore: 'South-eastern Asia', Thailand: 'South-eastern Asia', 'Timor-Leste': 'South-eastern Asia',
  Vietnam: 'South-eastern Asia',
  // Central Asia
  Kazakhstan: 'Central Asia', Kyrgyzstan: 'Central Asia', Tajikistan: 'Central Asia', Uzbekistan: 'Central Asia',
  // South America
  Argentina: 'South America', Bolivia: 'South America', Brazil: 'South America', Chile: 'South America',
  Colombia: 'South America', Ecuador: 'South America', Paraguay: 'South America', Peru: 'South America',
  // Central America
  'Costa Rica': 'Central America', 'El Salvador': 'Central America', Guatemala: 'Central America',
  Honduras: 'Central America', Mexico: 'Central America', Nicaragua: 'Central America', Panama: 'Central America',
  // Caribbean
  'Dominican Republic': 'Caribbean', Haiti: 'Caribbean', Jamaica: 'Caribbean',
  // Northern America
  Canada: 'Northern America', 'United States': 'Northern America',
  // Europe
  Denmark: 'Northern Europe', Estonia: 'Northern Europe', Finland: 'Northern Europe',
  Ireland: 'Northern Europe', Norway: 'Northern Europe', Sweden: 'Northern Europe',
  'United Kingdom': 'Northern Europe',
  Belgium: 'Western Europe', France: 'Western Europe', Germany: 'Western Europe',
  Netherlands: 'Western Europe', Switzerland: 'Western Europe',
  Italy: 'Southern Europe', Portugal: 'Southern Europe', Spain: 'Southern Europe',
  Poland: 'Eastern Europe', Ukraine: 'Eastern Europe',
  // Oceania
  Fiji: 'Melanesia', 'Papua New Guinea': 'Melanesia', 'Solomon Islands': 'Melanesia',
}

export const LANGUAGES = [
  'Afrikaans', 'Amharic', 'Arabic', 'Aymara', 'Bambara', 'Bengali', 'Burmese', 'Cebuano', 'Dari',
  'Dutch', 'English', 'Estonian', 'Fijian', 'Filipino', 'French', 'Fula', 'German', 'Gujarati',
  'Haitian Creole', 'Hausa', 'Hindi', 'Igbo', 'Indonesian', 'Italian', 'Javanese', 'Kannada',
  "K'iche'", 'Khmer', 'Kinyarwanda', 'Krio', 'Kurdish', 'Kyrgyz', 'Lingala', 'Luganda', 'Mandarin',
  'Mooré', 'Nepali', 'Oromo', 'Pashto', 'Portuguese', 'Punjabi', 'Quechua', 'Russian', 'Sindhi',
  'Sinhala', 'Somali', 'Sotho', 'Spanish', 'Swahili', 'Tamazight', 'Tamil', 'Tetum', 'Thai',
  'Tigrinya', 'Tok Pisin', 'Tsonga', 'Tswana', 'Turkish', 'Twi', 'Ukrainian', 'Urdu', 'Uzbek',
  'Vietnamese', 'Wolof', 'Xhosa', 'Yoruba', 'Zulu',
]

// Region targets for the 100 synthetic profiles (±1 tolerated per group).
// Europe is one group across its four M49 sub-regions.
export const REGION_TARGETS = {
  'Western Africa': 12, 'Eastern Africa': 12, 'Middle Africa': 4, 'Southern Africa': 3,
  'Southern Asia': 13, 'South-eastern Asia': 11,
  'South America': 8, 'Central America': 4, Caribbean: 2,
  'Northern Africa': 5, 'Western Asia': 6,
  'Northern America': 6, Europe: 10, 'Central Asia': 2, Melanesia: 2,
}

export const regionGroup = (subregion) => (subregion.endsWith('Europe') ? 'Europe' : subregion)

// Work-history logos: only the domains hand-verified in
// supabase/004_portfolio_org_and_logos.sql, matched by organization-name
// prefix. Anything else shows initials.
export const LOGO_PREFIXES = [
  ['Palladium', 'thepalladiumgroup.com'],
  ['UN Women', 'unwomen.org'],
  ['Innovations for Poverty Action', 'poverty-action.org'],
  ['UNESCO', 'unesco.org'],
  ['World Health Organization', 'who.int'],
  ['WHO ', 'who.int'],
  ['World Bank', 'worldbank.org'],
  ['Asian Development Bank', 'adb.org'],
  ['UNICEF', 'unicef.org'],
  ['UNHCR', 'unhcr.org'],
  ['International Rescue Committee', 'rescue.org'],
  ['UNDP', 'undp.org'],
  ['GIZ', 'giz.de'],
  ['IFC', 'ifc.org'],
  ['J-PAL', 'povertyactionlab.org'],
  ['USAID', 'usaid.gov'],
  ['Search for Common Ground', 'sfcg.org'],
  ['BRAC', 'brac.net'],
  ['AECOM', 'aecom.com'],
]
