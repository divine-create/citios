export interface ServicesVerticalConfig {
  enableBooking: boolean;            // Allow direct booking modal / "Book Pro" button
  enableDirectChat: boolean;         // Allow direct WhatsApp chat / contact
  enableReviews: boolean;            // Allow resident reviews and ratings
  enableLikes: boolean;              // Allow resident likes/bookmarks
  enableProviderOnboarding: boolean; // Show the "Run a skilled trade business?" CTA
  requireAdminVerification: boolean; // Only display verified badge if admin verified the org
  verifiedOrgIds: string[];          // List of Organization IDs explicitly verified by Admin
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SERVICES_CONFIG: ServicesVerticalConfig = {
  enableBooking: false,              // Disabled for now as instructed
  enableDirectChat: true,
  enableReviews: true,
  enableLikes: true,
  enableProviderOnboarding: true,
  requireAdminVerification: true,
  verifiedOrgIds: [],                // Empty by default: no fake verifications!
};
