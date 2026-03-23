import {
  initConnection,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap';

const PRO_PRODUCT_ID = 'focusforge_pro';

let purchaseUpdateSub = null;
let purchaseErrorSub = null;

export async function initIAP() {
  try { await initConnection(); return true; }
  catch (e) { console.warn('IAP init:', e?.message); return false; }
}

export async function getProProducts() {
  try { return await getProducts({ skus: [PRO_PRODUCT_ID] }); }
  catch (e) { return []; }
}

export async function purchasePro() {
  await requestPurchase({ skus: [PRO_PRODUCT_ID] });
}

export async function checkProStatus() {
  try {
    const purchases = await getAvailablePurchases();
    return purchases.some(p => p.productId === PRO_PRODUCT_ID && p.transactionReceipt);
  } catch (e) { return false; }
}

export function setupPurchaseListeners(onSuccess) {
  purchaseUpdateSub = purchaseUpdatedListener(async (purchase) => {
    if (purchase.transactionReceipt) {
      await finishTransaction({ purchase, isConsumable: false });
      if (onSuccess) onSuccess(true);
    }
  });
  purchaseErrorSub = purchaseErrorListener((e) => {
    if (e.code !== 'E_USER_CANCELLED') console.warn('Purchase error:', e?.message);
  });
}

export function removePurchaseListeners() {
  purchaseUpdateSub?.remove();
  purchaseErrorSub?.remove();
}

export { PRO_PRODUCT_ID };
