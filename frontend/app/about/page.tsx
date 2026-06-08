'use client';

import Link from 'next/link';
import { useState } from 'react';
import MarketingPageShell from '../../components/landing-experience/MarketingPageShell';
import TiltCard from '../../components/landing-experience/TiltCard';

function MktIcon({ d }: { d: string }) {
  const paths = d.split(/(?= M)/).map((segment) => segment.trim()).filter(Boolean);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths.map((segment) => (
        <path key={segment} d={segment} />
      ))}
    </svg>
  );
}

const ICONS = {
  trend: 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  target: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  signal: 'M22 12h-4l-3 9L9 3l-3 9H2',
  copy: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z',
  coach: 'M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5',
  community: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 11l-2 2 2 2',
  chart: 'M3 3v18h18 M18 9l-5 5-4-4-6 6',
  award: 'M12 15l-2 5 2-1 2 1-2-5 M8.21 13.89L7 23h10l-1.21-9.11',
  globe: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  chevron: 'M6 9l6 6 6-6',
  arrow: 'M5 12h14 M12 5l7 7-7 7',
} as const;

const STATS = [
  { num: '9+', lbl: 'Years experience', icon: ICONS.trend },
  { num: '100+', lbl: 'Students mentored', icon: ICONS.users },
  { num: '85%', lbl: 'Success rate', icon: ICONS.target },
  { num: '24/7', lbl: 'Community access', icon: ICONS.community },
] as const;

const SERVICES = [
  {
    icon: ICONS.book,
    title: 'Forex trading courses',
    description: 'Structured curriculum from fundamentals through advanced execution — built for real market conditions.',
    features: ['Beginner to advanced', 'Live sessions', 'Risk management', 'Market analysis'],
  },
  {
    icon: ICONS.signal,
    title: 'Signal sharing',
    description: 'Real-time setups with clear entry, stop, and target levels plus the reasoning behind each trade.',
    features: ['Real-time alerts', 'Entry & exit points', 'Risk analysis', 'Market commentary'],
  },
  {
    icon: ICONS.copy,
    title: 'Copy trading',
    description: 'Mirror proven desk flows automatically with controls that keep your account in your hands.',
    features: ['Auto execution', 'Risk controls', 'Performance tracking', 'Custom settings'],
  },
  {
    icon: ICONS.coach,
    title: 'Personal coaching',
    description: 'One-on-one mentorship to shorten your learning curve and sharpen decision-making under pressure.',
    features: ['1-on-1 sessions', 'Custom strategies', 'Trade reviews', 'Ongoing support'],
  },
  {
    icon: ICONS.community,
    title: 'Community support',
    description: 'A focused network of traders sharing ideas, accountability, and wins from the same playbook.',
    features: ['Expert network', 'Peer learning', 'Market discussions', 'Success stories'],
  },
  {
    icon: ICONS.chart,
    title: 'Navigator strategy',
    description: 'Our proprietary framework for reading structure, timing entries, and managing risk with discipline.',
    features: ['Proven methods', 'Backtested results', 'Risk management', 'Market adaptation'],
  },
] as const;

const HERO_PILLARS = [
  'Live mentorship from active traders',
  'Structured courses for every level',
  'Signals, community, and ongoing support',
] as const;

const FOUNDERS = [
  {
    name: 'Muhammad Adnan Khan',
    role: 'CEO & Founder',
    image: '/owner1.jpeg',
    photoFit: 'cover' as const,
    years: '9+',
    helped: '100+',
    metric: '85%',
    metricLabel: 'Success rate',
    bio: 'Nine years in live markets — wins, losses, and the lessons that turned into a repeatable process. Now I help traders skip the painful trial-and-error phase and build skills that hold up when capital is on the line.',
    tags: ['Certified expert', 'Global experience'],
  },
  {
    name: 'Arjumail Jabbar',
    role: 'Co-Founder',
    image: '/PHOTO-2025-12-03-14-57-28.jpg',
    photoFit: 'cover' as const,
    years: '4+',
    helped: '50+',
    metric: '100+',
    metricLabel: 'Market cycles',
    bio: 'Four years navigating real volatility taught me that consistency comes from process, not prediction. As co-founder, I focus on helping traders build confidence through structure, review, and disciplined execution.',
    tags: ['Live trading expert', 'Strategy developer'],
  },
] as const;

const ACHIEVEMENTS = [
  '9+ years of professional trading experience',
  '100+ students successfully mentored',
  '85% student success rate across programs',
  'Comprehensive forex education ecosystem',
  'Real-time market analysis & signals',
  'Battle-tested Navigator strategies',
] as const;

const FAQ_ITEMS = [
  {
    question: 'What experience do I need to start?',
    answer:
      'No prior experience is required. We start with foundations and progress to advanced concepts at a pace that matches your goals.',
  },
  {
    question: 'How does the signal service work?',
    answer:
      'You receive real-time setups with entry, stop-loss, and take-profit levels, plus analysis explaining the trade thesis.',
  },
  {
    question: 'What is included in coaching?',
    answer:
      'One-on-one sessions, personalized strategy work, trade reviews, and ongoing access for questions between meetings.',
  },
  {
    question: 'How much capital do I need?',
    answer:
      'You can learn on a demo account first. For live trading we recommend at least $500 so risk management can be applied properly.',
  },
  {
    question: 'How long until I am profitable?',
    answer:
      'Timelines vary, but dedicated students often see consistency within 3–6 months with structured practice and review.',
  },
] as const;

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <MarketingPageShell activePath="/about">
      <section className="mkt-about-hero" data-nav-surface="light">
        <div className="mkt-about-hero__orb mkt-about-hero__orb--a" aria-hidden />
        <div className="mkt-about-hero__orb mkt-about-hero__orb--b" aria-hidden />

        <div className="mkt-about-hero__copy">
          <p className="mkt-kicker">Institutional edge · Retail access</p>
          <h1 className="mkt-about-hero__title">
            <span>
              Built by traders,
              <br />
              for traders who want
            </span>
            <span>
              <span className="mkt-hero__accent">clarity</span> in the market
            </span>
          </h1>
          <p className="mkt-about-hero__lead">
            THEFXNAVIGATORS is a mentorship desk and education platform — combining live guidance,
            structured courses, and a global community so you can move from curiosity to confident execution.
          </p>
          <ul className="mkt-about-hero__pillars">
            {HERO_PILLARS.map((pillar) => (
              <li key={pillar}>
                <MktIcon d="M20 6L9 17l-5-5" />
                <span>{pillar}</span>
              </li>
            ))}
          </ul>
          <div className="mkt-about-hero__actions">
            <Link href="/register" className="mkt-btn mkt-btn--inline">
              <MktIcon d={ICONS.arrow} />
              Start your journey
            </Link>
            <Link href="/contact" className="mkt-about-hero__ghost">
              Talk to the desk
            </Link>
          </div>
        </div>

        <div className="mkt-about-hero__stats">
          {STATS.map((stat) => (
            <TiltCard key={stat.lbl} className="mkt-about-stat-tilt" depth={8}>
              <div className="mkt-about-stat">
                <div className="mkt-about-stat__icon">
                  <MktIcon d={stat.icon} />
                </div>
                <span className="mkt-about-stat__num">{stat.num}</span>
                <span className="mkt-about-stat__lbl">{stat.lbl}</span>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      <section className="mkt-section mkt-about-mission" data-nav-surface="light">
        <div className="mkt-section__inner mkt-about-mission__grid">
          <div>
            <p className="mkt-kicker">Our mission</p>
            <h2 className="mkt-section__heading">
              Decode the market.
              <br />
              Deliver the playbook.
            </h2>
            <p className="mkt-section__sub">
              We teach traders to read structure, manage risk, and execute with discipline — the same
              principles institutional desks use, translated for independent traders.
            </p>
            <ul className="mkt-about-pill-list">
              {ACHIEVEMENTS.slice(0, 3).map((item) => (
                <li key={item}>
                  <MktIcon d="M20 6L9 17l-5-5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mkt-about-mission__visual">
            <img
              src="/landing/about-mission-trading.jpg"
              alt="Live market analysis and trading charts"
              draggable={false}
            />
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-about-leaders" data-nav-surface="light">
        <div className="mkt-section__inner">
          <div className="mkt-about-leaders__head">
            <div>
              <p className="mkt-kicker">Leadership</p>
              <h2 className="mkt-section__heading">Meet the desk</h2>
            </div>
            <p className="mkt-about-leaders__intro">
              Two founders. One standard — honest mentorship, live-market experience, and tools that
              actually ship results.
            </p>
          </div>

          <div className="mkt-leader-grid">
            {FOUNDERS.map((founder) => (
              <article key={founder.name} className="mkt-leader-card">
                <div className="mkt-leader-card__media">
                  <img
                    src={founder.image}
                    alt={founder.name}
                    className={`mkt-leader-card__photo mkt-leader-card__photo--${founder.photoFit}`}
                  />
                  <div className="mkt-leader-card__media-fade" aria-hidden />
                  <span className="mkt-leader-card__role">{founder.role}</span>
                </div>
                <div className="mkt-leader-card__body">
                  <h3 className="mkt-leader-card__name">{founder.name}</h3>
                  <p className="mkt-leader-card__bio">{founder.bio}</p>
                  <div className="mkt-leader-card__stats">
                    <div>
                      <span className="mkt-leader-card__stat-num">{founder.years}</span>
                      <span className="mkt-leader-card__stat-lbl">Years</span>
                    </div>
                    <div>
                      <span className="mkt-leader-card__stat-num">{founder.helped}</span>
                      <span className="mkt-leader-card__stat-lbl">Traders helped</span>
                    </div>
                    <div>
                      <span className="mkt-leader-card__stat-num">{founder.metric}</span>
                      <span className="mkt-leader-card__stat-lbl">{founder.metricLabel}</span>
                    </div>
                  </div>
                  <div className="mkt-leader-card__tags">
                    {founder.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-about-services" data-nav-surface="light">
        <div className="mkt-section__inner">
          <p className="mkt-kicker">What we offer</p>
          <h2 className="mkt-section__heading">Everything under one roof</h2>
          <p className="mkt-section__sub">
            Education, signals, copy trading, and coaching — designed as a single ecosystem instead of scattered tools.
          </p>

          <div className="mkt-about-service-grid">
            {SERVICES.map((service) => (
              <TiltCard key={service.title} depth={11}>
                <article className="mkt-about-service">
                  <div className="mkt-about-service__icon">
                    <MktIcon d={service.icon} />
                  </div>
                  <h3 className="mkt-about-service__title">{service.title}</h3>
                  <p className="mkt-about-service__desc">{service.description}</p>
                  <ul className="mkt-about-service__list">
                    {service.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </article>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section--faq" data-nav-surface="light">
        <div className="mkt-section__inner">
          <p className="mkt-kicker">Knowledge base</p>
          <h2 className="mkt-section__heading">Questions before you join</h2>
          <p className="mkt-section__sub">
            Straight answers about experience, signals, coaching, and what it takes to get started.
          </p>

          <div className="mkt-faq-list">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={item.question} className={`mkt-faq-item${isOpen ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="mkt-faq-q"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <span>{item.question}</span>
                    <span className="mkt-faq-chevron" aria-hidden>
                      <MktIcon d={ICONS.chevron} />
                    </span>
                  </button>
                  <div className="mkt-faq-panel" aria-hidden={!isOpen}>
                    <div className="mkt-faq-panel-inner">
                      <p className="mkt-faq-a">{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mkt-about-cta" data-nav-surface="light">
        <div className="mkt-about-cta__inner">
          <p className="mkt-kicker">Ready when you are</p>
          <h2 className="mkt-about-cta__title">
            Transform your trading journey with a desk that shows up daily.
          </h2>
          <p className="mkt-about-cta__lead">
            Join hundreds of traders building skill, structure, and confidence inside THEFXNAVIGATORS.
          </p>
          <div className="mkt-about-cta__actions">
            <Link href="/register" className="mkt-btn mkt-btn--inline mkt-btn--dark">
              Get started
              <MktIcon d={ICONS.arrow} />
            </Link>
            <Link href="/contact" className="mkt-about-hero__ghost mkt-about-hero__ghost--on-dark">
              Contact the team
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
