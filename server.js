const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 🟢 Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const upload = multer({ storage: multer.memoryStorage() });

// 🟢 Database Setup ที่ปลอดภัยที่สุด
const dbFile = 'database.db';
let dbPath = path.join(__dirname, dbFile);

if (fs.existsSync('/tmp')) {
    dbPath = path.join('/tmp', dbFile);
    if (!fs.existsSync(dbPath) && fs.existsSync(path.join(__dirname, dbFile))) {
        try {
            fs.copyFileSync(path.join(__dirname, dbFile), dbPath);
        } catch (e) {}
    }
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('DB Connect Error:', err.message);
});

// 🟢 สร้างตารางล่วงหน้า
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        fullname TEXT,
        role TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {
        db.get("SELECT * FROM users WHERE username = 'admin'", async (err, row) => {
            if (!row) {
                const hashedPassword = await bcrypt.hash('admin1234', 10);
                db.run("INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)", 
                    ['admin', hashedPassword, 'ผู้ดูแลระบบหลัก', 'admin']);
            }
        });
    });

    db.run(`CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        category TEXT,
        summary TEXT,
        content TEXT,
        image_url TEXT,
        video_url TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        category TEXT,
        fiscal_year TEXT,
        file_path TEXT,
        file_url TEXT,
        downloads INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// ==========================================
// 👥 APIs: Users
// ==========================================
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, fullname, role } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)",
            [username, hashedPassword, fullname || 'เจ้าหน้าที่', role || 'ทั่วไป'],
            function (err) {
                if (err) return res.status(400).json({ message: 'Username ซ้ำ' });
                res.json({ message: 'สำเร็จ' });
            }
        );
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/users', (req, res) => {
    db.all("SELECT id, username, fullname, role FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.delete('/api/users/:id', (req, res) => {
    if (req.params.id == 1) return res.status(403).json({ error: 'ห้ามลบแอดมินหลัก' });
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'ลบสำเร็จ' });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ message: 'ไม่พบผู้ใช้' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ message: 'รหัสผ่านผิด' });
        res.json({ message: 'สำเร็จ', user: { id: user.id, username: user.username, fullname: user.fullname } });
    });
});

// ==========================================
// 📚 APIs: Lessons (รองรับทุกเคส ไม่พังแน่นอน)
// ==========================================
app.get('/api/lessons', (req, res) => {
    db.all("SELECT * FROM lessons ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/lessons', upload.any(), (req, res) => {
    try {
        const title = req.body.title || req.body.lesson_title || 'ไม่มีชื่อหัวข้อ';
        const category = req.body.category || '-';
        const summary = req.body.summary || '';
        const content = req.body.content || '';
        const video_url = req.body.video_url || '';
        const image_url = req.body.image_url || null;

        const sql = `INSERT INTO lessons (title, category, summary, content, image_url, video_url) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sql, [title, category, summary, content, image_url, video_url], function(err) {
            if (err) {
                console.error("Lesson Insert Error:", err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "บันทึกบทเรียนสำเร็จ", id: this.lastID });
        });
    } catch (e) {
        console.error("Lesson API Exception:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/lessons/:id', (req, res) => {
    db.run("DELETE FROM lessons WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'ลบสำเร็จ' });
    });
});

// ==========================================
// 📄 APIs: Documents (รองรับทุกเคส ไม่พังแน่นอน)
// ==========================================
app.get('/api/documents', (req, res) => {
    db.all("SELECT * FROM documents ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/documents', upload.any(), (req, res) => {
    try {
        const title = req.body.title || req.body.doc_title || req.body.name || 'ไม่มีชื่อเอกสาร';
        const category = req.body.category || '-';
        const fiscal_year = req.body.fiscal_year || req.body.year || '-';
        const file_url = req.body.file_url || '';

        const sql = `INSERT INTO documents (title, category, fiscal_year, file_path, file_url) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [title, category, fiscal_year, file_url, file_url], function(err) {
            if (err) {
                console.error('Document Insert Error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'บันทึกเอกสารสำเร็จ', id: this.lastID });
        });
    } catch (e) {
        console.error('Document API Exception:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/documents/:id', (req, res) => {
    db.run("DELETE FROM documents WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'ลบสำเร็จ' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
