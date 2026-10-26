"use client";
import { useEffect, useMemo, useState } from "react";
import { adoptShopFromUrl, getShopName } from "@/lib/brand";
import {
  ensureSeed, getWho, loadAudit, loadCashups, loadExpenses, loadOrders, loadSms,
  type Audit, type Cashup, type Expense, type Order, type Sms,
} from "@/lib/store";
import { buildHistory, EMPTY } from "@/lib/history";

/* every screen reads through this, so staff, owner and the phone always agree.
   `orders` is the live board. `all` also includes the sample history. */
export function useDemo() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sms, setSms] = useState<Sms[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashups, setCashups] = useState<Cashup[]>([]);
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

  const all = useMemo(() => [...orders, ...hist.orders], [orders, hist]);
  const allAudit = useMemo(() => [...audit, ...hist.audit].sort((a, b) => b.at.localeCompare(a.at)), [audit, hist]);
  const allExpenses = useMemo(() => [...expenses, ...hist.expenses], [expenses, hist]);
  const allCashups = useMemo(() => [...cashups, ...hist.cashups], [cashups, hist]);

  return { orders, all, sms, audit: allAudit, expenses: allExpenses, cashups: allCashups, who, shop, ready, now };
}
