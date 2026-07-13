import Link from "next/link";

const FEATURES = [
  {
    title: "Content that writes itself",
    body: "Posts, reels, carousels, blogs and email campaigns — tailored to every platform, in your brand voice.",
  },
  {
    title: "Publish everywhere at once",
    body: "Facebook, Instagram, TikTok, YouTube, LinkedIn, X, WhatsApp, Pinterest and Threads from one calendar.",
  },
  {
    title: "Never miss a customer",
    body: "Domo answers DMs and comments 24/7, qualifies leads, books appointments and escalates when a human is needed.",
  },
  {
    title: "A CRM that runs itself",
    body: "Every conversation becomes a scored lead that moves through your funnel automatically.",
  },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--series-1)] text-sm font-bold text-white">
            J
          </span>
          <span className="text-lg font-semibold">Julikana</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-ink-2 hover:text-ink">
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-[var(--series-1)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Start free
          </Link>
        </nav>
      </header>

      <section className="py-20 text-center">
        <p className="mx-auto mb-4 w-fit rounded-full bg-[color-mix(in_srgb,var(--series-1)_12%,transparent)] px-3 py-1 text-xs font-medium text-[var(--series-1)]">
          Meet Domo — your AI marketing employee
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Tell it what you sell.
          <br />
          It does the marketing.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-2">
          &ldquo;I own a restaurant.&rdquo; That&rsquo;s all Domo needs to create content,
          publish across every platform, answer customers and turn conversations into
          paying clients.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-[var(--series-1)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Hire Domo today
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-6 py-3 text-sm font-semibold text-ink ring-1 ring-[var(--ring)] hover:bg-[var(--hairline)]"
          >
            View live demo
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-24 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-[var(--ring)]"
          >
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-ink-2">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted">
        © {new Date().getFullYear()} Julikana. Starter · Professional · Business · Enterprise.
      </footer>
    </main>
  );
}
