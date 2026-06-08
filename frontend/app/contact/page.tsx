'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
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
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z',
  chevron: 'M6 9l6 6 6-6',
} as const;

const CONTACT_INFO = [
  {
    icon: ICONS.mail,
    title: 'Email us',
    details: ['thefxnavigators@gmail.com'],
    meta: 'We typically respond within 24 hours',
  },
  {
    icon: ICONS.phone,
    title: 'Call us',
    details: ['+92 348 8566147', '0348 8566147'],
    meta: 'Mon–Fri 9AM–6PM (PKT)',
  },
  {
    icon: ICONS.clock,
    title: 'Business hours',
    details: ['Monday – Friday: 9:00 AM – 6:00 PM', 'Saturday: 10:00 AM – 4:00 PM'],
    meta: 'Sunday: closed',
  },
] as const;

const INQUIRY_TYPES = [
  { value: 'general', label: 'General inquiry' },
  { value: 'support', label: 'Technical support' },
  { value: 'billing', label: 'Billing & payments' },
  { value: 'course', label: 'Course questions' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'consultation', label: 'Book consultation' },
] as const;

const FAQ_ITEMS = [
  {
    question: 'How quickly do you respond?',
    answer:
      'We aim to reply within 24 hours on business days. Urgent technical issues are prioritised.',
  },
  {
    question: 'Can I book a one-on-one consultation?',
    answer:
      'Yes. Choose “Book consultation” in the form and our team will follow up with available slots.',
  },
  {
    question: 'What should I include in my message?',
    answer:
      'Your account email, package name, and a short description of the issue help us resolve requests faster.',
  },
] as const;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: 'general',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        inquiryType: 'general',
      });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MarketingPageShell activePath="/contact">
      <section className="mkt-hero" data-nav-surface="light">
        <div className="mkt-hero__inner">
          <p className="mkt-kicker">Support · Mentorship · Partnerships</p>
          <h1 className="mkt-hero__title">
            <span>
              Get in <span className="mkt-hero__accent">touch</span>
            </span>
            <span>with our desk</span>
          </h1>
          <p className="mkt-hero__lead">
            Questions about courses, billing, or platform access? Reach the team behind THEFXNAVIGATORS —
            we help traders move from curiosity to confident execution.
          </p>

          <div className="mkt-hero__stats">
            {[
              { num: '24h', lbl: 'Typical response' },
              { num: '2000+', lbl: 'Active traders' },
              { num: '98%', lbl: 'Satisfaction rate' },
              { num: '5★', lbl: 'Support rating' },
            ].map((stat) => (
              <div key={stat.lbl} className="mkt-stat">
                <span className="mkt-stat__num">{stat.num}</span>
                <span className="mkt-stat__lbl">{stat.lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section--light mkt-section--divider" data-nav-surface="light">
        <div className="mkt-section__inner mkt-grid">
          <div className="mkt-card">
            <div className="mkt-card__head">
              <div className="mkt-card__icon">
                <MktIcon d={ICONS.message} />
              </div>
              <h2 className="mkt-card__title">Send a message</h2>
            </div>

            <form className="mkt-form" onSubmit={handleSubmit}>
              <div className="mkt-form__row">
                <div className="mkt-field">
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="mkt-field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@email.com"
                    required
                  />
                </div>
              </div>

              <div className="mkt-field">
                <label htmlFor="inquiryType">Inquiry type</label>
                <select
                  id="inquiryType"
                  name="inquiryType"
                  value={formData.inquiryType}
                  onChange={handleInputChange}
                >
                  {INQUIRY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mkt-field">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Brief summary"
                  required
                />
              </div>

              <div className="mkt-field">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={10}
                  placeholder="Tell us how we can help..."
                  required
                />
              </div>

              {submitStatus === 'success' && (
                <div className="mkt-alert mkt-alert--success" role="status">
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                  <span>Thanks — your message was sent. We&apos;ll get back to you shortly.</span>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mkt-alert mkt-alert--error" role="alert">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>Something went wrong. Please try again or email us directly.</span>
                </div>
              )}

              <button type="submit" className="mkt-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0b0b0f]/20 border-t-[#0b0b0f]" />
                    Sending
                  </>
                ) : (
                  <>
                    <MktIcon d={ICONS.send} />
                    Send message
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mkt-info-stack">
            <div>
              <h2 className="mkt-section__heading">Contact channels</h2>
              <p className="mkt-section__sub">
                Pick the channel that suits you. For account access issues, include the email you used to register.
              </p>
            </div>

            {CONTACT_INFO.map((item) => (
              <div key={item.title} className="mkt-info-card">
                <div className="mkt-info-card__icon">
                  <MktIcon d={item.icon} />
                </div>
                <div>
                  <h3 className="mkt-info-card__title">{item.title}</h3>
                  {item.details.map((detail) => (
                    <p key={detail} className="mkt-info-card__detail">
                      {detail}
                    </p>
                  ))}
                  <p className="mkt-info-card__meta">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section--light mkt-section--faq" data-nav-surface="light">
        <div className="mkt-section__inner">
          <h2 className="mkt-section__heading">Quick answers</h2>
          <p className="mkt-section__sub">
            Common questions before you write in. For more detail, visit the FAQ page.
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
    </MarketingPageShell>
  );
}
