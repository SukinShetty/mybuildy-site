import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LICENSE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms — MyBuildy",
  description: "The terms for using the MyBuildy website and app, in plain English.",
  alternates: { canonical: "/terms" },
};

const link = "underline decoration-orange/60 underline-offset-4 transition-colors hover:decoration-orange";

export default function TermsPage() {
  return (
    <main id="main" className="mx-auto max-w-[44rem] px-4 py-16 sm:px-6 sm:py-24">
      <Link href="/" className={`text-small text-muted ${link}`}>
        ← Back to MyBuildy
      </Link>
      <h1 className="mt-8 text-section font-bold tracking-[-0.02em]">Terms</h1>
      <p className="mt-3 text-small text-muted">Last updated: 25 September 2026</p>

      <div className="mt-10 space-y-10 text-body text-text/90">
        <section>
          <h2 className="text-note font-bold text-text">What MyBuildy is</h2>
          <p className="mt-3">
            MyBuildy is a free desktop companion that watches your AI coding agent&rsquo;s window and suggests what to
            do next. The software itself is licensed under the{" "}
            <a href={LICENSE_URL} className={link}>
              PolyForm Shield License 1.0.0
            </a>
            . These terms cover the website and your use of the app.
          </p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">AI suggestions can be wrong</h2>
          <p className="mt-3">
            MyBuildy never runs anything on its own. It pastes a suggested prompt into your terminal and you decide
            whether to press Enter. You are responsible for what runs on your computer. Keep your work in git or
            backed up.
          </p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">Your AI provider</h2>
          <p className="mt-3">
            You use your own API key and pay your provider directly. Their terms and privacy policy apply to what you
            send them. MyBuildy has no access to your provider account beyond the key you store on your own computer.
          </p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">No warranty</h2>
          <p className="mt-3">
            MyBuildy is provided as is, without warranties of any kind. To the extent the law allows, Solution Forge
            Labs is not liable for any loss or damage arising from using it.
          </p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">The website and the signup form</h2>
          <p className="mt-3">
            Please give accurate details. We&rsquo;ll only email you about MyBuildy releases. How your details are
            stored and deleted is on the{" "}
            <Link href="/privacy" className={link}>
              Privacy
            </Link>{" "}
            page.
          </p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">Changes</h2>
          <p className="mt-3">We may update these terms. The date at the top shows the latest version.</p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">Law</h2>
          <p className="mt-3">
            These terms are governed by the laws of India, and the courts of Bengaluru, Karnataka have jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">Contact</h2>
          <p className="mt-3">
            <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
