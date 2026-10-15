"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";

/** UI guidance only: the server remains authoritative, including after navigation. */
export function useRetryCooldown() {
  const deadline = useRef(0);
  const [until, setUntil] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!until) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) clearInterval(timer);
    };
    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, [until]);

  const start = (error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 429 || !error.retryAfter) return;
    deadline.current = Date.now() + error.retryAfter * 1000;
    setSeconds(error.retryAfter);
    setUntil(deadline.current);
  };

  return { seconds, start, isCoolingDown: () => deadline.current > Date.now() };
}
