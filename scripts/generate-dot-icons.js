const fs = require('fs')
const { createCanvas } = require('canvas')

const colors = {
  'green': '#34c759',
  'red': '#ff3b30',
  'gray': '#c7c7cc'
}

// 确保 build 目录存在
if (!fs.existsSync('build')) {
  fs.mkdirSync('build')
}

// 生成 16x16 的彩色圆点图标
Object.entries(colors).forEach(([name, color]) => {
  const canvas = createCanvas(16, 16)
  const ctx = canvas.getContext('2d')
  
  // 绘制彩色圆点
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(8, 8, 7, 0, Math.PI * 2)
  ctx.fill()
  
  // 保存为 PNG
  const buffer = canvas.toBuffer('image/png')
  const pngPath = `build/dot-${name}.png`
  fs.writeFileSync(pngPath, buffer)
  
  console.log(`Generated ${pngPath}`)
})
