import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { getDatabase, initDatabase } from './database'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: '剧场管理系统'
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  initDatabase()
  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function setupIpcHandlers() {
  const db = getDatabase()

  // Events (场次、排练、装台、撤场)
  ipcMain.handle('events:list', (_, filters) => {
    let query = 'SELECT * FROM events'
    const params: any[] = []
    if (filters?.startDate && filters?.endDate) {
      query += ' WHERE start_time >= ? AND start_time <= ?'
      params.push(filters.startDate, filters.endDate)
    }
    query += ' ORDER BY start_time'
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('events:get', (_, id) => {
    return db.prepare('SELECT * FROM events WHERE id = ?').get(id)
  })

  ipcMain.handle('events:create', (_, event) => {
    const stmt = db.prepare(`
      INSERT INTO events (type, title, description, start_time, end_time, location, status, created_at)
      VALUES (@type, @title, @description, @start_time, @end_time, @location, @status, @created_at)
    `)
    const result = stmt.run({
      ...event,
      created_at: new Date().toISOString()
    })
    return { id: result.lastInsertRowid, ...event }
  })

  ipcMain.handle('events:update', (_, id, event) => {
    const stmt = db.prepare(`
      UPDATE events 
      SET type = @type, title = @title, description = @description, 
          start_time = @start_time, end_time = @end_time, location = @location, status = @status
      WHERE id = @id
    `)
    stmt.run({ id, ...event })
    return db.prepare('SELECT * FROM events WHERE id = ?').get(id)
  })

  ipcMain.handle('events:delete', (_, id) => {
    db.prepare('DELETE FROM events WHERE id = ?').run(id)
    return { success: true }
  })

  // Personnel (人员)
  ipcMain.handle('personnel:list', () => {
    return db.prepare('SELECT * FROM personnel ORDER BY name').all()
  })

  ipcMain.handle('personnel:create', (_, person) => {
    const stmt = db.prepare(`
      INSERT INTO personnel (name, role, phone, email, status)
      VALUES (@name, @role, @phone, @email, @status)
    `)
    const result = stmt.run(person)
    return { id: result.lastInsertRowid, ...person }
  })

  ipcMain.handle('personnel:update', (_, id, person) => {
    const stmt = db.prepare(`
      UPDATE personnel SET name = @name, role = @role, phone = @phone, email = @email, status = @status
      WHERE id = @id
    `)
    stmt.run({ id, ...person })
    return db.prepare('SELECT * FROM personnel WHERE id = ?').get(id)
  })

  ipcMain.handle('personnel:delete', (_, id) => {
    db.prepare('DELETE FROM personnel WHERE id = ?').run(id)
    return { success: true }
  })

  // Schedules (排班)
  ipcMain.handle('schedules:list', (_, eventId) => {
    return db.prepare(`
      SELECT s.*, p.name as person_name, p.role as person_role
      FROM schedules s
      LEFT JOIN personnel p ON s.person_id = p.id
      WHERE s.event_id = ?
      ORDER BY s.start_time
    `).all(eventId)
  })

  ipcMain.handle('schedules:create', (_, schedule) => {
    const stmt = db.prepare(`
      INSERT INTO schedules (event_id, person_id, role, start_time, end_time, status)
      VALUES (@event_id, @person_id, @role, @start_time, @end_time, @status)
    `)
    const result = stmt.run(schedule)
    return { id: result.lastInsertRowid, ...schedule }
  })

  ipcMain.handle('schedules:delete', (_, id) => {
    db.prepare('DELETE FROM schedules WHERE id = ?').run(id)
    return { success: true }
  })

  // Leaves (请假)
  ipcMain.handle('leaves:list', () => {
    return db.prepare(`
      SELECT l.*, p.name as person_name
      FROM leaves l
      LEFT JOIN personnel p ON l.person_id = p.id
      ORDER BY l.start_date DESC
    `).all()
  })

  ipcMain.handle('leaves:create', (_, leave) => {
    const stmt = db.prepare(`
      INSERT INTO leaves (person_id, start_date, end_date, reason, status)
      VALUES (@person_id, @start_date, @end_date, @reason, @status)
    `)
    const result = stmt.run(leave)
    return { id: result.lastInsertRowid, ...leave }
  })

  ipcMain.handle('leaves:update', (_, id, leave) => {
    const stmt = db.prepare(`
      UPDATE leaves SET status = @status WHERE id = @id
    `)
    stmt.run({ id, ...leave })
    return db.prepare('SELECT * FROM leaves WHERE id = ?').get(id)
  })

  // Props (道具)
  ipcMain.handle('props:list', () => {
    return db.prepare('SELECT * FROM props ORDER BY name').all()
  })

  ipcMain.handle('props:create', (_, prop) => {
    const stmt = db.prepare(`
      INSERT INTO props (name, description, quantity, status, location)
      VALUES (@name, @description, @quantity, @status, @location)
    `)
    const result = stmt.run(prop)
    return { id: result.lastInsertRowid, ...prop }
  })

  ipcMain.handle('props:update', (_, id, prop) => {
    const stmt = db.prepare(`
      UPDATE props SET name = @name, description = @description, quantity = @quantity, status = @status, location = @location
      WHERE id = @id
    `)
    stmt.run({ id, ...prop })
    return db.prepare('SELECT * FROM props WHERE id = ?').get(id)
  })

  ipcMain.handle('props:delete', (_, id) => {
    db.prepare('DELETE FROM props WHERE id = ?').run(id)
    return { success: true }
  })

  // Costumes (服装)
  ipcMain.handle('costumes:list', () => {
    return db.prepare('SELECT * FROM costumes ORDER BY name').all()
  })

  ipcMain.handle('costumes:create', (_, costume) => {
    const stmt = db.prepare(`
      INSERT INTO costumes (name, description, size, quantity, status, borrower, borrow_date, return_date)
      VALUES (@name, @description, @size, @quantity, @status, @borrower, @borrow_date, @return_date)
    `)
    const result = stmt.run(costume)
    return { id: result.lastInsertRowid, ...costume }
  })

  ipcMain.handle('costumes:update', (_, id, costume) => {
    const stmt = db.prepare(`
      UPDATE costumes SET name = @name, description = @description, size = @size, quantity = @quantity, 
                          status = @status, borrower = @borrower, borrow_date = @borrow_date, return_date = @return_date
      WHERE id = @id
    `)
    stmt.run({ id, ...costume })
    return db.prepare('SELECT * FROM costumes WHERE id = ?').get(id)
  })

  ipcMain.handle('costumes:delete', (_, id) => {
    db.prepare('DELETE FROM costumes WHERE id = ?').run(id)
    return { success: true }
  })

  // Tickets (票务)
  ipcMain.handle('tickets:list', (_, eventId) => {
    return db.prepare('SELECT * FROM tickets WHERE event_id = ? ORDER BY created_at DESC').all(eventId)
  })

  ipcMain.handle('tickets:create', (_, ticket) => {
    const stmt = db.prepare(`
      INSERT INTO tickets (event_id, type, quantity, price, total_amount, buyer, note, created_at)
      VALUES (@event_id, @type, @quantity, @price, @total_amount, @buyer, @note, @created_at)
    `)
    const result = stmt.run({
      ...ticket,
      created_at: new Date().toISOString()
    })
    return { id: result.lastInsertRowid, ...ticket }
  })

  ipcMain.handle('tickets:summary', (_, eventId) => {
    return db.prepare(`
      SELECT 
        type,
        SUM(quantity) as total_quantity,
        SUM(total_amount) as total_revenue
      FROM tickets 
      WHERE event_id = ?
      GROUP BY type
    `).all(eventId)
  })

  // Checklists (检查清单)
  ipcMain.handle('checklists:list', (_, eventId) => {
    return db.prepare('SELECT * FROM checklists WHERE event_id = ? ORDER BY category, order_index').all(eventId)
  })

  ipcMain.handle('checklists:create', (_, item) => {
    const stmt = db.prepare(`
      INSERT INTO checklists (event_id, category, content, order_index, checked, checked_by, checked_at)
      VALUES (@event_id, @category, @content, @order_index, @checked, @checked_by, @checked_at)
    `)
    const result = stmt.run(item)
    return { id: result.lastInsertRowid, ...item }
  })

  ipcMain.handle('checklists:update', (_, id, item) => {
    const stmt = db.prepare(`
      UPDATE checklists SET checked = @checked, checked_by = @checked_by, checked_at = @checked_at
      WHERE id = @id
    `)
    stmt.run({ id, ...item })
    return db.prepare('SELECT * FROM checklists WHERE id = ?').get(id)
  })

  // Todos (待办)
  ipcMain.handle('todos:list', () => {
    return db.prepare('SELECT * FROM todos ORDER BY due_date, priority DESC').all()
  })

  ipcMain.handle('todos:create', (_, todo) => {
    const stmt = db.prepare(`
      INSERT INTO todos (title, description, priority, due_date, completed, created_at)
      VALUES (@title, @description, @priority, @due_date, @completed, @created_at)
    `)
    const result = stmt.run({
      ...todo,
      created_at: new Date().toISOString()
    })
    return { id: result.lastInsertRowid, ...todo }
  })

  ipcMain.handle('todos:update', (_, id, todo) => {
    const stmt = db.prepare(`
      UPDATE todos SET title = @title, description = @description, priority = @priority, 
                       due_date = @due_date, completed = @completed
      WHERE id = @id
    `)
    stmt.run({ id, ...todo })
    return db.prepare('SELECT * FROM todos WHERE id = ?').get(id)
  })

  ipcMain.handle('todos:delete', (_, id) => {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id)
    return { success: true }
  })

  // Logs (演出日志)
  ipcMain.handle('logs:list', () => {
    return db.prepare('SELECT * FROM logs ORDER BY created_at DESC').all()
  })

  ipcMain.handle('logs:create', (_, log) => {
    const stmt = db.prepare(`
      INSERT INTO logs (event_id, type, title, content, author, created_at)
      VALUES (@event_id, @type, @title, @content, @author, @created_at)
    `)
    const result = stmt.run({
      ...log,
      created_at: new Date().toISOString()
    })
    return { id: result.lastInsertRowid, ...log }
  })

  // Incidents (事故记录)
  ipcMain.handle('incidents:list', () => {
    return db.prepare('SELECT * FROM incidents ORDER BY occurred_at DESC').all()
  })

  ipcMain.handle('incidents:create', (_, incident) => {
    const stmt = db.prepare(`
      INSERT INTO incidents (event_id, title, description, severity, occurred_at, reporter, status)
      VALUES (@event_id, @title, @description, @severity, @occurred_at, @reporter, @status)
    `)
    const result = stmt.run(incident)
    return { id: result.lastInsertRowid, ...incident }
  })

  // Expenses (费用)
  ipcMain.handle('expenses:list', () => {
    return db.prepare('SELECT * FROM expenses ORDER BY date DESC').all()
  })

  ipcMain.handle('expenses:create', (_, expense) => {
    const stmt = db.prepare(`
      INSERT INTO expenses (event_id, category, description, amount, date, payer, note)
      VALUES (@event_id, @category, @description, @amount, @date, @payer, @note)
    `)
    const result = stmt.run(expense)
    return { id: result.lastInsertRowid, ...expense }
  })

  ipcMain.handle('expenses:summary', () => {
    return db.prepare(`
      SELECT category, SUM(amount) as total_amount
      FROM expenses
      GROUP BY category
    `).all()
  })
}
