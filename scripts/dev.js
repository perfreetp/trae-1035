const { spawn, execSync } = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const VITE_PORT = 33445

function log(message) {
  console.log(`[启动器] ${message}`)
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function compileElectron() {
  log('正在编译 Electron 主进程...')
  try {
    execSync('npx tsc --project tsconfig.electron.json', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    })
    log('Electron 主进程编译完成')
    return true
  } catch (err) {
    console.error('Electron 主进程编译失败')
    return false
  }
}

function waitForViteReady() {
  return new Promise((resolve) => {
    const check = () => {
      http.get(`http://localhost:${VITE_PORT}/`, (res) => {
        if (res.statusCode === 200) {
          resolve(true)
        } else {
          setTimeout(check, 500)
        }
      }).on('error', () => {
        setTimeout(check, 500)
      })
    }
    check()
  })
}

async function main() {
  ensureDir(path.join(PROJECT_ROOT, 'dist-electron'))
  
  if (!compileElectron()) {
    process.exit(1)
  }

  log('正在启动 Vite 开发服务器...')
  const vite = spawn('npx', ['vite', '--port', VITE_PORT, '--strictPort'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      BROWSER: 'none'
    }
  })

  log(`等待 Vite 服务器就绪 (端口 ${VITE_PORT})...`)
  await waitForViteReady()
  log('Vite 服务器已就绪')

  log('正在打开 Electron 桌面窗口...')
  const electron = spawn('npx', ['electron', 'dist-electron/main.js'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: `http://localhost:${VITE_PORT}/`
    }
  })

  electron.on('close', (code) => {
    log(`Electron 已退出 (code ${code})，正在关闭 Vite...`)
    vite.kill()
    process.exit(code)
  })

  vite.on('close', (code) => {
    log(`Vite 已退出 (code ${code})`)
    electron.kill()
    process.exit(code || 0)
  })
}

main().catch((err) => {
  console.error('启动失败:', err)
  process.exit(1)
})
