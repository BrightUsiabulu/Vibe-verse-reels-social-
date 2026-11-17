/**
 * VibeVerse AdSense placement preparation (not used by live pages).
 * Do not enable without Google site approval, proper consent where required,
 * real in-feed ad unit IDs and a tested responsive layout.
 */
export const AD_CONFIG = Object.freeze({
  publisher: "ca-pub-3767027718493089",
  enabled: false,
  approved: false,
  minimumOrganicPosts: 8,
  organicPostsBetweenAds: 8,
  photoFeedSlot: null, // obtain a Google AdSense "In-feed" slot ID
  videoFeedSlot: null  // enable only after verifying short-video suitability
});

/**
 * Policy-conscious placement planning. No markup is generated until approved
 * Google ad-unit code and an appropriate feed layout are supplied.
 */
export function getInFeedPlacementIndexes(postCount, {
  enabled = AD_CONFIG.enabled,
  approved = AD_CONFIG.approved,
  slot = AD_CONFIG.photoFeedSlot,
  consentOk = false
} = {}) {
  if (!enabled || !approved || !consentOk ||
      !/^\d{6,20}$/.test(String(slot ?? "")) ||
      !Number.isInteger(postCount) ||
      postCount < AD_CONFIG.minimumOrganicPosts) return [];

  const indexes = [];
  // Zero-based positions after 8, 16, 24 ... real organic posts.
  for (let n = AD_CONFIG.organicPostsBetweenAds;
       n < postCount;
       n += AD_CONFIG.organicPostsBetweenAds) indexes.push(n);
  return indexes;
}

// Integration rules:
// - Place Google's exact In-feed code between organic feed items, never in DMs.
// - Label ad containers "Advertisements", without misleading buttons.
// - Never call ad refresh timers or simulate ad views/clicks.
// - Never use the existing In-article ad slot as an In-feed slot.
// - For an Android/iOS native app, separately assess AdMob and app-store rules.
