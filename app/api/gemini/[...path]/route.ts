import { NextRequest, NextResponse } from 'next/server'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const url = new URL(req.url)

  // Vercel подставляет сегменты динамического роута [...path] как query-параметр
  // с тем же именем ("path"). Google API его не знает и падает с ошибкой
  // "Unknown name 'path': Cannot bind query parameter", поэтому вырезаем его,
  // сохраняя остальные реальные параметры (key, alt=sse и т.д.).
  const searchParams = new URLSearchParams(url.search)
  searchParams.delete('path')
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : ''

  const targetUrl = `${GEMINI_BASE}/${path}${queryString}`

  // ВРЕМЕННЫЙ ДИАГНОСТИЧЕСКИЙ ЛОГ — удалить после отладки
  console.log('[proxy debug] incoming req.url:', req.url)
  console.log('[proxy debug] incoming url.search (raw):', url.search)
  console.log('[proxy debug] outgoing targetUrl:', targetUrl)

  const headers = new Headers()
  
  // Копируем заголовки
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    // Пропускаем hop-by-hop заголовки
    if (!['host', 'connection', 'keep-alive', 'transfer-encoding', 'content-length'].includes(lowerKey)) {
      headers.set(key, value)
    }
  })

  // Устанавливаем правильные заголовки для Gemini
  headers.set('host', 'generativelanguage.googleapis.com')
  headers.set('origin', 'https://generativelanguage.googleapis.com')
  headers.set('referer', 'https://generativelanguage.googleapis.com/')

  const isStreaming = req.method === 'POST' && 
    (url.searchParams.has('alt') && url.searchParams.get('alt') === 'sse' ||
     path.includes('streamGenerateContent'))

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    }

    const response = await fetch(targetUrl, fetchOptions)

    // Для streaming ответов
    if (isStreaming && response.body) {
      const responseHeaders = new Headers(response.headers)
      responseHeaders.set('Access-Control-Allow-Origin', '*')
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      responseHeaders.set('Access-Control-Allow-Headers', '*')
      
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    }

    // Для обычных ответов
    const data = await response.text()
    
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', response.headers.get('Content-Type') || 'application/json')
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', '*')

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: {
          message: `Proxy error: ${error.message}`,
          type: 'proxy_error'
        }
      },
      { status: 500 }
    )
  }
}

// Обрабатываем все HTTP методы
export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  })
}
