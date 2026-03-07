import { Link } from 'react-router-dom';

function Section({ title, children }) {
  return (
    <div className="glass-card rounded-2xl border border-white/[0.07] p-6 space-y-3">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="text-sm text-gray-400 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function TermsPage() {
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
          <h1 className="text-3xl font-black text-white mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: March 2025 · Governing law: NSW, Australia</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By creating an account or using Vivify ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the Service.</p>
          <p>These Terms form a binding agreement between you and Vivify, operated from New South Wales, Australia. By continuing to use the Service after any updates to these Terms, you accept the revised Terms.</p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 13 years of age to use Vivify. By using the Service, you represent that you meet this requirement. If you are under 18, you represent that a parent or guardian has reviewed and consented to these Terms.</p>
        </Section>

        <Section title="3. Your Account">
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at <a href="mailto:support@vivify.au" className="text-purple-400 hover:text-purple-300">support@vivify.au</a> if you suspect unauthorised access.</p>
          <p>You may only create one account per person. Accounts are non-transferable.</p>
        </Section>

        <Section title="4. Subscription and Payments">
          <p>Vivify offers a free tier and a Pro subscription at <strong className="text-white">$7.00 AUD per month</strong> (or the local currency equivalent displayed at checkout).</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Pro subscriptions are billed monthly and renew automatically</li>
            <li>You may cancel at any time from your subscription settings — cancellation takes effect at the end of the current billing period</li>
            <li>Payments are processed by <strong className="text-gray-300">Lemon Squeezy</strong>. Vivify does not store your payment card details</li>
            <li>Refunds are handled on a case-by-case basis — contact <a href="mailto:support@vivify.au" className="text-purple-400 hover:text-purple-300">support@vivify.au</a> within 7 days of a charge if you believe it was made in error</li>
            <li>Prices may change with 30 days' notice to existing subscribers</li>
          </ul>
        </Section>

        <Section title="5. Free Trial and Beta">
          <p>Vivify is currently in beta. Features are provided on an as-is basis and may change without notice. We reserve the right to modify, suspend, or discontinue any feature at any time.</p>
        </Section>

        <Section title="6. User Conduct">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
            <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</li>
            <li>Use automated tools to scrape, crawl, or extract data from the Service</li>
            <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
            <li>Upload, transmit, or share any content that is harmful, defamatory, obscene, or infringes any third-party rights</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these rules without notice.</p>
        </Section>

        <Section title="7. AI-Generated Content">
          <p>Vivify Pro includes AI coaching insights powered by Anthropic's Claude API. These insights are generated automatically based on your habit data and are provided for <strong className="text-white">informational and motivational purposes only</strong>.</p>
          <p>AI insights do not constitute professional medical, psychological, or health advice. Do not rely on them as a substitute for professional guidance. Vivify makes no representations about the accuracy, completeness, or fitness for purpose of AI-generated content.</p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>All content, features, and functionality of the Vivify platform — including but not limited to the design, text, graphics, logos, and software — are owned by or licensed to Vivify and are protected by applicable intellectual property laws.</p>
          <p>You retain ownership of the habit data and content you create. By using the Service, you grant Vivify a limited, non-exclusive licence to process your data as necessary to provide the Service.</p>
          <p>You may not copy, modify, distribute, reverse-engineer, or create derivative works from any part of the Service without our express written consent.</p>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p>The Service is provided <strong className="text-white">"as is"</strong> and <strong className="text-white">"as available"</strong> without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
          <p>We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.</p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>To the maximum extent permitted by law, Vivify shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, even if we have been advised of the possibility of such damages.</p>
          <p>Our total cumulative liability to you for any claims arising out of or related to the Service shall not exceed the amount you paid to Vivify in the 12 months preceding the claim.</p>
        </Section>

        <Section title="11. Termination">
          <p>We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice, and without liability to you. Upon termination, your right to use the Service ceases immediately.</p>
          <p>You may delete your account at any time by contacting <a href="mailto:support@vivify.au" className="text-purple-400 hover:text-purple-300">support@vivify.au</a>.</p>
        </Section>

        <Section title="12. Governing Law and Disputes">
          <p>These Terms are governed by the laws of <strong className="text-white">New South Wales, Australia</strong>, without regard to its conflict-of-law provisions. You agree that any disputes arising from these Terms or the Service will be subject to the exclusive jurisdiction of the courts of NSW, Australia.</p>
          <p>Before commencing formal proceedings, both parties agree to attempt to resolve disputes informally by contacting <a href="mailto:support@vivify.au" className="text-purple-400 hover:text-purple-300">support@vivify.au</a>.</p>
        </Section>

        <Section title="13. Contact">
          <p>For any questions about these Terms, contact us at <a href="mailto:support@vivify.au" className="text-purple-400 hover:text-purple-300">support@vivify.au</a>. We aim to respond within 5 business days.</p>
        </Section>
      </main>

      <footer className="border-t border-white/[0.06] py-8 mt-8">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <span className="font-semibold text-gray-500">🔥 Vivify</span>
          <div className="flex items-center gap-6">
            <a href="mailto:support@vivify.au" className="hover:text-gray-400 transition-colors">support@vivify.au</a>
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
