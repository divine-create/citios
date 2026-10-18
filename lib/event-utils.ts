export const DEFAULT_EVENT_PLACEHOLDER_IMAGE = '/images/event-placeholder.svg';

export const EVENT_CATEGORIES = [
  'Festival & Carnival',
  'Music & Nightlife',
  'Food & Drink',
  'Tech & Business',
  'Community & Culture',
  'Sports & Wellness',
  'Religious & Faith',
  'Workshop & Class',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface ParsedEventDetails {
  summary: string;
  eventUrl: string | null;
  imageUrl: string;
  hasCustomImage: boolean;
  sourceName: string;
  category: string;
  hostPersonId: string | null;
  hostName: string | null;
}

/**
 * Extracts clean summary, external event/registration URL, event-specific image URL,
 * category, and individual host metadata from an Event's description field.
 * Uses the event's own picture if present; otherwise uses the single unified placeholder image.
 */
export function parseEventDescription(
  rawDescription?: string | null
): ParsedEventDetails {
  let text = (rawDescription || '').trim();
  let eventUrl: string | null = null;
  let imageUrl: string | null = null;
  let category = 'Event';
  let hostPersonId: string | null = null;
  let hostName: string | null = null;

  // 1. Extract EVENT_CATEGORY: ...
  const catMatch = text.match(/^EVENT_CATEGORY:\s*(.+)$/im);
  if (catMatch) {
    category = catMatch[1].trim();
    text = text.replace(catMatch[0], '').trim();
  }

  // 2. Extract HOST_PERSON_ID: ... and HOST_NAME: ...
  const hostIdMatch = text.match(/^HOST_PERSON_ID:\s*(\S+)$/im);
  if (hostIdMatch) {
    hostPersonId = hostIdMatch[1].trim();
    text = text.replace(hostIdMatch[0], '').trim();
  }

  const hostNameMatch = text.match(/^HOST_NAME:\s*(.+)$/im);
  if (hostNameMatch) {
    hostName = hostNameMatch[1].trim();
    text = text.replace(hostNameMatch[0], '').trim();
  }

  // 3. Extract IMAGE_URL: https://... or /uploads/... or data:image/...
  const imgMatch = text.match(/IMAGE_URL:\s*(\S+)/i);
  if (imgMatch) {
    imageUrl = imgMatch[1].trim();
    text = text.replace(imgMatch[0], '').trim();
  }

  // 4. Extract EVENT_URL / Registration Portal / Tickets & Reservations / Event Link
  const labeledUrlMatch = text.match(
    /(?:EVENT_URL|Event Link|Registration Portal|Tickets & Reservations|Ticket Link|Register Here):\s*(https?:\/\/\S+)/i
  );
  if (labeledUrlMatch) {
    eventUrl = labeledUrlMatch[1].trim();
    text = text.replace(labeledUrlMatch[0], '').trim();
  } else {
    const anyUrlMatch = text.match(/https?:\/\/[^\s)]+/i);
    if (anyUrlMatch) {
      eventUrl = anyUrlMatch[0].trim();
    }
  }

  let sourceName = 'Official Event Page';
  if (eventUrl) {
    if (eventUrl.includes('hitfmcalabar.com')) sourceName = 'Hit FM CECF Portal';
    else if (eventUrl.includes('eventbrite.com')) sourceName = 'Eventbrite';
    else if (eventUrl.includes('tix.africa')) sourceName = 'Tix.africa';
    else if (eventUrl.includes('allevents.in')) sourceName = 'AllEvents';
    else if (eventUrl.includes('carnivalcalabar')) sourceName = 'Carnival Calabar Portal';
    else if (eventUrl.includes('crossriverstate.gov.ng')) sourceName = 'Cross River State Portal';
    else if (eventUrl.includes('instagram.com')) sourceName = 'Instagram';
    else if (eventUrl.includes('facebook.com')) sourceName = 'Facebook Events';
  }

  return {
    summary: text.trim() || 'No description provided.',
    eventUrl,
    imageUrl: imageUrl || DEFAULT_EVENT_PLACEHOLDER_IMAGE,
    hasCustomImage: Boolean(imageUrl),
    sourceName,
    category,
    hostPersonId,
    hostName,
  };
}

