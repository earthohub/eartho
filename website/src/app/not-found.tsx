import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
      <h1 className="font-serif text-4xl font-medium text-teal-950">404</h1>
      <p className="mt-4 text-stone-600">Page not found</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-teal-900 px-6 py-3 text-sm font-medium text-white hover:bg-teal-800"
      >
        Home
      </Link>
    </div>
  );
}
