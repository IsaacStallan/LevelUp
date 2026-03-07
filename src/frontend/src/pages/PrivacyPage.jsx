import { Link } from 'react-router-dom';

function Section({ title, children }) {
  return (
    <div className="glass-card rounded-2xl border border-white/[0.07] p-6 space-y-3">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="text-sm text-gray-400 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-md bg-black/40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold tracking-tight logo-glow">🔥 Vivify</Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Back</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: March 2025 · Governing law: NSW, Australia</p>
        </div>

        <Section title="1. Who We Are">
          <p>Vivify ("we", "us", "our") is a habit-tracking platform operated from New South Wales, Australia. We are committed to protecting your personal information in accordance with the Australian Privacy Principles (APPs) under the <em>Privacy Act 1988</em> (Cth).</p>
          <p>Contact us at: <a href="mailto:support@vivify.au" className="text-purple-400 hover:text-purple-300">support@vivify.au</a></p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect the following personal information when you create an account and use Vivify:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li><strong className="text-gray-300">Account data:</strong> email address, username, hashed password, account creation date</li>
            <li><strong className="text-gray-300">Habit data:</strong> habit names, descriptions, icons, colours, completion logs, streaks, XP earned</li>
            <li><strong className="text-gray-300">Usage data:</strong> login timestamps, AI insights usage count</li>
            <li><strong className="text-gray-300">Subscription data:</strong> subscription status and renewal dates (payment details are handled entirely by Lemon Squeezy — we never see your card number)</li>
          </ul>
          <p>We do <strong className="text-white">not</strong> collect cookies, device fingerprints, or tracking data.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your information solely to provide and improve the Vivify service:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Authenticating your account and keeping it secure</li>
            <li>Displaying your habits, XP, level, and leaderboard ranking</li>
            <li>Processing your subscription and unlocking Pro features</li>
            <li>Generating AI coaching insights (Pro users only) — your habit data is sent to the Anthropic API for analysis</li>
            <li>Sending transactional emails (welcome, streak risk warnings) — only if you have not opted out</li>
          </ul>
          <p>We never sell, rent, or trade your personal information to third parties for marketing purposes.</p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>Vivify integrates with the following third-party services. Each has its own privacy policy:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li><strong className="text-gray-300">Lemon Squeezy</strong> — payment processing for Pro subscriptions. They receive your email and payment information. <a href="https://www.lemonsqueezy.com/privacy" className="text-purple-400">lemonsqueezy.com/privacy</a></li>
            <li><strong className="text-gray-300">Anthropic API</strong> — powers AI coaching insights for Pro users. Your anonymised habit statistics (not your name or email) are sent for analysis.</li>
            <li><strong className="text-gray-300">Railway</strong> — our cloud hosting provider. Your data is stored on Railway-managed PostgreSQL servers.</li>
            <li><strong className="text-gray-300">Plausible Analytics</strong> — privacy-friendly, cookieless website analytics. No personal data is collected or shared. <a href="https://plausible.io/privacy" className="text-purple-400">plausible.io/privacy</a></li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>We retain your personal data for as long as your account is active. If you delete your account, all associated data (habits, logs, subscription records) is permanently deleted within 30 days.</p>
          <p>To request deletion, email <a href="mailto:support@vivify.au" className="text-purple-400 hover:text-purple-300">support@vivify.au</a> with the subject line "Delete my account".</p>
        </Section>

        <Section title="6. Security">
          <p>We take reasonable steps to protect your information:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Passwords are hashed using bcrypt with a cost factor of 12</li>
            <li>All data is transmitted over HTTPS with HSTS enabled</li>
            <li>JWT tokens expire after 7 days</li>
            <li>Account lockout after 5 failed login attempts</li>
          </ul>
          <p>No method of electronic storage is 100% secure. We cannot guarantee absolute security.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>Under Australian privacy law, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and data</li>
            <li>Complain to the Office of the Australian Information Commissioner (OAIC) if you believe we have breached the APPs</li>
          </ul>
          <p>To exercise any of these rights, contact <a href="mailto:support@vivify.au" className="text-purple-400 hover:text-purple-300">support@vivify.au</a>.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. Material changes will be notified via email or a notice in the app. Continued use of Vivify after changes constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="9. Contact">
          <p>For any privacy questions or concerns, contact us at <a href="mailto:support@vivify.au" className="text-purple-400 hover:text-purple-300">support@vivify.au</a>. We aim to respond within 5 business days.</p>
        </Section>
      </main>

      <footer className="border-t border-white/[0.06] py-8 mt-8">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <span className="font-semibold text-gray-500">🔥 Vivify</span>
          <div className="flex items-center gap-6">
            <a href="mailto:support@vivify.au" className="hover:text-gray-400 transition-colors">support@vivify.au</a>
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
