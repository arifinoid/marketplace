import { BellIcon, CircleUserRoundIcon, MailIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileNav } from "./mobile-nav"

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-4">
      <MobileNav />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Messages">
          <MailIcon />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <BellIcon />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Profile">
          <CircleUserRoundIcon />
        </Button>
      </div>
    </header>
  )
}
