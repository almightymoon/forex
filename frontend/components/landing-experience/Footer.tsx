'use client';

import { useState } from 'react';
import Link from 'next/link';

const MAPS_ADDR =
  'https://www.google.com/maps/search/?api=1&query=Johar+Baru+Kuala+Lumpur+Malaysia';

const BRAND_WORDMARK = 'thefxnavigator';
const EMAIL_GENERAL = 'hello@thefxnavigator.com';
const EMAIL_BUSINESS = 'business@thefxnavigator.com';

function IconArrowUp() {
  return (
    <svg
      className="site-footer__to-top-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export default function Footer() {
  const [newsletterSubbed, setNewsletterSubbed] = useState(false);
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="site-footer" aria-label="Footer" data-nav-surface="light">
      <div className="site-footer__inner">
        <div className="site-footer__main">
          <div className="site-footer__grid">
            <a
              className="site-footer__addr"
              href={MAPS_ADDR}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="site-footer__addr-line">Forest City</div>
              <div className="site-footer__addr-line">Johar Baru</div>
              <div className="site-footer__addr-line">Kuala Lumpur</div>
              <div className="site-footer__addr-line">Malaysia</div>
            </a>

            <div className="site-footer__mid">
              <div className="site-footer__social">
                <a href="https://x.com" target="_blank" rel="noopener noreferrer">
                  Twitter / X
                </a>
                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
                <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              </div>

              <div className="site-footer__contact">
                <div className="site-footer__email-block">
                  <div className="site-footer__email-label">General enquiries</div>
                  <a className="site-footer__email-value" href={`mailto:${EMAIL_GENERAL}`}>
                    {EMAIL_GENERAL}
                  </a>
                </div>

                <div className="site-footer__email-block">
                  <div className="site-footer__email-label">New business</div>
                  <a className="site-footer__email-value" href={`mailto:${EMAIL_BUSINESS}`}>
                    {EMAIL_BUSINESS}
                  </a>
                </div>
              </div>
            </div>

            <div className="site-footer__news">
              <h3 className="site-footer__news-title">
                Subscribe to
                <br />
                our newsletter
              </h3>

              {newsletterSubbed ? (
                <p className="site-footer__news-done" role="status">
                  Thanks — you&apos;re on the list.
                </p>
              ) : (
                <form
                  className="site-footer__news-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNewsletterSubbed(true);
                  }}
                >
                  <input
                    type="email"
                    name="email"
                    placeholder="Your email"
                    autoComplete="email"
                    required
                  />
                  <button type="submit" aria-label="Subscribe">
                    <span className="site-footer__news-arrow" aria-hidden>
                      →
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__copy">© {year} {BRAND_WORDMARK}</div>
          <Link href="/faq" className="site-footer__labs">
            FAQ &amp; help
          </Link>
          <div className="site-footer__built">Built with ❤️</div>
        </div>

        <a className="site-footer__to-top" href="#top" aria-label="Back to top">
          <IconArrowUp />
        </a>
      </div>
    </footer>
  );
}