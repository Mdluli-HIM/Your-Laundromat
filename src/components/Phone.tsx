"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDemo } from "@/lib/useDemo";
import TrackView from "@/components/TrackView";
import { clock } from "@/lib/format";
import { showPhone } from "@/lib/phone";

export default function Phone() {
  const { sms, orders } = useDemo();
  const [view, setView] = useState<"messages" | "track">("messages");
  const [ticket, setTicket] = useState("");
  const [pick, setPick] = useState("");
  const box = useRef<HTMLDivElement>(null);

  /* the phone follows whoever got the latest message */
  useEffect(() => {
    const last = sms[sms.length - 1];
    if (last) setPick(last.to);
  }, [sms.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = useMemo(() => {
    const last: Record<string, string> = {};
    sms.forEach((m) => (last[m.to] = m.at));
    return Object.keys(last).sort((a, b) => last[b].localeCompare(last[a]));
  }, [sms]);
  const phone = lines.includes(pick) ? pick : (lines[0] ?? "");
  const mine = sms.filter((m) => m.to === phone);
  const who = orders.find((o) => o.phone === phone)?.name ?? (phone ? showPhone(phone) : "");

  useEffect(() => {
    if (view === "messages") box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [mine.length, view, phone]);

  return (
    <div className="phone" aria-label="The customer's phone">
      <div className="phone__notch" />
      <div className="phone__bar">
        {view === "track" ? (
          <button onClick={() => setView("messages")}>← Messages</button>
        ) : lines.length > 1 ? (
          <select value={phone} onChange={(e) => setPick(e.target.value)} aria-label="Customer">
            {lines.map((p) => (
              <option key={p} value={p}>{orders.find((o) => o.phone === p)?.name ?? showPhone(p)}</option>
            ))}
          </select>
        ) : (
          <strong>{who || "Messages"}</strong>
        )}
      </div>

      {view === "messages" ? (
        <div className="phone__body" ref={box}>
          {mine.length === 0 && (
            <p className="phone__empty">No messages yet. Create an order and this phone will light up.</p>
          )}
          {mine.map((m) => {
            const link = m.body.match(/https?:\/\/\S+/)?.[0];
            const text = link ? m.body.replace(link, "").trim() : m.body;
            return (
              <div key={m.id} className="bubble">
                <p>{text}</p>
                {link && (
                  <button
                    className="bubble__link"
                    onClick={() => {
                      setTicket(m.ticket);
                      setView("track");
                    }}
                  >
                    {link.replace(/^https?:\/\//, "")}
                  </button>
                )}
                <time>{clock(m.at)}</time>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="phone__body">
          <TrackView ticket={ticket} />
        </div>
      )}
    </div>
  );
}
