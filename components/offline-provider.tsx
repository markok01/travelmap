"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type OfflineContextValue = {
  online: boolean;
  ready: boolean;
  updateReady: boolean;
  applyUpdate: () => void;
};

const OfflineContext = createContext<OfflineContextValue>({
  online: true,
  ready: false,
  updateReady: false,
  applyUpdate: () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    setReady(true);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const enableSw =
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ENABLE_SW === "1";
    if (!enableSw) {
      // Skip sticky SW during local HMR unless explicitly enabled.
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let refreshed = false;

    const onControllerChange = () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateReady(true);
        }
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(worker);
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {
        /* registration failed — app still works online */
      });

    const onVisible = () => {
      registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) {
      window.location.reload();
      return;
    }
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  const value = useMemo(
    () => ({ online, ready, updateReady, applyUpdate }),
    [online, ready, updateReady, applyUpdate],
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOnline() {
  return useContext(OfflineContext).online;
}

export function useOffline() {
  return useContext(OfflineContext);
}
