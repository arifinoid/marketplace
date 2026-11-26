import { CarIcon, HouseIcon, LayersIcon, PackageIcon } from "lucide-react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { CreateSidebar } from "@/components/create/create-sidebar"
import { cn } from "@/lib/utils"

interface ListingType {
  title: string
  description: string
  icon: LucideIcon
  enabled: boolean
  href?: string
}

const LISTING_TYPES: ListingType[] = [
  {
    title: "Item for sale",
    description: "Sell a single item to buyers nearby.",
    icon: PackageIcon,
    enabled: true,
    href: "/create/item",
  },
  {
    title: "Create multiple listings",
    description: "List several items at once.",
    icon: LayersIcon,
    enabled: false,
  },
  {
    title: "Vehicle for sale",
    description: "Cars, trucks, and motorcycles.",
    icon: CarIcon,
    enabled: false,
  },
  {
    title: "Home for sale or rent",
    description: "Houses, apartments, and rooms.",
    icon: HouseIcon,
    enabled: false,
  },
]

function ListingTypeCard({ type }: { type: ListingType }) {
  const icon = <type.icon aria-hidden="true" className="size-5" />
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-fb-soft text-fb">
          {icon}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-medium text-foreground">{type.title}</span>
          {!type.enabled && (
            <span className="text-xs font-medium text-muted-foreground">
              Unavailable
            </span>
          )}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{type.description}</p>
    </>
  )

  const className = cn(
    "flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-shadow",
    type.enabled
      ? "hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      : "cursor-not-allowed opacity-60",
  )

  if (type.enabled && type.href) {
    return (
      <Link href={type.href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <div aria-disabled="true" className={className}>
      {content}
    </div>
  )
}

export default function CreatePage() {
  return (
    <div className="flex flex-col lg:flex-row">
      <CreateSidebar />

      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6">
        <h2 className="text-xl font-semibold tracking-tight">
          Choose listing type
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the option that matches what you are selling.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {LISTING_TYPES.map((type) => (
            <ListingTypeCard key={type.title} type={type} />
          ))}
        </div>
      </section>
    </div>
  )
}
