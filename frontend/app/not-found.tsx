import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-black px-6 py-16 text-center text-white">
      <p className="text-sm font-semibold tracking-[0.2em] text-emerald-400">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-white/60">
        That link may be outdated or mistyped. Head back home and keep navigating the desk.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
      >
        Back to home
      </Link>
    </main>
  );
}
