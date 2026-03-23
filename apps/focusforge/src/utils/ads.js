import { InterstitialAd, BannerAd, BannerAdSize, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { getSettings } from './storage';

const INTERSTITIAL_ID = __DEV__ ? TestIds.INTERSTITIAL : TestIds.INTERSTITIAL; // TODO: replace after launch
const BANNER_ID = __DEV__ ? TestIds.BANNER : TestIds.BANNER; // TODO: replace after launch

let interstitial = null;
let interstitialLoaded = false;

export function loadInterstitial() {
  interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);
  interstitial.addAdEventListener(AdEventType.LOADED, () => { interstitialLoaded = true; });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => { interstitialLoaded = false; loadInterstitial(); });
  interstitial.addAdEventListener(AdEventType.ERROR, (e) => { interstitialLoaded = false; });
  interstitial.load();
}

export async function showInterstitial() {
  // Skip ads for pro users
  try {
    const settings = await getSettings();
    if (settings.isPro) return false;
  } catch (e) {}
  if (interstitialLoaded && interstitial) { interstitial.show(); return true; }
  return false;
}

export { BannerAd, BannerAdSize, TestIds };
export const BANNER_UNIT_ID = BANNER_ID;
