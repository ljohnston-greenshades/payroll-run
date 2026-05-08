"use client";

import { QRCodeSVG } from "qrcode.react";

interface Props {
  value: string;
  size?: number;
  caption?: string;
}

export function QRCode({ value, size = 120, caption }: Props) {
  return (
    <div className="flex items-center gap-4">
      {caption ? (
        <div className="text-right font-pixel text-sm uppercase tracking-wider text-white/80">
          <div>Scan to play</div>
          {caption ? <div className="mt-1 text-xs text-white/50">{caption}</div> : null}
        </div>
      ) : null}
      <div className="rounded-md bg-white p-3">
        <QRCodeSVG
          value={value}
          size={size}
          bgColor="#ffffff"
          fgColor="#062a47"
          level="M"
        />
      </div>
    </div>
  );
}
