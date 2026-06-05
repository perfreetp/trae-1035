import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'theater-manager.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
  }
  return db
}

export function initDatabase() {
  const database = getDatabase()

  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      status TEXT DEFAULT 'planned',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      phone TEXT,
      email TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      person_id INTEGER NOT NULL,
      role TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (person_id) REFERENCES personnel(id)
    );

    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (person_id) REFERENCES personnel(id)
    );

    CREATE TABLE IF NOT EXISTS props (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      quantity INTEGER DEFAULT 1,
      status TEXT DEFAULT 'available',
      location TEXT
    );

    CREATE TABLE IF NOT EXISTS costumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      size TEXT,
      quantity INTEGER DEFAULT 1,
      status TEXT DEFAULT 'available',
      borrower TEXT,
      borrow_date TEXT,
      return_date TEXT
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      total_amount REAL NOT NULL,
      buyer TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      checked INTEGER DEFAULT 0,
      checked_by TEXT,
      checked_at TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      author TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      reporter TEXT,
      status TEXT DEFAULT 'open',
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      payer TEXT,
      note TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL UNIQUE,
      total_seats INTEGER DEFAULT 0,
      tickets_sold INTEGER DEFAULT 0,
      complimentary_tickets INTEGER DEFAULT 0,
      people_entered INTEGER DEFAULT 0,
      updated_at TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );
  `)

  const personnelCount = database.prepare('SELECT COUNT(*) as count FROM personnel').get() as { count: number }
  if (personnelCount.count === 0) {
    const insertPerson = database.prepare(`
      INSERT INTO personnel (name, role, phone, email, status)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const samplePersonnel = [
      ['张导演', '导演', '13800138001', 'zhang@example.com', 'active'],
      ['李演员', '演员', '13800138002', 'li@example.com', 'active'],
      ['王演员', '演员', '13800138003', 'wang@example.com', 'active'],
      ['赵灯光', '灯光师', '13800138004', 'zhao@example.com', 'active'],
      ['钱音响', '音响师', '13800138005', 'qian@example.com', 'active'],
      ['孙剧务', '剧务', '13800138006', 'sun@example.com', 'active'],
      ['周票务', '票务', '13800138007', 'zhou@example.com', 'active'],
      ['吴监督', '舞台监督', '13800138008', 'wu@example.com', 'active'],
    ]
    
    samplePersonnel.forEach(p => insertPerson.run(...p))
  }

  const propsCount = database.prepare('SELECT COUNT(*) as count FROM props').get() as { count: number }
  if (propsCount.count === 0) {
    const insertProp = database.prepare(`
      INSERT INTO props (name, description, quantity, status, location)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const sampleProps = [
      ['木桌子', '演出用木质方桌', 3, 'available', '道具间A区'],
      ['椅子', '复古木椅', 8, 'available', '道具间A区'],
      ['台灯', '复古台灯', 2, 'available', '道具间B区'],
      ['电话', '老式转盘电话', 1, 'available', '道具间B区'],
      ['行李箱', '复古行李箱', 2, 'available', '道具间C区'],
    ]
    
    sampleProps.forEach(p => insertProp.run(...p))
  }

  const costumesCount = database.prepare('SELECT COUNT(*) as count FROM costumes').get() as { count: number }
  if (costumesCount.count === 0) {
    const insertCostume = database.prepare(`
      INSERT INTO costumes (name, description, size, quantity, status)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const sampleCostumes = [
      ['西装', '男士黑色西装', 'L', 4, 'available'],
      ['连衣裙', '女士红色连衣裙', 'M', 3, 'available'],
      ['衬衫', '白色衬衫', '均码', 10, 'available'],
      ['西裤', '黑色西裤', 'L', 5, 'available'],
      ['皮鞋', '黑色皮鞋', '42码', 6, 'available'],
    ]
    
    sampleCostumes.forEach(c => insertCostume.run(...c))
  }

  const todosCount = database.prepare('SELECT COUNT(*) as count FROM todos').get() as { count: number }
  if (todosCount.count === 0) {
    const insertTodo = database.prepare(`
      INSERT INTO todos (title, description, priority, due_date, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    const now = new Date().toISOString()
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    
    const sampleTodos = [
      ['检查所有灯光设备', '演出前一周完成灯光设备检查', 'high', tomorrow, 0, now],
      ['确认演员服装', '确认所有演员服装尺寸合适', 'medium', nextWeek, 0, now],
      ['打印节目单', '打印100份节目单', 'low', nextWeek, 0, now],
      ['确认票务销售情况', '核对预售票数据', 'high', tomorrow, 0, now],
    ]
    
    sampleTodos.forEach(t => insertTodo.run(...t))
  }

  const eventsCount = database.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number }
  if (eventsCount.count === 0) {
    const insertEvent = database.prepare(`
      INSERT INTO events (type, title, description, start_time, end_time, location, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const isoToday = today.toISOString().split('T')[0]
    const tomorrow = new Date(today.getTime() + 86400000).toISOString().split('T')[0]
    const dayAfter = new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0]
    const nextWeek = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0]
    
    const sampleEvents = [
      ['performance', '《雷雨》正式演出', '经典话剧雷雨正式公演第一场', `${isoToday} 19:30`, `${isoToday} 22:00`, '主剧场', 'planned', now.toISOString()],
      ['rehearsal', '《雷雨》带妆彩排', '全剧带妆彩排，灯光音响配合', `${tomorrow} 14:00`, `${tomorrow} 18:00`, '主剧场', 'planned', now.toISOString()],
      ['setup', '舞台装台', '搭建舞台布景、安装灯光设备', `${dayAfter} 09:00`, `${dayAfter} 18:00`, '主剧场', 'planned', now.toISOString()],
      ['teardown', '撤场', '演出结束后拆除舞台布景', `${nextWeek} 22:00`, `${new Date(today.getTime() + 8 * 86400000).toISOString().split('T')[0]} 02:00`, '主剧场', 'planned', now.toISOString()],
      ['rehearsal', '演员走位排练', '第一幕演员走位练习', `${isoToday} 10:00`, `${isoToday} 12:00`, '排练厅A', 'planned', now.toISOString()],
      ['performance', '《雷雨》第二场', '经典话剧雷雨正式公演第二场', `${tomorrow} 19:30`, `${tomorrow} 22:00`, '主剧场', 'planned', now.toISOString()],
    ]
    
    sampleEvents.forEach(e => insertEvent.run(...e))
  }
}
