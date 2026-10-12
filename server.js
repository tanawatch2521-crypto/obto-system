const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

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

// 🟢 สร้างตารางและบังคับเติมคอลัมน์ที่ขาดหายไปทั้งหมดทันที
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        fullname TEXT,
        role TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        category TEXT,
        summary TEXT,
        content TEXT,
        image_url TEXT,
        video_url TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {
        db.run(`ALTER TABLE lessons ADD COLUMN image_url TEXT`, (err) => {});
        db.run(`ALTER TABLE lessons ADD COLUMN video_url TEXT`, (err) => {});
    });

    db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        category TEXT,
        fiscal_year TEXT,
        file_path TEXT,
        file_url TEXT,
        downloads INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {
        db.run(`ALTER TABLE documents ADD COLUMN file_url TEXT`, (err) => {});
    });
});

// ==========================================
// 📚 APIs: Lessons
// ==========================================
app.get('/api/lessons', (req, res) => {
    db.all("SELECT * FROM lessons ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/lessons/:id', (req, res) => {
    db.get("SELECT * FROM lessons WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "ไม่พบบทเรียน" });
        res.json(row);
    });
});

app.post('/api/lessons', (req, res) => {
    try {
        const title = req.body.title || 'ไม่มีชื่อหัวข้อ';
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
        console.error("Lesson Exception:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/lessons/:id', (req, res) => {
    try {
        const { id } = req.params;
        const title = req.body.title || 'ไม่มีชื่อหัวข้อ';
        const category = req.body.category || '-';
        const summary = req.body.summary || '';
        const content = req.body.content || '';
        const video_url = req.body.video_url || '';
        const image_url = req.body.image_url || null;

        let sql = `UPDATE lessons SET title = ?, category = ?, summary = ?, content = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        let params = [title, category, summary, content, video_url, id];

        if (image_url) {
            sql = `UPDATE lessons SET title = ?, category = ?, summary = ?, content = ?, video_url = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            params = [title, category, summary, content, video_url, image_url, id];
        }

        db.run(sql, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "อัปเดตบทเรียนสำเร็จ" });
        });
    } catch (e) {
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
// 📄 APIs: Documents
// ==========================================
app.get('/api/documents', (req, res) => {
    db.all("SELECT * FROM documents ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/documents', (req, res) => {
    try {
        const title = req.body.title || req.body.doc_title || req.body.name || 'ไม่มีชื่อเอกสาร';
        const category = req.body.category || '-';
        const fiscal_year = req.body.fiscal_year || req.body.year || '-';
        const file_url = req.body.file_url || '';

        const sql = `INSERT INTO documents (title, category, fiscal_year, file_path, file_url) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [title, category, fiscal_year, file_url, file_url], function(err) {
            if, (err) {
                console.error('Document Insert Error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'บันทึกเอกสารสำเร็จ', id: this.lastID });
        });
    } catch (e) {
        console.error('Document Exception:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/documents/:id', (req, res) => {
    db.run("DELETE FROM documents WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'ลบสำเร็จ' });
    });
});

// Users & Login
app.get('/api/users', (req, res) => {
    db.all("SELECT id, username, fullname, role FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
