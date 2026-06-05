import type { Metadata } from 'next'
import 'leaflet/dist/leaflet.css'
import './globals.css'
import { AppProviders } from '@/components/providers/app-providers'

export const metadata: Metadata = {
  title: 'Check-in Backoffice',
  description: 'Backoffice console for the check-in platform.'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
