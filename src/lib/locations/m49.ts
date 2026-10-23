// UN M49 geographic regions (unstats.un.org/unsd/methodology/m49): continent →
// sub-region → countries. Sub-Saharan Africa and Latin America and the
// Caribbean use M49's intermediate regions (Eastern Africa, South America …),
// which are what managers search by. Country names follow the spelling
// profiles use ("Türkiye", "Côte d'Ivoire", "Vietnam").

export const M49: { continent: string; subRegions: { name: string; countries: string[] }[] }[] = [
  {
    continent: 'Africa',
    subRegions: [
      { name: 'Northern Africa', countries: ['Algeria', 'Egypt', 'Libya', 'Morocco', 'Sudan', 'Tunisia', 'Western Sahara'] },
      {
        name: 'Eastern Africa',
        countries: [
          'Burundi', 'Comoros', 'Djibouti', 'Eritrea', 'Ethiopia', 'Kenya', 'Madagascar', 'Malawi', 'Mauritius',
          'Mozambique', 'Rwanda', 'Seychelles', 'Somalia', 'South Sudan', 'Tanzania', 'Uganda', 'Zambia', 'Zimbabwe',
        ],
      },
      {
        name: 'Middle Africa',
        countries: [
          'Angola', 'Cameroon', 'Central African Republic', 'Chad', 'Congo', 'Democratic Republic of the Congo',
          'Equatorial Guinea', 'Gabon', 'São Tomé and Príncipe',
        ],
      },
      { name: 'Southern Africa', countries: ['Botswana', 'Eswatini', 'Lesotho', 'Namibia', 'South Africa'] },
      {
        name: 'Western Africa',
        countries: [
          'Benin', 'Burkina Faso', 'Cabo Verde', "Côte d'Ivoire", 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
          'Liberia', 'Mali', 'Mauritania', 'Niger', 'Nigeria', 'Senegal', 'Sierra Leone', 'Togo',
        ],
      },
    ],
  },
  {
    continent: 'Americas',
    subRegions: [
      {
        name: 'Caribbean',
        countries: [
          'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Cuba', 'Dominica', 'Dominican Republic', 'Grenada', 'Haiti',
          'Jamaica', 'Puerto Rico', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
          'Trinidad and Tobago',
        ],
      },
      {
        name: 'Central America',
        countries: ['Belize', 'Costa Rica', 'El Salvador', 'Guatemala', 'Honduras', 'Mexico', 'Nicaragua', 'Panama'],
      },
      {
        name: 'South America',
        countries: [
          'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana', 'Paraguay', 'Peru', 'Suriname',
          'Uruguay', 'Venezuela',
        ],
      },
      { name: 'Northern America', countries: ['Canada', 'United States'] },
    ],
  },
  {
    continent: 'Asia',
    subRegions: [
      { name: 'Central Asia', countries: ['Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Uzbekistan'] },
      { name: 'Eastern Asia', countries: ['China', 'Hong Kong', 'Japan', 'Mongolia', 'North Korea', 'South Korea', 'Taiwan'] },
      {
        name: 'South-eastern Asia',
        countries: [
          'Brunei', 'Cambodia', 'Indonesia', 'Laos', 'Malaysia', 'Myanmar', 'Philippines', 'Singapore', 'Thailand',
          'Timor-Leste', 'Vietnam',
        ],
      },
      {
        name: 'Southern Asia',
        countries: ['Afghanistan', 'Bangladesh', 'Bhutan', 'India', 'Iran', 'Maldives', 'Nepal', 'Pakistan', 'Sri Lanka'],
      },
      {
        name: 'Western Asia',
        countries: [
          'Armenia', 'Azerbaijan', 'Bahrain', 'Cyprus', 'Georgia', 'Iraq', 'Israel', 'Jordan', 'Kuwait', 'Lebanon',
          'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Syria', 'Türkiye', 'United Arab Emirates', 'Yemen',
        ],
      },
    ],
  },
  {
    continent: 'Europe',
    subRegions: [
      {
        name: 'Eastern Europe',
        countries: ['Belarus', 'Bulgaria', 'Czechia', 'Hungary', 'Moldova', 'Poland', 'Romania', 'Russia', 'Slovakia', 'Ukraine'],
      },
      {
        name: 'Northern Europe',
        countries: [
          'Denmark', 'Estonia', 'Finland', 'Iceland', 'Ireland', 'Latvia', 'Lithuania', 'Norway', 'Sweden', 'United Kingdom',
        ],
      },
      {
        name: 'Southern Europe',
        countries: [
          'Albania', 'Andorra', 'Bosnia and Herzegovina', 'Croatia', 'Greece', 'Italy', 'Kosovo', 'Malta', 'Montenegro',
          'North Macedonia', 'Portugal', 'San Marino', 'Serbia', 'Slovenia', 'Spain',
        ],
      },
      {
        name: 'Western Europe',
        countries: ['Austria', 'Belgium', 'France', 'Germany', 'Liechtenstein', 'Luxembourg', 'Monaco', 'Netherlands', 'Switzerland'],
      },
    ],
  },
  {
    continent: 'Oceania',
    subRegions: [
      { name: 'Australia and New Zealand', countries: ['Australia', 'New Zealand'] },
      { name: 'Melanesia', countries: ['Fiji', 'Papua New Guinea', 'Solomon Islands', 'Vanuatu'] },
      { name: 'Micronesia', countries: ['Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'Palau'] },
      { name: 'Polynesia', countries: ['Samoa', 'Tonga', 'Tuvalu'] },
    ],
  },
]

/** Other spellings profiles may use, mapped to the table's name. */
const COUNTRY_ALIASES: Record<string, string> = {
  USA: 'United States',
  'United States of America': 'United States',
  UK: 'United Kingdom',
  Turkey: 'Türkiye',
  'Ivory Coast': "Côte d'Ivoire",
  'Viet Nam': 'Vietnam',
  DRC: 'Democratic Republic of the Congo',
  'DR Congo': 'Democratic Republic of the Congo',
  'Republic of the Congo': 'Congo',
  'East Timor': 'Timor-Leste',
  Swaziland: 'Eswatini',
  'Cape Verde': 'Cabo Verde',
  Burma: 'Myanmar',
  'Czech Republic': 'Czechia',
}

const BY_COUNTRY = new Map(
  M49.flatMap(({ continent, subRegions }) =>
    subRegions.flatMap(({ name, countries }) => countries.map((c) => [c, { subRegion: name, continent }] as const)),
  ),
)

/** The sub-region and continent of a country, or null when it isn't listed. */
export function regionOf(country: string): { subRegion: string; continent: string } | null {
  return BY_COUNTRY.get(COUNTRY_ALIASES[country] ?? country) ?? null
}

export const CONTINENT_ORDER = M49.map((c) => c.continent)
