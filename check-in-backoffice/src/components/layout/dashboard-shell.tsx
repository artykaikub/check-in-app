'use client'

import {
  AlertTriangle,
  CalendarCheck,
  CircleDollarSign,
  LogOut,
  MapPinned,
  PanelLeft,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { clearStoredSession } from '@/lib/api/session'
import { cn } from '@/lib/utils'

const navigation = [
  {
    label: 'Users',
    href: '/dashboard/users',
    icon: Users
  },
  {
    label: 'Work areas',
    href: '/dashboard/work-areas',
    icon: MapPinned
  },
  {
    label: 'Attendance',
    href: '/dashboard/attendance',
    icon: CalendarCheck
  },
  {
    label: 'Emergency',
    href: '/dashboard/emergency',
    icon: AlertTriangle
  },
  {
    label: 'Salary',
    href: '/dashboard/salary',
    icon: CircleDollarSign
  }
] as const

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  function handleSignOut() {
    clearStoredSession()
    router.replace('/login')
  }

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <PanelLeft className="size-4" />
          </div>
          <span className="text-sm font-semibold">Check-in</span>
        </div>
        <Separator />
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground',
                pathname === item.href && 'bg-accent text-accent-foreground'
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <span className="text-sm font-medium">Backoffice</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  )
}
