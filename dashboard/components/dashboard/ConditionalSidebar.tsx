'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const HIDE_SIDEBAR_PATHS = ['/login', '/privacy']

export default function ConditionalSidebar() {
  const pathname = usePathname()
  const hide = HIDE_SIDEBAR_PATHS.some(p => pathname.startsWith(p))
  if (hide) return null
  return <Sidebar />
}
