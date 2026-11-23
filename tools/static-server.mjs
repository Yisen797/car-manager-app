// 静态服务器：验证生产构建产物（APK 内实际运行的资源）
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.argv[2] || 'dist/build/h5'
const PORT = Number(process.argv[3] || 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0])
    let file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath)
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(ROOT, 'index.html')
    }
    const ext = path.extname(file)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, '127.0.0.1', () => console.log(`static server: http://127.0.0.1:${PORT} -> ${ROOT}`))
