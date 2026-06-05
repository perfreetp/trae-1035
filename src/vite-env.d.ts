import type { Api } from '../electron/preload'

const makeStubApi = (): Api => {
  const noop = async () => []
  return {
    events: {
      list: noop,
      get: async () => null,
      create: noop,
      update: noop,
      delete: noop
    },
    personnel: {
      list: noop,
      create: noop,
      update: noop,
      delete: noop
    },
    schedules: {
      list: noop,
      create: noop,
      delete: noop
    },
    leaves: {
      list: noop,
      create: noop,
      update: noop
    },
    props: {
      list: noop,
      create: noop,
      update: noop,
      delete: noop
    },
    costumes: {
      list: noop,
      create: noop,
      update: noop,
      delete: noop
    },
    tickets: {
      list: noop,
      create: noop,
      summary: noop
    },
    checklists: {
      list: noop,
      create: noop,
      update: noop
    },
    todos: {
      list: noop,
      create: noop,
      update: noop,
      delete: noop
    },
    logs: {
      list: noop,
      create: noop
    },
    incidents: {
      list: noop,
      create: noop
    },
    expenses: {
      list: noop,
      create: noop,
      summary: noop
    },
    attendance: {
      get: async () => null,
      save: noop
    },
    export: {
      all: noop
    }
  }
}

declare global {
  interface Window {
    api: Api
  }
}

if (typeof window !== 'undefined' && !window.api) {
  window.api = makeStubApi()
}

export {}
