const express = require('express');

const router = express.Router();

const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'rocket-outline',
    color: '#3AADFF',
    items: [
      { question: 'How do I create an account?', answer: "Click \"Get started\" on the homepage, complete registration, verify your email, and you're ready to access the platform." },
      { question: 'Is there a free trial available?', answer: "We offer introductory access for new users. Check current packages on the homepage for what's included at signup." },
      { question: 'What do I need to get started?', answer: 'A computer or mobile device with internet access is enough. No prior trading experience is required — we start from fundamentals.' },
      { question: 'Can I access courses on mobile?', answer: 'Yes. The platform is fully responsive on phones and tablets, so you can learn and follow sessions from anywhere.' },
    ],
  },
  {
    id: 'courses',
    title: 'Courses & Learning',
    icon: 'book-outline',
    color: '#A78BFA',
    items: [
      { question: 'What types of courses do you offer?', answer: 'Courses cover forex basics, technical and fundamental analysis, risk management, and advanced execution frameworks.' },
      { question: 'How long do I have access to courses?', answer: 'Enrolled students retain access to their course materials for the duration of their active membership or package term.' },
      { question: 'Are there prerequisites?', answer: 'Beginner tracks require no prior knowledge. Advanced modules list prerequisites clearly in each course description.' },
      { question: 'Can I get a certificate after completing a course?', answer: 'Yes. Certificates are issued when you meet the completion requirements defined for that course or program.' },
      { question: 'How do I track my progress?', answer: 'Your dashboard tracks lesson completion, quizzes, and assignments automatically as you move through each course.' },
    ],
  },
  {
    id: 'signals',
    title: 'Trading Signals',
    icon: 'trending-up-outline',
    color: '#4ADE80',
    items: [
      { question: 'What are trading signals?', answer: 'Signals are educational trade setups with entry, stop-loss, and take-profit levels plus the reasoning behind each idea.' },
      { question: 'How accurate are the signals?', answer: "No signal is guaranteed. We focus on process and risk management — always validate setups and never risk more than you can afford to lose." },
      { question: 'How often are signals published?', answer: 'Frequency depends on market conditions. We publish when high-quality setups meet our desk criteria, not on a fixed schedule.' },
      { question: 'Can I use signals for live trading?', answer: 'Signals are educational. Practice on demo first, understand the thesis, and apply your own risk rules before going live.' },
    ],
  },
  {
    id: 'live-sessions',
    title: 'Live Sessions',
    icon: 'videocam-outline',
    color: '#FFC107',
    items: [
      { question: 'What are live trading sessions?', answer: 'Real-time market reviews where mentors walk through structure, bias, and execution with the community.' },
      { question: 'How often are live sessions held?', answer: 'Sessions typically run several times per week, with additional coverage around high-impact news events.' },
      { question: 'Can I ask questions during live sessions?', answer: 'Yes. Most sessions include live Q&A via chat so you can clarify setups, risk, or platform questions in real time.' },
      { question: 'Are live sessions recorded?', answer: 'Most sessions are recorded and available for replay in your dashboard for a limited period after the live event.' },
    ],
  },
  {
    id: 'billing',
    title: 'Billing & Payments',
    icon: 'wallet-outline',
    color: '#FB923C',
    items: [
      { question: 'What payment methods do you accept?', answer: 'We support USDT (Binance), JazzCash, and EasyPaisa. Available methods are shown at checkout.' },
      { question: 'Can I cancel my subscription anytime?', answer: 'Yes. You can cancel from your account settings and retain access through the end of your current billing period.' },
      { question: 'Do you offer refunds?', answer: 'Refund eligibility depends on your package and timing. Contact support with your account email for a case-by-case review.' },
      { question: 'Are there any hidden fees?', answer: 'No hidden fees. The price shown at checkout is the price you pay, including any applicable taxes where required.' },
      { question: 'Can I upgrade my plan?', answer: 'Yes. Plan changes can be requested through support and take effect on the next billing cycle.' },
    ],
  },
  {
    id: 'technical',
    title: 'Technical Help',
    icon: 'settings-outline',
    color: 'rgba(255,255,255,0.6)',
    items: [
      { question: 'Why is a video not loading?', answer: 'Try refreshing, clearing cache, or switching networks. If it persists, contact support with the course and lesson name.' },
      { question: 'I forgot my password — what do I do?', answer: "Use \"Forgot password\" on the login screen. A reset link will be emailed to your registered address." },
      { question: 'My account was locked. How do I unlock it?', answer: 'Accounts lock after multiple failed login attempts. Email support with your account email and we\'ll review it.' },
      { question: 'How do I update my profile details?', answer: 'Go to Profile in the app and tap Edit to change your name, phone number, or country.' },
    ],
  },
];

// @route   GET /api/faq
// @desc    Get FAQ categories and items
// @access  Public
router.get('/', (req, res) => {
  res.json({
    success: true,
    categories: FAQ_CATEGORIES,
  });
});

module.exports = router;
