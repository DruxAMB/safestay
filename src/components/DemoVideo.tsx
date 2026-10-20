"use client";

import { useState } from "react";
import { Play } from "lucide-react";

const VIDEO_ID = "Z3kQtB8iAnk";
const MAXRES = `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`;
const HQ = `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`;

/** Demo video as a click-to-play facade — YouTube's player JS and trackers
 *  don't load until the visitor presses play, and the embed itself is
 *  youtube-nocookie. On-brand for a product whose pitch is privacy. */
export function DemoVideo() {
  const [play, setPlay] = useState(false);
  return (
    <div className="border border-foreground/40 bg-card">
      <p className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Demo — full walkthrough</span>
        <span>87s · YouTube</span>
      </p>
      <div className="relative aspect-video bg-surface-inverse">
        {play ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
            title="SafeStay demo — full walkthrough"
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlay(true)}
            aria-label="Play the SafeStay demo video"
            className="group absolute inset-0 size-full cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MAXRES}
              alt=""
              aria-hidden
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== HQ) img.src = HQ;
              }}
              className="absolute inset-0 size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-16 items-center justify-center rounded-full border border-white/40 bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
                <Play size={26} className="ml-1" aria-hidden fill="currentColor" />
              </span>
            </span>
            <span className="absolute bottom-0 left-0 p-4 text-left">
              <span className="block text-sm font-medium text-white">
                Terms signed, outcome recorded, history verified
              </span>
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest text-white/70">
                Real Arkiv entities · press play to load the player
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
