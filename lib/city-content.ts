// Presentation copy for the resident home surface (greeting, placeholder
// text). Structured so nothing is pinned to one city: UI text that names
// the city is derived from the active City record at render time.
export const CITY_NOTES = {
  weather: { temp: '29°C', note: 'Warm sun, afternoon showers', label: 'Partly cloudy' },
  topPickTitle: 'Popular around you',
  aiPlaceholder: 'Ask CityOS — e.g. “best room under ₦10,000 tonight”',
  demoDisclaimer:
    'Welcome to CityOS, the digital operating system for your city.',
};

/** City-specific banner line shown above the feed on the home screen. */
export function cityTagline(cityName: string) {
  return `It's market day in ${cityName}.`;
}
