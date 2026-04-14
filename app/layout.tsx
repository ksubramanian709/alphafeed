import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'market-feed',
  description: 'Real-time market data platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
