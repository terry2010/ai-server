// Copy doc/素材/logo.ico -> build/icon.ico (dev/build time)
// Copy doc/素材/dot-*-icon-64.ico -> build/dot-*.ico
const fs = require('fs')
const path = require('path')

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }

const src = path.resolve(process.cwd(), 'doc', '素材', 'logo.ico')
const dstDir = path.resolve(process.cwd(), 'build')
const dst = path.join(dstDir, 'icon.ico')

try {
  if (fs.existsSync(src)) {
    ensureDir(dstDir)
    fs.copyFileSync(src, dst)
    console.log('[prep] copied logo.ico -> build/icon.ico')
  } else {
    console.warn('[prep] source logo.ico not found:', src)
  }
} catch (e) {
  console.error('[prep] copy logo failed:', e)
  process.exitCode = 0
}

// 复制状态点图标
try {
  ensureDir(dstDir)
  const mapping = [
    { src: path.resolve(process.cwd(), 'doc', '素材', 'dot-gray-icon-64.ico'),  dst: path.join(dstDir, 'dot-gray.ico') },
    { src: path.resolve(process.cwd(), 'doc', '素材', 'dot-green-icon-64.ico'), dst: path.join(dstDir, 'dot-green.ico') },
    { src: path.resolve(process.cwd(), 'doc', '素材', 'dot-red-icon-64.ico'),   dst: path.join(dstDir, 'dot-red.ico') },
  ]
  for (const m of mapping) {
    if (fs.existsSync(m.src)) {
      fs.copyFileSync(m.src, m.dst)
      console.log('[prep] copied', path.basename(m.src), '->', path.relative(process.cwd(), m.dst))
    } else {
      console.warn('[prep] source icon missing:', m.src)
    }
  }
} catch (e) {
  console.error('[prep] copy status icons failed:', e)
  process.exitCode = 0
}
