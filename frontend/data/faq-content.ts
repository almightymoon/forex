export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  description: string;
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    description: 'Accounts, onboarding, and your first steps on the platform.',
    items: [
      {
        question: 'How do I create an account?',
        answer:
          'Click "Get started" on the homepage, complete registration, verify your email, and you\'re ready to access the platform.',
      },
      {
        question: 'Is there a free trial available?',
        answer:
          'We offer introductory access for new users. Check current packages on the homepage for what\'s included at signup.',
      },
      {
        question: 'What do I need to get started?',
        answer:
          'A computer or mobile device with internet access is enough. No prior trading experience is required — we start from fundamentals.',
      },
      {
        question: 'Can I access courses on mobile devices?',
        answer:
          'Yes. The platform is fully responsive on phones and tablets, so you can learn and follow sessions from anywhere.',
      },
    ],
  },
  {
    id: 'courses',
    title: 'Courses & learning',
    description: 'Curriculum structure, access periods, and certification.',
    items: [
      {
        question: 'What types of courses do you offer?',
        answer:
          'Courses cover forex basics, technical and fundamental analysis, risk management, and advanced execution frameworks.',
      },
      {
        question: 'How long do I have access to courses?',
        answer:
          'Enrolled students retain access to their course materials for the duration of their active membership or package term.',
      },
      {
        question: 'Are there prerequisites for the courses?',
        answer:
          'Beginner tracks require no prior knowledge. Advanced modules list prerequisites clearly in each course description.',
      },
      {
        question: 'Can I get a certificate after completing a course?',
        answer:
          'Yes. Certificates are issued when you meet the completion requirements defined for that course or program.',
      },
      {
        question: 'How do I track my progress?',
        answer:
          'Your dashboard tracks lesson completion, quizzes, and assignments automatically as you move through each course.',
      },
    ],
  },
  {
    id: 'signals',
    title: 'Trading signals',
    description: 'How signals work, frequency, and responsible usage.',
    items: [
      {
        question: 'What are trading signals?',
        answer:
          'Signals are educational trade setups with entry, stop-loss, and take-profit levels plus the reasoning behind each idea.',
      },
      {
        question: 'How accurate are your trading signals?',
        answer:
          'No signal is guaranteed. We focus on process and risk management — always validate setups and never risk more than you can afford to lose.',
      },
      {
        question: 'How often do you provide signals?',
        answer:
          'Frequency depends on market conditions. We publish when high-quality setups meet our desk criteria, not on a fixed schedule.',
      },
      {
        question: 'Can I use signals for live trading?',
        answer:
          'Signals are educational. Practice on demo first, understand the thesis, and apply your own risk rules before going live.',
      },
    ],
  },
  {
    id: 'live-sessions',
    title: 'Live sessions',
    description: 'Schedules, Q&A access, and session replays.',
    items: [
      {
        question: 'What are live trading sessions?',
        answer:
          'Live sessions are real-time market reviews where mentors walk through structure, bias, and execution with the community.',
      },
      {
        question: 'How often are live sessions held?',
        answer:
          'Sessions typically run several times per week, with additional coverage around high-impact news events.',
      },
      {
        question: 'Can I ask questions during live sessions?',
        answer:
          'Yes. Most sessions include live Q&A via chat so you can clarify setups, risk, or platform questions in real time.',
      },
      {
        question: 'Are live sessions recorded?',
        answer:
          'Most sessions are recorded and available for replay in your dashboard for a limited period after the live event.',
      },
    ],
  },
  {
    id: 'community',
    title: 'Community & support',
    description: 'Forums, peer learning, and mentorship options.',
    items: [
      {
        question: 'Is there a community forum?',
        answer:
          'Yes. Students can discuss strategies, share progress, and get help from peers and mentors inside the community area.',
      },
      {
        question: 'How can I get help if I\'m stuck?',
        answer:
          'Open a support request via the contact page or email the desk. We typically respond within 24 hours on business days.',
      },
      {
        question: 'Can I connect with other students?',
        answer:
          'Absolutely. Community channels are built for peer learning, accountability, and sharing wins from the same playbook.',
      },
      {
        question: 'Do you offer one-on-one mentoring?',
        answer:
          'Premium coaching packages include direct mentorship. Contact the desk to discuss availability and fit.',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing & payments',
    description: 'Plans, payments, refunds, and subscription changes.',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer:
          'We support major cards and local payment options shown at checkout. Available methods may vary by region.',
      },
      {
        question: 'Can I cancel my subscription anytime?',
        answer:
          'Yes. You can cancel from your account settings and retain access through the end of your current billing period.',
      },
      {
        question: 'Do you offer refunds?',
        answer:
          'Refund eligibility depends on your package and timing. Contact support with your account email for a case-by-case review.',
      },
      {
        question: 'Are there any hidden fees?',
        answer:
          'No hidden fees. The price shown at checkout is the price you pay, including any applicable taxes where required.',
      },
      {
        question: 'Can I upgrade or downgrade my plan?',
        answer:
          'Yes. Plan changes can be requested through support or your billing settings and take effect on the next cycle.',
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical support',
    description: 'Browsers, playback issues, downloads, and security.',
    items: [
      {
        question: 'What browsers are supported?',
        answer:
          'We support current versions of Chrome, Firefox, Safari, and Edge. Keep your browser updated for the best experience.',
      },
      {
        question: 'Why is a video not loading?',
        answer:
          'Try refreshing, clearing cache, or switching networks. If it persists, contact support with the course and lesson name.',
      },
      {
        question: 'Can I download course materials?',
        answer:
          'Some resources are downloadable; others are stream-only. Each course page indicates what\'s available offline.',
      },
      {
        question: 'Is my data secure?',
        answer:
          'We use industry-standard encryption and access controls to protect your account and payment information.',
      },
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile access',
    description: 'Apps, device sync, and mobile feature availability.',
    items: [
      {
        question: 'Is there a mobile app?',
        answer:
          'The platform works in mobile browsers today. Native app availability may vary — check announcements for updates.',
      },
      {
        question: 'Can I sync progress between devices?',
        answer:
          'Yes. Progress syncs automatically when you\'re signed into the same account on any supported device.',
      },
      {
        question: 'Are all features available on mobile?',
        answer:
          'Core learning, community, and session access work on mobile. Some advanced admin or creator tools are desktop-first.',
      },
      {
        question: 'Can I watch videos offline?',
        answer:
          'Offline viewing depends on the course and device. Stream-first access is the default across the platform.',
      },
    ],
  },
];

export function getAllFaqItems(): FaqItem[] {
  return FAQ_CATEGORIES.flatMap((category) => category.items);
}
