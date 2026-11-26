import Link from "next/link"

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-fb text-base font-bold text-white"
      >
        F
      </span>
      <span className="text-lg font-semibold tracking-tight">Marketplace</span>
    </Link>
  )
}
