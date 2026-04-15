import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AlphaFeed',
  description: 'Real-time market intelligence and AI-powered analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
