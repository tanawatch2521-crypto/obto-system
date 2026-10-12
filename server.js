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

// ใช้ Multer แบบ Memory Storage เพื่อรองรับ FormData จากหน้าบ้านได้อย่างเสถียร
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
} catch (e) {}

const db = new sqlite3.Database(targetDbPath, (err) => {
    if (err) console.error('DB Connect Error:', err.message);
});

// 🟢 3. สร้างโครงสร้างตาราง
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
// 📚 APIs: Lessons (รองรับ FormData และไฟล์แนบภาพ)
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

app.post('/api/lessons', upload.single('image'), (req, res) => {
    try {
        const title = req.body.title || 'ไม่มีชื่อหัวข้อ';
        const category = req.body.category || '-';
        const summary = req.body.summary || '';
        const content = req.body.content || '';
        const video_url = req.body.video_url || '';
        
        // ถ้ามีการอัปโหลดไฟล์ภาพมา ให้แปลงเป็น Base64 หรือบันทึก Path ชั่วคราว (หรือรองรับลิงก์)
        let image_url = req.body.image_url || null;
        if (req.file) {
            // แปลงไฟล์ภาพที่อัปโหลดเป็น Base64 เก็บลง SQLite เพื่อความปลอดภัยบน Render
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            image_url = `data:${req.file.mimetype};base64,${b64}`;
        }

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

app.put('/api/lessons/:id', upload.single('image'), (req, res) => {
    try {
        const { id } = req.params;
        const title = req.body.title || 'ไม่มีชื่อหัวข้อ';
        const category = req.body.category || '-';
        const summary = req.body.summary || '';
        const content = req.body.content || '';
        const video_url = req.body.video_url || '';

        let imageUpdateSql = "";
        let params = [title, category, summary, content, video_url];

        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const image_url = `data:${req.file.mimetype};base64,${b64}`;
            imageUpdateSql = ", image_url = ?";
            params.push(image_url);
        }
        params.push(id);

        const sql = `UPDATE lessons SET title = ?, category = ?, summary = ?, content = ?, video_url = ? ${imageUpdateSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
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
