import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { getSettings } from './storage';

const REWARDED_ID = __DEV__ ? TestIds.REWARDED : TestIds.REWARDED; // TODO: replace after launch

let rewarded = null;
let rewardedLoaded = false;
let onRewardCallback = null;

export function loadRewarded() {
  rewarded = RewardedAd.createForAdRequest(REWARDED_ID);
  rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => { rewardedLoaded = true; });
  rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    if (onRewardCallback) onRewardCallback();
  });
  rewarded.addAdEventListener('closed', () => {
    rewardedLoaded = false;
    loadRewarded();
  });
  rewarded.load();
}

export async function showRewardedAd(onReward) {
  const settings = await getSettings();
  if (settings.isPro) {
    onReward();
    return true;
  }
  if (rewardedLoaded && rewarded) {
    onRewardCallback = onReward;
    rewarded.show();
    return true;
  }
  // Ad not loaded, let them through anyway
  onReward();
  return false;
}

export function isAdReady() { return rewardedLoaded; }
