"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RulesCard({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-lg border-2 border-gsGreen bg-gsNavy shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gsGreen/30 px-5 py-3">
          <h2 className="font-pixel text-xs uppercase tracking-widest text-gsGreen">
            How to play
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="font-serif text-sm text-white/85">
            Keep payroll running. Jump over ground threats, duck under flying
            ones, build combos by collecting items quickly.
          </p>

          <Section title="Collect" titleColor="text-gsGreen">
            <Item name="Paychecks" desc="+$100 × your combo. Snag them in a row to multiply." />
            <Item name="W-2 Forms" desc="+$250 × your combo. The big payday filing." />
            <Item
              name="Greenshades Shields"
              desc="+$500 plus 5 seconds of compliance protection — plow through anything."
            />
          </Section>

          <Section title="Dodge" titleColor="text-red-300">
            <Item name="IRS Audits" desc="Game over. Jump over the red sign." />
            <Item name="Missed Deadlines" desc="Game over. Duck under the flying clock." />
            <Item name="Garnishments" desc="Game over. Jump over the court order." />
          </Section>

          <Section title="Controls" titleColor="text-white/70">
            <Item name="Jump" desc="Space, ↑, tap right side, or ▲ button" />
            <Item name="Duck" desc="↓, tap left side, or ▼ button (hold)" />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  titleColor,
  children,
}: {
  title: string;
  titleColor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className={`mb-2 font-pixel text-[0.55rem] uppercase tracking-widest ${titleColor}`}>
        {title}
      </h3>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Item({ name, desc }: { name: string; desc: string }) {
  return (
    <li className="text-xs text-white/75">
      <strong className="text-white">{name}</strong>
      <span className="ml-1.5">— {desc}</span>
    </li>
  );
}
