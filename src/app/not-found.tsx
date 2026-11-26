import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The listing you are looking for does not exist or the link is wrong.
      </p>
      <Link
        href="/"
        className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        Back to Marketplace
      </Link>
    </div>
  )
}
