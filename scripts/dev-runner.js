const { spawn, exec } = require('child_process')
const path = require('path')

// 首先编译 electron 主进程代码
console.log('正在编译 Electron 主进程...')

// 使用 tsc 编译 electron 目录
const tsc = exec('npx tsc --project tsconfig.electron.json', {
  cwd: path.resolve(__dirname, '..')
})

tsc.stdout.on('data', (data) => {
  process.stdout.write(data)
})

tsc.stderr.on('data', (data) => {
  process.stderr.write(data)
})

tsc.on('close', (code) => {
  if (code !== 0) {
    console.error('Electron 主进程编译失败')
    process.exit(code)
  }

  console.log('编译完成，正在启动 Vite 开发服务器和 Electron...')

  // 启动 Vite
  const vite = spawn('npx', ['vite'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  })

  // 等待 Vite 启动后启动 Electron
  let electronStarted = false
  const checkVite = setInterval(() => {
    if (electronStarted) return
    
    // 检查端口是否开放
    const http = require('http')
    http.get('http://localhost:33445/', (res) => {
      if (res.statusCode === 200 && !electronStarted) {
        electronStarted = true
        clearInterval(checkVite)
        console.log('Vite 已启动，正在打开 Electron 窗口...')
        
        const electron = spawn('npx', ['electron', 'dist-electron/main.js'], {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'inherit',
          shell: true,
          env: {
            ...process.env,
            VITE_DEV_SERVER_URL: 'http://localhost:33445/'
          }
        })
        
        electron.on('close', () => {
          vite.kill()
          process.exit(0)
        })
      }
    }).on('error', () => {
      // Vite 还没启动好，继续等待
    })
  }, 1000)

  vite.on('close', () => {
    process.exit(0)
  })
})
