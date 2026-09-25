import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy — MyBuildy",
  description: "What this website stores about you (almost nothing) and why.",
  alternates: { canonical: "/privacy" },
};

const link = "underline decoration-orange/60 underline-offset-4 transition-colors hover:decoration-orange";

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto max-w-[44rem] px-4 py-16 sm:px-6 sm:py-24">
      <Link href="/" className={`text-small text-muted ${link}`}>
        ← Back to MyBuildy
      </Link>
      <h1 className="mt-8 text-section font-bold tracking-[-0.02em]">Privacy</h1>
      <p className="mt-3 text-small text-muted">Plain English, no small print.</p>

      <div className="mt-10 space-y-10 text-body text-text/90">
        <section>
          <h2 className="text-note font-bold text-text">What this website stores</h2>
          <p className="mt-3">
            Nothing about you, except what you choose to type in. After you download MyBuildy, a panel offers a few
            optional questions: your first name, your email, what you hope to build, which coding agent you use and
            how you&rsquo;d describe yourself. If you answer and press Submit, those answers are saved together with
            which download you chose (Windows or Mac) and the time. Skip them and nothing is saved.
          </p>
          <p className="mt-3">
            Your IP address and browser details are <strong>not</strong> saved with your answers. To stop the form
            being flooded, it counts submissions per visitor for up to an hour using a scrambled, one-way code
            that is kept only in the server&rsquo;s memory and is never written down.
          </p>
          <p className="mt-3">
            Your browser remembers one thing locally: that you&rsquo;ve already seen the questions, so they
            don&rsquo;t show again. That stays on your device and is never sent anywhere.
          </p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">No analytics, no tracking</h2>
          <p className="mt-3">
            There are no analytics, no tracking scripts, no advertising and no tracking cookies on this site.
          </p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">Your email</h2>
          <p className="mt-3">
            If you give it, your email is used only to tell you about new MyBuildy releases. No newsletter, never
            shared or sold, and you can unsubscribe any time. To have your answers deleted, reply to any update email
            or{" "}
            <a href={`${REPO_URL}/issues`} className={link}>
              open an issue on GitHub
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">The services this site relies on</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              The site is hosted on Vercel, which, like every web host, keeps short-lived technical request logs to
              run and protect the service. They are not used to track you.
            </li>
            <li>
              If you answer the optional questions, your answers are stored in a private Supabase database that only
              this site&rsquo;s server can read.
            </li>
            <li>The installers download from GitHub, where the source code and releases live.</li>
            <li>
              If a demo video is shown, it comes from YouTube&rsquo;s privacy-enhanced mode and only loads when you
              press play.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-note font-bold text-text">The app itself</h2>
          <p className="mt-3">
            MyBuildy the desktop app has no telemetry. It sends screenshots of the one window you pick, plus your
            project&rsquo;s memory, only to the AI provider you choose, using your own key. Details are in the{" "}
            <a href={`${REPO_URL}#privacy-and-data`} className={link}>
              README
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
