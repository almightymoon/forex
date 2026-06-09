'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import MarketingPageShell from '../../components/landing-experience/MarketingPageShell';

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
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  check: 'M20 6L9 17l-5-5',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  scale: 'M12 3v18 M3 12h18 M7 7l10 10 M17 7L7 17',
  arrow: 'M5 12h14 M12 5l7 7-7 7',
  mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
} as const;

type CalloutVariant = 'info' | 'warn' | 'danger';

type TermsBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'h3'; title: string; text: string }
  | { type: 'callout'; variant: CalloutVariant; title?: string; text: string };

type TermsSection = {
  id: string;
  title: string;
  icon: string;
  blocks: TermsBlock[];
};

function buildSections(platformName: string): TermsSection[] {
  return [
    {
      id: 'overview',
      title: 'Overview',
      icon: ICONS.file,
      blocks: [
        {
          type: 'p',
          text: `Welcome to ${platformName}. These Terms of Service ("Terms") govern your use of our online learning platform, trading education services, and related features. By accessing or using our services, you agree to be bound by these Terms.`,
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Important',
          text: 'Please read these Terms carefully before using our services. If you do not agree to these Terms, you may not access or use our platform.',
        },
      ],
    },
    {
      id: 'acceptance',
      title: 'Acceptance of terms',
      icon: ICONS.check,
      blocks: [
        {
          type: 'p',
          text: 'By creating an account, accessing our platform, or using any of our services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.',
        },
        {
          type: 'ul',
          items: [
            'You must be at least 18 years old to use our services',
            'You must provide accurate and complete information when creating your account',
            'You are responsible for maintaining the confidentiality of your account credentials',
            'You agree to notify us immediately of any unauthorized use of your account',
          ],
        },
      ],
    },
    {
      id: 'services',
      title: 'Services description',
      icon: ICONS.users,
      blocks: [
        {
          type: 'p',
          text: `${platformName} provides educational content and tools for forex trading, including:`,
        },
        {
          type: 'ul',
          items: [
            'Online courses and educational materials',
            'Trading signals and market analysis',
            'Live trading sessions and webinars',
            'Community forums and discussion boards',
            'Certification programs',
            'Mobile and web applications',
          ],
        },
        {
          type: 'callout',
          variant: 'warn',
          title: 'Disclaimer',
          text: 'Our services are for educational purposes only. We do not provide financial advice, and trading involves substantial risk of loss.',
        },
      ],
    },
    {
      id: 'user-accounts',
      title: 'User accounts',
      icon: ICONS.shield,
      blocks: [
        {
          type: 'h3',
          title: 'Account creation',
          text: 'To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration.',
        },
        {
          type: 'h3',
          title: 'Account security',
          text: 'You are responsible for maintaining the security of your account and password. We cannot and will not be liable for any loss or damage arising from your failure to comply with this security obligation.',
        },
        {
          type: 'h3',
          title: 'Account termination',
          text: 'We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.',
        },
      ],
    },
    {
      id: 'prohibited-uses',
      title: 'Prohibited uses',
      icon: ICONS.alert,
      blocks: [
        {
          type: 'p',
          text: 'You may not use our services for any unlawful purpose or to solicit others to perform unlawful acts. You agree not to:',
        },
        {
          type: 'ul',
          items: [
            'Violate any applicable laws or regulations',
            'Infringe upon the rights of others',
            'Transmit or procure the sending of spam or unsolicited messages',
            'Attempt to gain unauthorized access to our systems',
            'Interfere with or disrupt our services',
            'Use our platform for commercial purposes without permission',
            'Share your account credentials with others',
            'Upload malicious code or harmful content',
          ],
        },
      ],
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual property',
      icon: ICONS.scale,
      blocks: [
        {
          type: 'h3',
          title: 'Our content',
          text: `All content on our platform, including courses, videos, text, graphics, and software, is owned by ${platformName} or our licensors and is protected by copyright and other intellectual property laws.`,
        },
        {
          type: 'h3',
          title: 'License to use',
          text: 'We grant you a limited, non-exclusive, non-transferable license to access and use our content for personal, non-commercial purposes only.',
        },
        {
          type: 'h3',
          title: 'User content',
          text: 'By posting content on our platform, you grant us a license to use, modify, and display such content in connection with our services.',
        },
      ],
    },
    {
      id: 'disclaimers',
      title: 'Disclaimers',
      icon: ICONS.alert,
      blocks: [
        {
          type: 'callout',
          variant: 'danger',
          title: 'Important financial disclaimer',
          text: 'Trading foreign exchange on margin carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade foreign exchange, you should carefully consider your investment objectives, level of experience, and risk appetite.',
        },
        {
          type: 'p',
          text: 'Our services are provided "as is" without warranties of any kind. We disclaim all warranties, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.',
        },
      ],
    },
    {
      id: 'limitation-liability',
      title: 'Limitation of liability',
      icon: ICONS.shield,
      blocks: [
        {
          type: 'p',
          text: `In no event shall ${platformName}, its officers, directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of our services.`,
        },
        {
          type: 'p',
          text: 'Our total liability to you for any damages arising from or related to these Terms or our services shall not exceed the amount you paid us in the 12 months preceding the claim.',
        },
      ],
    },
    {
      id: 'termination',
      title: 'Termination',
      icon: ICONS.file,
      blocks: [
        {
          type: 'h3',
          title: 'Termination by you',
          text: 'You may terminate your account at any time by contacting us or using the account deletion feature in your profile settings.',
        },
        {
          type: 'h3',
          title: 'Termination by us',
          text: 'We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.',
        },
        {
          type: 'h3',
          title: 'Effect of termination',
          text: 'Upon termination, your right to use our services will cease immediately. Provisions of these Terms that by their nature should survive termination shall survive.',
        },
      ],
    },
    {
      id: 'governing-law',
      title: 'Governing law',
      icon: ICONS.scale,
      blocks: [
        {
          type: 'p',
          text: 'These Terms shall be governed by and construed in accordance with the laws of Malaysia, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the courts located in Malaysia.',
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to terms',
      icon: ICONS.file,
      blocks: [
        {
          type: 'p',
          text: 'We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on our platform and updating the "Last updated" date.',
        },
        {
          type: 'p',
          text: 'Your continued use of our services after any such changes constitutes your acceptance of the new Terms. If you do not agree to the modified Terms, you must stop using our services.',
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact information',
      icon: ICONS.mail,
      blocks: [
        {
          type: 'p',
          text: 'If you have any questions about these Terms of Service, please contact us:',
        },
        {
          type: 'ul',
          items: [
            'Email: thefxnavigators@gmail.com',
            'Phone: +92 348 8566147',
            'Business hours: Mon–Fri 9AM–6PM (PKT)',
          ],
        },
      ],
    },
  ];
}

function TermsBlockView({ block }: { block: TermsBlock }) {
  if (block.type === 'p') {
    return <p className="mkt-terms-p">{block.text}</p>;
  }

  if (block.type === 'ul') {
    return (
      <ul className="mkt-terms-list">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'h3') {
    return (
      <div className="mkt-terms-sub">
        <h3 className="mkt-terms-sub__title">{block.title}</h3>
        <p className="mkt-terms-p">{block.text}</p>
      </div>
    );
  }

  return (
    <div className={`mkt-terms-callout mkt-terms-callout--${block.variant}`}>
      {block.title && <p className="mkt-terms-callout__title">{block.title}</p>}
      <p className="mkt-terms-callout__text">{block.text}</p>
    </div>
  );
}

export default function TermsPage() {
  const { settings } = useSettings();
  const sections = useMemo(() => buildSections(settings.platformName), [settings.platformName]);
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? 'overview');
  const mainRef = useRef<HTMLDivElement>(null);

  const lastUpdated = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [],
  );

  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id.replace('terms-', ''));
        }
      },
      { root: null, rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.2, 0.5, 1] },
    );

    sections.forEach((section) => {
      const el = document.getElementById(`terms-${section.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`terms-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  return (
    <MarketingPageShell activePath="/terms">
      <section className="mkt-about-hero mkt-terms-hero" data-nav-surface="light">
        <div className="mkt-about-hero__orb mkt-about-hero__orb--a" aria-hidden />
        <div className="mkt-about-hero__orb mkt-about-hero__orb--b" aria-hidden />
        <div className="mkt-faq-hero__grid" aria-hidden />

        <div className="mkt-about-hero__copy">
          <p className="mkt-kicker">Legal</p>
          <h1 className="mkt-about-hero__title">
            <span>Terms of</span>
            <span>
              <span className="mkt-hero__accent">service</span>
            </span>
          </h1>
          <p className="mkt-about-hero__lead">
            The rules and responsibilities that govern your use of {settings.platformName} — written in
            plain language so you know exactly what you are agreeing to.
          </p>
          <p className="mkt-terms-updated">Last updated: {lastUpdated}</p>

          <ul className="mkt-about-hero__pillars">
            <li>
              <MktIcon d={ICONS.check} />
              <span>Educational platform — not financial advice</span>
            </li>
            <li>
              <MktIcon d={ICONS.check} />
              <span>12 sections covering accounts, usage, and liability</span>
            </li>
            <li>
              <MktIcon d={ICONS.check} />
              <span>Questions? Our desk is one click away</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mkt-section mkt-section--faq mkt-terms-body" data-nav-surface="light">
        <div className="mkt-section__inner">
          <div className="mkt-faq-layout mkt-terms-layout">
            <aside className="mkt-faq-sidebar mkt-terms-sidebar">
              <p className="mkt-faq-sidebar__label">On this page</p>
              <nav className="mkt-faq-sidebar__nav" aria-label="Terms sections">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`mkt-faq-sidebar__item${activeSection === section.id ? ' is-active' : ''}`}
                    onClick={() => scrollToSection(section.id)}
                  >
                    <span className="mkt-faq-sidebar__item-icon">
                      <MktIcon d={section.icon} />
                    </span>
                    <span className="mkt-faq-sidebar__item-copy">
                      <span className="mkt-faq-sidebar__item-title">{section.title}</span>
                    </span>
                  </button>
                ))}
              </nav>
            </aside>

            <div ref={mainRef} className="mkt-terms-main">
              {sections.map((section) => (
                <article
                  key={section.id}
                  id={`terms-${section.id}`}
                  className="mkt-terms-section"
                >
                  <header className="mkt-terms-section__head">
                    <span className="mkt-terms-section__icon">
                      <MktIcon d={section.icon} />
                    </span>
                    <h2 className="mkt-terms-section__title">{section.title}</h2>
                  </header>
                  <div className="mkt-terms-section__body">
                    {section.blocks.map((block, index) => (
                      <TermsBlockView key={`${section.id}-${index}`} block={block} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-faq-cta" data-nav-surface="light">
        <div className="mkt-section__inner">
          <div className="mkt-faq-cta__card">
            <div className="mkt-faq-cta__copy">
              <p className="mkt-kicker">Questions about these terms?</p>
              <h2 className="mkt-faq-cta__title">Our desk can clarify anything before you sign up.</h2>
              <p className="mkt-faq-cta__lead">
                Reach out if you need help understanding your rights, account responsibilities, or billing
                terms before creating an account.
              </p>
              <div className="mkt-faq-cta__actions">
                <Link href="/contact" className="mkt-btn mkt-btn--inline mkt-btn--dark">
                  Contact support
                  <MktIcon d={ICONS.arrow} />
                </Link>
                <Link href="/faq" className="mkt-about-hero__ghost mkt-about-hero__ghost--on-dark">
                  Browse FAQ
                </Link>
              </div>
            </div>
            <div className="mkt-faq-cta__aside">
              <div className="mkt-faq-cta__stat">
                <span className="mkt-faq-cta__stat-num">12</span>
                <span className="mkt-faq-cta__stat-lbl">Policy sections</span>
              </div>
              <div className="mkt-faq-cta__stat">
                <span className="mkt-faq-cta__stat-num">18+</span>
                <span className="mkt-faq-cta__stat-lbl">Minimum age</span>
              </div>
              <div className="mkt-faq-cta__stat">
                <span className="mkt-faq-cta__stat-num">24h</span>
                <span className="mkt-faq-cta__stat-lbl">Support response</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
