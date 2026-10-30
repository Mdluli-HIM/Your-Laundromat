"use client";
import { useEffect, useMemo, useState } from "react";
import { adoptShopFromUrl, getShopName } from "@/lib/brand";
import {
  ensureSeed, getWho, loadAudit, loadCashups, loadExpenses, loadLoyalty, loadOrders, loadProfiles, loadSms,
  loadVouchers, runBirthdayCheck, seedVouchers, setHistory, vouchersSeeded,
  type Audit, type Cashup, type Expense, type Loyalty, type Order, type Profile, type Sms, type Voucher,
} from "@/lib/store";
import { buildHistory, EMPTY } from "@/lib/history";
import { DEFAULT_LOYALTY } from "@/lib/store";

/* every screen reads through this, so staff, owner and the phone always agree.
   `orders` is the live board. `all` also includes the sample history. */
export function useDemo() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sms, setSms] = useState<Sms[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashups, setCashups] = useState<Cashup[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [liveProfiles, setLiveProfiles] = useState<Record<string, Profile>>({});
  const [loyalty, setLoyalty] = useState<Loyalty>(DEFAULT_LOYALTY);
  const [who, setWho] = useState("Thandi");
  const [shop, setShop] = useState("");
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    adoptShopFromUrl();
    ensureSeed();
    const sync = () => {
      setOrders(loadOrders());
      setSms(loadSms());
      setAudit(loadAudit());
      setExpenses(loadExpenses());
      setCashups(loadCashups());
      setVouchers(loadVouchers());
      setLiveProfiles(loadProfiles());
      setLoyalty(loadLoyalty());
      setWho(getWho());
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

  /* the sample history is rebuilt every 15 minutes, not on every tick */
  const bucket = ready ? Math.floor(now / 900000) : 0;
  const hist = useMemo(() => (bucket ? buildHistory(new Date(bucket * 900000)) : EMPTY), [bucket]);

  /* loyalty needs the past orders and customers, so it is told about them */
  useEffect(() => {
    setHistory({ orders: hist.orders, profiles: hist.profiles });
  }, [hist]);

  /* the first time: add the sample vouchers. After that: send any birthday vouchers that are due. */
  useEffect(() => {
    if (!ready || !bucket) return;
    if (!vouchersSeeded()) {
      seedVouchers(hist.vouchers);
      return;
    }
    runBirthdayCheck(new Date());
  }, [ready, bucket, hist, vouchers, liveProfiles, loyalty]);

  const all = useMemo(() => [...orders, ...hist.orders], [orders, hist]);
  const allAudit = useMemo(() => [...audit, ...hist.audit].sort((a, b) => b.at.localeCompare(a.at)), [audit, hist]);
  const allExpenses = useMemo(() => [...expenses, ...hist.expenses], [expenses, hist]);
  const allCashups = useMemo(() => [...cashups, ...hist.cashups], [cashups, hist]);
  const profiles = useMemo(() => ({ ...hist.profiles, ...liveProfiles }), [hist, liveProfiles]);

  return {
    orders, all, sms, audit: allAudit, expenses: allExpenses, cashups: allCashups,
    vouchers, profiles, loyalty, who, shop, ready, now,
  };
}
