export const DEFAULT_EVENT_PLACEHOLDER_IMAGE = '/images/event-placeholder.svg';

export interface ParsedEventDetails {
  summary: string;
  eventUrl: string | null;
  imageUrl: string;
  hasCustomImage: boolean;
  sourceName: string;
}

/**
 * Extracts clean summary, external event/registration URL, and event-specific image URL
 * from an Event's description field. Uses the event's own picture if present; otherwise
 * uses the single unified placeholder image.
 */
export function parseEventDescription(
  rawDescription?: string | null
): ParsedEventDetails {
  let text = (rawDescription || '').trim();
  let eventUrl: string | null = null;
  let imageUrl: string | null = null;

  // 1. Extract IMAGE_URL: https://...
  const imgMatch = text.match(/IMAGE_URL:\s*(\S+)/i);
  if (imgMatch) {
    imageUrl = imgMatch[1].trim();
    text = text.replace(imgMatch[0], '').trim();
  }

  // 2. Extract EVENT_URL / Registration Portal / Tickets & Reservations / Event Link
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
    summary: text || 'No description provided.',
    eventUrl,
    imageUrl: imageUrl || DEFAULT_EVENT_PLACEHOLDER_IMAGE,
    hasCustomImage: Boolean(imageUrl),
    sourceName,
  };
}
