import type { Metadata } from 'next'
import './globals.css'
import ConditionalSidebar from '@/components/dashboard/ConditionalSidebar'

export const metadata: Metadata = {
  title: 'Lancerdesk',
  description: 'AI-powered CRM for soomgo.com freelancers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="flex h-screen overflow-hidden">
          <ConditionalSidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  )
}
