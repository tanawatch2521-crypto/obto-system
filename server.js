const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 🟢 1. Middlewares พื้นฐาน
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ใช้ Multer แบบ Memory Storage เพื่อความเสถียรสูงสุดบน Render
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// 🟢 2. เชื่อมต่อฐานข้อมูล SQLite ที่ /tmp บน Render
const dbFile = 'database.db';
let targetDbPath = path.join(__dirname, dbFile);

try {
    if (fs.existsSync('/tmp')) {
        targetDbPath = path.join('/tmp', dbFile);
        if (!fs.existsSync(targetDbPath) && fs.existsSync(path.join(__dirname, dbFile))) {
            fs.copyFileSync(path.join(__dirname, dbFile), targetDbPath);
        }
    }
} catch (e) {
    console.error("Path setup error:", e.message);
}

const db = new sqlite3.Database(targetDbPath, (err) => {
    if (err) console.error('Database connection error:', err.message);
    else console.log('Connected to SQLite Database at:', targetDbPath);
});

// 🟢 3. สร้างโครงสร้างตารางให้ครบถ้วนทันทีที่เริ่มเซิร์ฟเวอร์
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        fullname TEXT,
        role TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (!err) {
            db.get("SELECT * FROM users WHERE username = 'admin'", async (err, row) => {
                if (!row) {
                    const hashedPassword = await bcrypt.hash('admin1234', 10);
                    db.run("INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)", 
                        ['admin', hashedPassword, 'ผู้ดูแลระบบหลัก', 'admin']);
                }
            });
        }
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

// อัปเดตรหัสผ่าน admin เป็น admin1234 เสมอ
(async () => {
    try {
        const hash = await bcrypt.hash('admin1234', 10);
        db.run("UPDATE users SET password = ? WHERE username = 'admin'", [hash], (err) => {});
    } catch (err) {}
})();

// ==========================================
// 👥 APIs: จัดการผู้ใช้งาน (Users)
// ==========================================
app.post('/api/users', async (req, res) => {
    const { username, password, fullname, role } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'กรุณากรอก Username และ Password ให้ครบถ้วน' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
            "INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)",
            [username, hashedPassword, fullname || 'เจ้าหน้าที่ อบต.', role || 'เจ้าหน้าที่ทั่วไป'],
            function (err) {
                if (err) return res.status(400).json({ message: 'Username นี้มีผู้ใช้งานในระบบแล้ว' });
                res.json({ message: 'เพิ่มบัญชีผู้ใช้งานสำเร็จ!' });
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', (req, res) => {
    db.all("SELECT id, username, fullname, role FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    if (userId === '1' || userId === 1) {
        return res.status(403).json({ error: 'ไม่สามารถลบบัญชี Admin หลักของระบบได้' });
    }
    db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "ลบบัญชีผู้ใช้เรียบร้อยแล้ว" });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ message: 'ไม่พบ Username นี้ในระบบ' });
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        res.json({ message: 'เข้าสู่ระบบสำเร็จ', user: { id: user.id, username: user.username, fullname: user.fullname } });
    });
});

// ==========================================
// 📚 APIs: จัดการบทเรียน (Lessons)
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
                console.error("Insert lesson error:", err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "บันทึกบทเรียนสำเร็จ", id: this.lastID });
        });
    } catch (e) {
        console.error("Lesson catch error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/lessons/:id', upload.any(), (req, res) => {
    try {
        const { id } = req.params;
        const title = req.body.title || req.body.lesson_title || 'ไม่มีชื่อหัวข้อ';
        const category = req.body.category || '-';
        const summary = req.body.summary || '';
        const content = req.body.content || '';
        const video_url = req.body.video_url || '';
        const image_url = req.body.image_url || null;

        if (image_url) {
            const sql = `UPDATE lessons SET title = ?, category = ?, summary = ?, content = ?, image_url = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            db.run(sql, [title, category, summary, content, image_url, video_url, id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "อัปเดตบทเรียนสำเร็จ" });
            });
        } else {
            const sql = `UPDATE lessons SET title = ?, category = ?, summary = ?, content = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            db.run(sql, [title, category, summary, content, video_url, id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "อัปเดตบทเรียนสำเร็จ" });
            });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/lessons/:id', (req, res) => {
    db.run("DELETE FROM
