'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import MarketingPageShell from '../../components/landing-experience/MarketingPageShell';
import TiltCard from '../../components/landing-experience/TiltCard';
import { FAQ_CATEGORIES as FAQ_CATEGORY_CONTENT } from '../../data/faq-content';

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
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35',
  chevron: 'M6 9l6 6 6-6',
  arrow: 'M5 12h14 M12 5l7 7-7 7',
  check: 'M20 6L9 17l-5-5',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  play: 'M5 3l14 9-14 9V3z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  card: 'M2 12h20 M2 7h20 M2 17h20',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  layers: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
} as const;

const HERO_PILLARS = [
  '34 answers across 8 curated topics',
  'Searchable knowledge base, updated regularly',
  'Direct desk support when you need a human',
] as const;

const STATS = [
  { num: '34', lbl: 'Documented answers', icon: ICONS.book },
  { num: '8', lbl: 'Topic categories', icon: ICONS.layers },
  { num: '24h', lbl: 'Support response', icon: ICONS.clock },
  { num: '98%', lbl: 'Resolution rate', icon: ICONS.shield },
] as const;

const QUICK_HELP = [
  {
    icon: ICONS.message,
    title: 'Contact the desk',
    detail: 'Open a support request and our team will follow up personally.',
    href: '/contact',
    cta: 'Send message',
  },
  {
    icon: ICONS.mail,
    title: 'Email support',
    detail: 'thefxnavigators@gmail.com — include your account email for faster help.',
    href: 'mailto:thefxnavigators@gmail.com',
    cta: 'Email us',
  },
  {
    icon: ICONS.clock,
    title: 'Response times',
    detail: 'We reply within 24 hours on business days. Urgent issues are prioritised.',
    href: '/contact',
    cta: 'View hours',
  },
] as const;

const POPULAR_QUESTIONS = [
  'How do I create an account?',
  'What are trading signals?',
  'Can I cancel my subscription anytime?',
  'How can I get help if I\'m stuck?',
] as const;

const CATEGORY_ICONS = {
  'getting-started': ICONS.book,
  courses: ICONS.play,
  signals: ICONS.shield,
  'live-sessions': ICONS.users,
  community: ICONS.message,
  billing: ICONS.card,
  technical: ICONS.settings,
  mobile: ICONS.phone,
} as const;

const FAQ_CATEGORIES = FAQ_CATEGORY_CONTENT.map((category) => ({
  ...category,
  icon: CATEGORY_ICONS[category.id as keyof typeof CATEGORY_ICONS],
}));

export default function FAQPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    return FAQ_CATEGORIES.map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const matchesCategory = activeCategory === 'all' || category.id === activeCategory;
        const matchesQuery =
          !normalizedQuery ||
          item.question.toLowerCase().includes(normalizedQuery) ||
          item.answer.toLowerCase().includes(normalizedQuery);
        return matchesCategory && matchesQuery;
      }),
    })).filter((category) => category.items.length > 0);
  }, [activeCategory, normalizedQuery]);

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    setQuery('');
  };

  return (
    <MarketingPageShell activePath="/faq">
      <section className="mkt-about-hero mkt-faq-hero" data-nav-surface="light">
        <div className="mkt-about-hero__orb mkt-about-hero__orb--a" aria-hidden />
        <div className="mkt-about-hero__orb mkt-about-hero__orb--b" aria-hidden />
        <div className="mkt-faq-hero__grid" aria-hidden />

        <div className="mkt-about-hero__copy">
          <p className="mkt-kicker">Knowledge base</p>
          <h1 className="mkt-about-hero__title">
            <span>Everything you need,</span>
            <span>
              organised with <span className="mkt-hero__accent">clarity</span>
            </span>
          </h1>
          <p className="mkt-about-hero__lead">
            A professional help centre for courses, signals, billing, and platform access — built so
            you spend less time searching and more time trading with confidence.
          </p>

          <ul className="mkt-about-hero__pillars">
            {HERO_PILLARS.map((pillar) => (
              <li key={pillar}>
                <MktIcon d={ICONS.check} />
                <span>{pillar}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mkt-about-hero__stats mkt-faq-hero__stats">
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

      <section className="mkt-faq-command" data-nav-surface="light">
        <div className="mkt-faq-command__inner">
          <div className="mkt-faq-command__card">
            <label className="mkt-faq-command__label" htmlFor="faq-search">
              Search the knowledge base
            </label>
            <div className="mkt-faq-search">
              <MktIcon d={ICONS.search} />
              <input
                id="faq-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try “billing”, “signals”, or “mobile”..."
                aria-label="Search FAQs"
              />
              {query && (
                <button
                  type="button"
                  className="mkt-faq-search__clear"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mkt-faq-popular">
              <span className="mkt-faq-popular__label">Popular:</span>
              <div className="mkt-faq-popular__chips">
                {POPULAR_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="mkt-faq-popular__chip"
                    onClick={() => {
                      setQuery(question.replace('?', ''));
                      setActiveCategory('all');
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-faq-quick" data-nav-surface="light">
        <div className="mkt-section__inner">
          <div className="mkt-faq-quick__grid">
            {QUICK_HELP.map((item) => (
              <div key={item.title} className="mkt-faq-quick__card">
                <div className="mkt-faq-quick__icon">
                  <MktIcon d={item.icon} />
                </div>
                <div className="mkt-faq-quick__body">
                  <h2 className="mkt-faq-quick__title">{item.title}</h2>
                  <p className="mkt-faq-quick__detail">{item.detail}</p>
                  <Link href={item.href} className="mkt-faq-quick__link">
                    {item.cta}
                    <MktIcon d={ICONS.arrow} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section--faq mkt-faq-body" data-nav-surface="light">
        <div className="mkt-section__inner">
          <div className="mkt-faq-layout">
            <aside className="mkt-faq-sidebar">
              <p className="mkt-faq-sidebar__label">Browse by topic</p>
              <nav className="mkt-faq-sidebar__nav" aria-label="FAQ categories">
                <button
                  type="button"
                  className={`mkt-faq-sidebar__item${activeCategory === 'all' ? ' is-active' : ''}`}
                  onClick={() => selectCategory('all')}
                >
                  <span className="mkt-faq-sidebar__item-icon">
                    <MktIcon d={ICONS.layers} />
                  </span>
                  <span className="mkt-faq-sidebar__item-copy">
                    <span className="mkt-faq-sidebar__item-title">All topics</span>
                    <span className="mkt-faq-sidebar__item-meta">Complete knowledge base</span>
                  </span>
                  <span className="mkt-faq-sidebar__item-count">34</span>
                </button>

                {FAQ_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`mkt-faq-sidebar__item${activeCategory === category.id ? ' is-active' : ''}`}
                    onClick={() => selectCategory(category.id)}
                  >
                    <span className="mkt-faq-sidebar__item-icon">
                      <MktIcon d={category.icon} />
                    </span>
                    <span className="mkt-faq-sidebar__item-copy">
                      <span className="mkt-faq-sidebar__item-title">{category.title}</span>
                      <span className="mkt-faq-sidebar__item-meta">{category.description}</span>
                    </span>
                    <span className="mkt-faq-sidebar__item-count">{category.items.length}</span>
                  </button>
                ))}
              </nav>
            </aside>

            <div className="mkt-faq-main">
              <div className="mkt-faq-main__head">
                <div>
                  <h2 className="mkt-faq-main__title">
                    {activeCategory === 'all'
                      ? 'All answers'
                      : FAQ_CATEGORIES.find((c) => c.id === activeCategory)?.title}
                  </h2>
                  <p className="mkt-faq-results">
                    {totalResults} {totalResults === 1 ? 'result' : 'results'}
                    {normalizedQuery ? ` matching “${query.trim()}”` : ''}
                  </p>
                </div>
                {(query || activeCategory !== 'all') && (
                  <button
                    type="button"
                    className="mkt-faq-main__reset"
                    onClick={() => {
                      setQuery('');
                      setActiveCategory('all');
                    }}
                  >
                    Reset filters
                  </button>
                )}
              </div>

              {filteredCategories.length === 0 ? (
                <div className="mkt-faq-empty">
                  <div className="mkt-faq-empty__icon">
                    <MktIcon d={ICONS.search} />
                  </div>
                  <h3 className="mkt-faq-empty__title">No matches found</h3>
                  <p>Try a different keyword, browse all topics, or contact our desk directly.</p>
                  <button
                    type="button"
                    className="mkt-btn mkt-btn--inline"
                    onClick={() => {
                      setQuery('');
                      setActiveCategory('all');
                    }}
                  >
                    View all topics
                  </button>
                </div>
              ) : (
                <div className="mkt-faq-categories">
                  {filteredCategories.map((category) => (
                    <article key={category.id} id={`faq-${category.id}`} className="mkt-faq-category">
                      <header className="mkt-faq-category__head">
                        <span className="mkt-faq-category__icon">
                          <MktIcon d={category.icon} />
                        </span>
                        <div className="mkt-faq-category__copy">
                          <h3 className="mkt-faq-category__title">{category.title}</h3>
                          <p className="mkt-faq-category__desc">{category.description}</p>
                        </div>
                        <span className="mkt-faq-category__count">{category.items.length}</span>
                      </header>

                      <div className="mkt-faq-list mkt-faq-list--premium">
                        {category.items.map((item, index) => {
                          const key = `${category.id}-${index}`;
                          const isOpen = openItems.has(key);
                          return (
                            <div key={key} className={`mkt-faq-item${isOpen ? ' is-open' : ''}`}>
                              <button
                                type="button"
                                className="mkt-faq-q"
                                aria-expanded={isOpen}
                                onClick={() => toggleItem(key)}
                              >
                                <span className="mkt-faq-q__index">{String(index + 1).padStart(2, '0')}</span>
                                <span className="mkt-faq-q__text">{item.question}</span>
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
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-faq-cta" data-nav-surface="light">
        <div className="mkt-section__inner">
          <div className="mkt-faq-cta__card">
            <div className="mkt-faq-cta__copy">
              <p className="mkt-kicker">Still need help?</p>
              <h2 className="mkt-faq-cta__title">Talk to a real person on our desk.</h2>
              <p className="mkt-faq-cta__lead">
                If your question isn&apos;t covered here, reach out — we typically respond within 24 hours
                on business days and prioritise account access issues.
              </p>
              <div className="mkt-faq-cta__actions">
                <Link href="/contact" className="mkt-btn mkt-btn--inline mkt-btn--dark">
                  Contact support
                  <MktIcon d={ICONS.arrow} />
                </Link>
                <Link href="/register" className="mkt-about-hero__ghost mkt-about-hero__ghost--on-dark">
                  Create account
                </Link>
              </div>
            </div>
            <div className="mkt-faq-cta__aside">
              <div className="mkt-faq-cta__stat">
                <span className="mkt-faq-cta__stat-num">24h</span>
                <span className="mkt-faq-cta__stat-lbl">Average response</span>
              </div>
              <div className="mkt-faq-cta__stat">
                <span className="mkt-faq-cta__stat-num">Mon–Sat</span>
                <span className="mkt-faq-cta__stat-lbl">Support hours</span>
              </div>
              <div className="mkt-faq-cta__stat">
                <span className="mkt-faq-cta__stat-num">5★</span>
                <span className="mkt-faq-cta__stat-lbl">Desk rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
