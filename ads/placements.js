/**
 * VibeVerse future AdSense placements.
 *
 * Not loaded by the production site. AdSense account/site approval must be
 * confirmed, and each feed-specific data-ad-slot must be obtained from Google
 * before enabling. This module must not generate demo ads or incentivize clicks.
 */
export const ADS = Object.freeze({
  publisherId: "ca-pub-3767027718493089",
  enabled: false, // flip only after site approval, privacy review and implementation test
  minContentItems: 8,
  spacing: 8, // keep >=3 organic feed items between in-feed placements
  slots: {
    photoFeed: null, // AdSense In-feed ad unit ID (not your In-article unit)
    videoFeed: null  // Review responsive design/policy before enabling
  }
});

export function canInsertInFeed({ approved, consentOk, slot, itemCount }) {
  return ADS.enabled === true &&
    approved === true &&
    consentOk === true &&
    /^\\d{6,20}$/.test(String(slot || "")) &&
    Number.isInteger(itemCount) &&
    itemCount >= ADS.minContentItems;
}

/**
 * Return an empty string unless site is approved, consent is resolved, and a
 * verified ad slot is configured. Caller must render this *inside the feed*
 * between organic posts, NOT on top of video controls or in private messages.
 */
export function createAdPlacement({ approved = false, consentOk = false, slot = null, itemCount = 0 } = {}) {
  if (!canInsertInFeed({ approved, consentOk, slot, itemCount })) return "";
  return '<div class="vv-ad-placement" role="complementary" aria-label="Advertisements">' +
    '<div class="vv-ad-label">Advertisements</div>' +
    '<ins class="adsbygoogle" style="display:block" data-ad-format="fluid" data-ad-layout-key="" data-ad-client="' +
    ADS.publisherId + '" data-ad-slot="' + String(slot) + '"></ins></div>';
}

// IMPORTANT: do not call adsbygoogle.push() until Google provides the actual
// in-feed code/settings (including any required layout key). Reuse that exact
// Google code; do not modify ad code, auto-refresh it or imitate ad clicks.
