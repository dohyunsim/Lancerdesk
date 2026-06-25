import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_KEY = process.env.API_KEY || ''

async function proxyRequest(req: NextRequest, path: string[]): Promise<NextResponse> {
  const token = (await cookies()).get('ld_token')?.value
  const backendPath = '/' + path.join('/')
  const url = `${BACKEND_URL}${backendPath}${req.nextUrl.search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const method = req.method
  let body: string | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.text()
  }

  try {
    const res = await fetch(url, { method, headers, body, cache: 'no-store' })
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    })
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, (await params).path)
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, (await params).path)
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, (await params).path)
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, (await params).path)
}
