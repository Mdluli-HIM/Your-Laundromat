import { shop } from "@/data/shop";

const K = "laundry:shop";

export function getShopName() {
  try {
    return localStorage.getItem(K) || shop.defaultName;
  } catch {
    return shop.defaultName;
  }
}

export function setShopName(name: string) {
  try {
    if (name.trim()) localStorage.setItem(K, name.trim());
    else localStorage.removeItem(K);
  } catch {}
  window.dispatchEvent(new Event("laundry:update"));
}

/* a link like /demo?shop=Sparkle%20Laundry sets the name for a presentation */
export function adoptShopFromUrl() {
  try {
    const s = new URLSearchParams(location.search).get("shop");
    if (s) setShopName(s.slice(0, 40));
  } catch {}
}
