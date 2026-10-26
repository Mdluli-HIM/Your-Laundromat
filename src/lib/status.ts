export const STATUSES = ["received", "washing", "drying", "folding", "ready", "collected"] as const;
export type Status = (typeof STATUSES)[number];

export const LABEL: Record<Status, string> = {
  received: "Received",
  washing: "Washing",
  drying: "Drying",
  folding: "Folding",
  ready: "Ready to collect",
  collected: "Collected",
};

/* what the customer reads on the tracking page */
export const COPY: Record<Status, string> = {
  received: "We have your laundry and it is in the queue.",
  washing: "Your laundry is being washed.",
  drying: "Your laundry is in the dryer.",
  folding: "Nearly there. We are folding your laundry.",
  ready: "Your laundry is ready. Come and collect it.",
  collected: "Thank you. This order has been collected.",
};

export const nextStatus = (s: Status): Status | null => STATUSES[STATUSES.indexOf(s) + 1] ?? null;
