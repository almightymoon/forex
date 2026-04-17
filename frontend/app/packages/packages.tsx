"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

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

const packages = [
  {
    name: "FX Launch",
    subtitle: "Launch your trading journey",
    price: "$100",
    badge: "Starter",
    image: "/pkg1.jpg",
    accent: "emerald",
    features: [
      "Forex Trading Signals",
      "Forex Basic Mentorship",
      "Premium Indicators",
      "Auto Trading Access",
    ],
  },
  {
    name: "FX Scale",
    subtitle: "Grow with structure",
    price: "$600",
    badge: "Most Popular",
    image: "/pkg2.jpg",
    accent: "blue",
    highlight: true,
    features: [
      "Forex Trading Signals",
      "Live Online Mentorship Sessions",
      "Premium Indicators",
      "Auto Trading Access",
    ],
  },
  {
    name: "FX Legacy",
    subtitle: "Trade for life",
    price: "$1000",
    badge: "Elite Program",
    image: "/pkg3.jpg",
    accent: "purple",
    features: [
      "Forex Trading Signals",
      "Forex Pro Mentorship",
      "Premium Indicators",
      "Auto Trading Access",
      "Physical (On-Ground) Classes",
    ],
  },
];

export default function Packages() {
  const router = useRouter();

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {packages.map((pkg, i) => {
            const accent = accentClasses[pkg.accent];
            return (
              <div
                key={i}
                className={`
                  relative rounded-3xl overflow-hidden transition-all duration-500
                  bg-white dark:bg-[#0b0f1a]
                  border border-slate-200 dark:border-white/10
                  shadow-xl hover:shadow-2xl
                  transform hover:-translate-y-2 hover:scale-105
                  ${pkg.highlight ? "ring-4 ring-blue-400/40 dark:ring-blue-500/30 scale-105" : ""}
                `}
              >
                {/* Image Section with zoom on hover */}
                <div className="relative h-56 w-full overflow-hidden rounded-t-3xl group">
                  <Image
                    src={pkg.image}
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
                <div className="relative p-8">
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
                    {pkg.price}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {pkg.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-3 text-slate-600 dark:text-gray-300"
                      >
                        <Check className="w-5 h-5 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => router.push("/register")}
                    className={`
                      w-full py-3 rounded-xl font-semibold
                      bg-gradient-to-r from-${pkg.accent}-500 to-${pkg.accent}-600
                      hover:from-${pkg.accent}-600 hover:to-${pkg.accent}-700
                      text-white transition-transform transform hover:scale-105
                    `}
                  >
                    Get Started
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
