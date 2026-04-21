"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  fetchMergedPublicPackages,
  getDefaultPackages,
  type UiPackage,
} from "../../lib/publicPackages";

const accentClasses = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    darkBg: "dark:bg-emerald-500/20",
    darkText: "dark:text-emerald-400",
    button: "bg-emerald-500 hover:bg-emerald-600",
    gradientFrom: "from-emerald-500/40",
    gradientVia: "via-emerald-400/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    darkBg: "dark:bg-blue-500/20",
    darkText: "dark:text-blue-400",
    button: "bg-blue-500 hover:bg-blue-600",
    gradientFrom: "from-blue-500/40",
    gradientVia: "via-blue-400/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-600",
    darkBg: "dark:bg-purple-500/20",
    darkText: "dark:text-purple-400",
    button: "bg-purple-500 hover:bg-purple-600",
    gradientFrom: "from-purple-500/40",
    gradientVia: "via-purple-400/20",
  },
};

type AccentKey = keyof typeof accentClasses;

export default function Packages() {
  const router = useRouter();
  const [packages, setPackages] = useState<UiPackage[]>(() => getDefaultPackages());
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const merged = await fetchMergedPublicPackages();
      if (alive) setPackages(merged);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const scrollToIndex = (idx: number) => {
    const clamped = ((idx % packages.length) + packages.length) % packages.length;
    setActiveIndex(clamped);
    const el = cardRefs.current[clamped];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  const handlePrev = () => {
    if (!packages.length) return;
    scrollToIndex(activeIndex - 1);
  };

  const handleNext = () => {
    if (!packages.length) return;
    scrollToIndex(activeIndex + 1);
  };

  return (
    <section className="relative min-h-screen py-28  bg-slate-50 dark:bg-gradient-to-b dark:from-gray-950 dark:via-gray-900 dark:to-black transition-colors">
      {/* Ambient glow for dark mode */}
      <div className="hidden dark:block absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-center text-slate-900 dark:text-white mb-4">
          Choose Your Trading Path
        </h2>
        <p className="text-center text-slate-600 dark:text-gray-400 max-w-2xl mx-auto mb-20">
          Professionally designed packages for traders at every stage.
        </p>

        <div className="relative">
          {/* Carousel controls */}
          {packages.length > 3 && (
            <div className="hidden md:flex items-center justify-between pointer-events-none absolute inset-y-0 -left-2 -right-2 z-20">
              <button
                type="button"
                onClick={handlePrev}
                className="pointer-events-auto h-12 w-12 rounded-full bg-white/90 dark:bg-gray-900/80 border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition flex items-center justify-center"
                aria-label="Previous package"
                title="Previous"
              >
                <ChevronLeft className="w-6 h-6 text-slate-700 dark:text-gray-200" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="pointer-events-auto h-12 w-12 rounded-full bg-white/90 dark:bg-gray-900/80 border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition flex items-center justify-center"
                aria-label="Next package"
                title="Next"
              >
                <ChevronRight className="w-6 h-6 text-slate-700 dark:text-gray-200" />
              </button>
            </div>
          )}

          {/* Horizontal scroller */}
          <div
            ref={scrollerRef}
            className="flex gap-8 overflow-x-auto pb-6 -mx-6 px-6 scroll-smooth snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {packages.map((pkg, i) => {
            const accent = accentClasses[pkg.accent] || accentClasses.blue;
            return (
              <div
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={`
                  relative rounded-3xl overflow-hidden transition-all duration-500 snap-center shrink-0
                  bg-white dark:bg-[#0b0f1a]
                  border border-slate-200 dark:border-white/10
                  shadow-xl hover:shadow-2xl
                  transform hover:-translate-y-2 hover:scale-105
                  ${pkg.highlight ? "ring-4 ring-blue-400/40 dark:ring-blue-500/30 scale-105" : ""}
                  w-[320px] sm:w-[360px] md:w-[380px]
                `}
              >
                <div className="flex flex-col h-full">
                  {/* Image Section with zoom on hover */}
                  <div className="relative h-56 w-full overflow-hidden rounded-t-3xl group flex-shrink-0">
                    <Image
                      src={pkg.image || "/pkg1.jpg"}
                      alt={pkg.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      priority
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${accent.gradientFrom} ${accent.gradientVia} to-transparent`}
                    />
                  </div>

                  {/* Content */}
                  <div className="relative p-8 flex-1 flex flex-col">
                    {/* Badge */}
                    {pkg.badge && (
                      <span
                        className={`inline-block mb-3 px-3 py-1 text-xs font-semibold rounded-full backdrop-blur ${accent.bg} ${accent.text} ${accent.darkBg} ${accent.darkText}`}
                      >
                        {pkg.badge}
                      </span>
                    )}

                    <h3 className="text-2xl font-bold dark:text-white text-gray-900 leading-tight">
                      {pkg.name}
                    </h3>

                    <p className="text-sm dark:text-gray-300 text-gray-700 mb-4">{pkg.subtitle}</p>

                    <div className="text-5xl font-extrabold text-slate-600 mb-6 dark:text-white">
                      ${Number(pkg.price || 0).toFixed(0)}
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {pkg.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-3 text-slate-600 dark:text-gray-300"
                        >
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => router.push("/register")}
                      className={`
                        w-full py-3 rounded-xl font-semibold mt-auto
                        ${accent.button}
                        text-white transition-transform transform hover:scale-105
                      `}
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {/* Dots */}
          {packages.length > 3 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {packages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToIndex(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === activeIndex ? "w-8 bg-blue-600" : "w-2.5 bg-slate-300 dark:bg-gray-700 hover:bg-slate-400"
                  }`}
                  aria-label={`Go to package ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
