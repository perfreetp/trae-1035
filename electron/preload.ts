import { contextBridge, ipcRenderer } from 'electron'

const api = {
  events: {
    list: (filters?: any) => ipcRenderer.invoke('events:list', filters),
    get: (id: number) => ipcRenderer.invoke('events:get', id),
    create: (event: any) => ipcRenderer.invoke('events:create', event),
    update: (id: number, event: any) => ipcRenderer.invoke('events:update', id, event),
    delete: (id: number) => ipcRenderer.invoke('events:delete', id)
  },
  personnel: {
    list: () => ipcRenderer.invoke('personnel:list'),
    create: (person: any) => ipcRenderer.invoke('personnel:create', person),
    update: (id: number, person: any) => ipcRenderer.invoke('personnel:update', id, person),
    delete: (id: number) => ipcRenderer.invoke('personnel:delete', id)
  },
  schedules: {
    list: (eventId: number) => ipcRenderer.invoke('schedules:list', eventId),
    create: (schedule: any) => ipcRenderer.invoke('schedules:create', schedule),
    delete: (id: number) => ipcRenderer.invoke('schedules:delete', id)
  },
  leaves: {
    list: () => ipcRenderer.invoke('leaves:list'),
    create: (leave: any) => ipcRenderer.invoke('leaves:create', leave),
    update: (id: number, leave: any) => ipcRenderer.invoke('leaves:update', id, leave)
  },
  props: {
    list: () => ipcRenderer.invoke('props:list'),
    create: (prop: any) => ipcRenderer.invoke('props:create', prop),
    update: (id: number, prop: any) => ipcRenderer.invoke('props:update', id, prop),
    delete: (id: number) => ipcRenderer.invoke('props:delete', id)
  },
  costumes: {
    list: () => ipcRenderer.invoke('costumes:list'),
    create: (costume: any) => ipcRenderer.invoke('costumes:create', costume),
    update: (id: number, costume: any) => ipcRenderer.invoke('costumes:update', id, costume),
    delete: (id: number) => ipcRenderer.invoke('costumes:delete', id)
  },
  tickets: {
    list: (eventId: number) => ipcRenderer.invoke('tickets:list', eventId),
    create: (ticket: any) => ipcRenderer.invoke('tickets:create', ticket),
    summary: (eventId: number) => ipcRenderer.invoke('tickets:summary', eventId)
  },
  checklists: {
    list: (eventId: number) => ipcRenderer.invoke('checklists:list', eventId),
    create: (item: any) => ipcRenderer.invoke('checklists:create', item),
    update: (id: number, item: any) => ipcRenderer.invoke('checklists:update', id, item)
  },
  todos: {
    list: () => ipcRenderer.invoke('todos:list'),
    create: (todo: any) => ipcRenderer.invoke('todos:create', todo),
    update: (id: number, todo: any) => ipcRenderer.invoke('todos:update', id, todo),
    delete: (id: number) => ipcRenderer.invoke('todos:delete', id)
  },
  logs: {
    list: () => ipcRenderer.invoke('logs:list'),
    create: (log: any) => ipcRenderer.invoke('logs:create', log)
  },
  incidents: {
    list: () => ipcRenderer.invoke('incidents:list'),
    create: (incident: any) => ipcRenderer.invoke('incidents:create', incident)
  },
  expenses: {
    list: () => ipcRenderer.invoke('expenses:list'),
    create: (expense: any) => ipcRenderer.invoke('expenses:create', expense),
    summary: () => ipcRenderer.invoke('expenses:summary')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
