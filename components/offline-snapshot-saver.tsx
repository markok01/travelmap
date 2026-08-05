"use client";

import { useEffect } from "react";
import {
  saveOfflineSnapshot,
  type OfflineSnapshotKey,
} from "@/lib/offline/snapshot";

/** Persist a lightweight last-seen payload while online. */
export function OfflineSnapshotSaver({
  snapshotKey,
  payload,
}: {
  snapshotKey: OfflineSnapshotKey;
  payload: unknown;
}) {
  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    void saveOfflineSnapshot(snapshotKey, payload);
  }, [snapshotKey, payload]);

  return null;
}
