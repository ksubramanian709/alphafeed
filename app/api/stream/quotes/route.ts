export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { BACKEND } from '@/lib/backend'

const BACKEND_WS = BACKEND.replace(/^http/, 'ws')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = (searchParams.get('symbols') ?? '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)

  if (symbols.length === 0) {
    return new Response('symbols query param required', { status: 400 })
  }

  const encoder = new TextEncoder()

  const body = new ReadableStream({
    start(controller) {
      // Immediately send a comment so the browser knows the connection is alive
      controller.enqueue(encoder.encode(': connected\n\n'))

      let ws: WebSocket

      try {
        ws = new WebSocket(`${BACKEND_WS}/v1/stream/quotes`)
      } catch {
        controller.close()
        return
      }

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'subscribe', symbols }))
      }

      ws.onmessage = (event) => {
        try {
          // Forward the raw JSON as an SSE data line
          controller.enqueue(encoder.encode(`data: ${event.data}\n\n`))
        } catch {
          ws.close()
        }
      }

      ws.onclose = () => {
        // Closing the stream causes EventSource to reconnect automatically
        try { controller.close() } catch { /* already closed */ }
      }

      ws.onerror = () => {
        try { controller.close() } catch { /* already closed */ }
      }

      // Keep-alive: ping the backend WebSocket and send an SSE comment every 20s
      const keepAliveId = setInterval(() => {
        try {
          ws.send(JSON.stringify({ action: 'ping' }))
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(keepAliveId)
        }
      }, 20_000)

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveId)
        try { ws.close() } catch { /* ignore */ }
        try { controller.close() } catch { /* ignore */ }
      })
    }
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
