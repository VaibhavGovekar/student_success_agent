"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion/react";

export default function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => {
        node.textContent = String(Number(v.toFixed(decimals)));
      },
    });
    return () => controls.stop();
  }, [value, decimals]);

  return <span ref={ref}>0</span>;
}
