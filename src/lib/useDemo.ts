"use client";
import { useEffect, useState } from "react";
import { adoptShopFromUrl, getShopName } from "@/lib/brand";
import { ensureSeed, loadOrders, loadSms, type Order, type Sms } from "@/lib/store";

/* every screen reads through this, so the staff screen and the phone always agree.
   It also updates across browser tabs. */
export function useDemo() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sms, setSms] = useState<Sms[]>([]);
  const [shop, setShop] = useState("");
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    adoptShopFromUrl();
    ensureSeed();
    const sync = () => {
      setOrders(loadOrders());
      setSms(loadSms());
      setShop(getShopName());
      setNow(Date.now());
      setReady(true);
    };
    sync();
    const tick = window.setInterval(() => setNow(Date.now()), 30000);
    window.addEventListener("laundry:update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("laundry:update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { orders, sms, shop, ready, now };
}
