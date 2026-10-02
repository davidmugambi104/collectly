// A stand-in for the mail API: logs each request and answers 200. Nothing is ever sent anywhere.
import http from 'node:http'
const PORT = Number(process.env.STANDIN_PORT ?? 5930)
http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c))
  req.on('end', () => {
    console.log(`[mail stand-in] ${req.method} ${req.url} ${body.slice(0, 120).replace(/\s+/g, ' ')}`)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ id: 'demo-' + Date.now() }))
  })
}).listen(PORT, '127.0.0.1', () => console.log(`mail stand-in on ${PORT}`))
