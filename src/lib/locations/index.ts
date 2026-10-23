import type { TreeNode } from '../tree'
import { CONTINENT_ORDER, regionOf } from './m49'

// Locations: sub-region → country → city (UN M49).
//
// The data source is placeOf(), which today parses the free-text
// profiles.location ("City, Country") and looks the country up in the M49
// table. When structured locations arrive (Mapbox country + city, after the
// Loop8 handoff), placeOf() is the one function to replace: the picker tree,
// filter values and matching below only ever see Place objects.
//
// Filter / requirement values (unchanged from the two-tier picker, so saved
// rows still load): a sub-region by its M49 name ("Western Africa"), a
// country by its name ("Nigeria"), a city by the full "City, Country" string
// ("Lagos, Nigeria"), so same-named cities in different countries never
// collide. A region includes all its countries; a country all its cities.

export interface Place {
  /** The value a city is selected by ("Lagos, Nigeria"); null for a bare country. */
  cityValue: string | null
  city: string | null
  country: string
  subRegion: string | null
  continent: string | null
}

/** A location string → a Place. Text source: the last comma-separated
 *  segment is the country, everything before it the city. */
export function placeOf(location: string | null | undefined): Place | null {
  const loc = location?.trim()
  if (!loc) return null
  const i = loc.lastIndexOf(',')
  const country = (i === -1 ? loc : loc.slice(i + 1)).trim()
  const city = i === -1 ? null : loc.slice(0, i).trim() || null
  const region = regionOf(country)
  return { cityValue: city ? loc : null, city, country, subRegion: region?.subRegion ?? null, continent: region?.continent ?? null }
}

/** Does a place satisfy any of the selected values? */
export function placeMatches(place: Place | null, selected: string[]): boolean {
  if (!place) return false
  return selected.some(
    (sel) => sel === place.cityValue || sel === place.country || (place.subRegion !== null && sel === place.subRegion),
  )
}

const OTHER = 'Other'

/** The picker tree for the places in the data: continents (headers, not
 *  selectable) → sub-regions → countries → cities. Countries missing from
 *  the M49 table sit under "Other" directly. */
export function buildLocationTree(places: Place[]): TreeNode[] {
  const continents = new Map<string, Map<string, Map<string, Set<string>>>>()
  for (const p of places) {
    const continent = p.continent ?? OTHER
    const sub = p.subRegion ?? ''
    const subs = continents.get(continent) ?? new Map()
    const countries = subs.get(sub) ?? new Map()
    const cities = countries.get(p.country) ?? new Set<string>()
    if (p.cityValue) cities.add(p.cityValue)
    countries.set(p.country, cities)
    subs.set(sub, countries)
    continents.set(continent, subs)
  }
  const byName = (a: string, b: string) => a.localeCompare(b)
  const countryNodes = (countries: Map<string, Set<string>>): TreeNode[] =>
    [...countries.keys()].sort(byName).map((country) => ({
      label: country,
      value: country,
      children: [...countries.get(country)!].sort(byName).map((v) => ({ label: placeOf(v)!.city ?? v, value: v })),
    }))
  const rank = (c: string) => (c === OTHER ? Infinity : CONTINENT_ORDER.indexOf(c))
  return [...continents.keys()]
    .sort((a, b) => rank(a) - rank(b))
    .map((continent) => {
      const subs = continents.get(continent)!
      return {
        label: continent,
        children: [...subs.keys()].sort(byName).flatMap((sub) =>
          sub ? [{ label: sub, value: sub, children: countryNodes(subs.get(sub)!) }] : countryNodes(subs.get(sub)!),
        ),
      }
    })
}
