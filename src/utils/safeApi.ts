const isInElectron = typeof window !== 'undefined' && 
                     window.navigator.userAgent.toLowerCase().includes('electron')

function getSafeApi(): any {
  if (typeof window === 'undefined') {
    return makeFallbackApi()
  }
  
  if (window.api && isInElectron) {
    return window.api
  }
  
  return makeFallbackApi()
}

function makeFallbackApi(): any {
  const handler = {
    get: (_target: any, prop: string): any => {
      if (['then', 'catch', 'finally'].includes(prop)) {
        return undefined
      }
      return new Proxy(async (...args: any[]) => {
        console.warn(`[API Fallback] 调用 ${prop}(${args.map(a => JSON.stringify(a)).join(', ')}) - 数据库不可用，返回空数据`)
        if (prop === 'list' || prop === 'summary' || prop === 'all') {
          return []
        }
        if (prop === 'get') {
          return null
        }
        return {}
      }, handler)
    }
  }
  
  return new Proxy({}, handler)
}

export const safeApi = getSafeApi()

export function hasDatabase(): boolean {
  return isInElectron && typeof window !== 'undefined' && !!window.api
}
