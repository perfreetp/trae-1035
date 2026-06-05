const isElectron = window.navigator.userAgent.toLowerCase().includes('electron') || 
                    (window as any).api !== undefined

let api: any

if (isElectron && (window as any).api) {
  api = (window as any).api
} else {
  const makeStub = (name: string) => {
    return new Proxy({}, {
      get: () => {
        return async () => {
          console.warn(`[API Stub] ${name} 不可用 - 当前不在 Electron 环境中`)
          return []
        }
      }
    })
  }

  api = {
    events: makeStub('events'),
    personnel: makeStub('personnel'),
    schedules: makeStub('schedules'),
    leaves: makeStub('leaves'),
    props: makeStub('props'),
    costumes: makeStub('costumes'),
    tickets: makeStub('tickets'),
    checklists: makeStub('checklists'),
    todos: makeStub('todos'),
    logs: makeStub('logs'),
    incidents: makeStub('incidents'),
    expenses: makeStub('expenses'),
    attendance: makeStub('attendance'),
    export: makeStub('export')
  }
}

export default api
