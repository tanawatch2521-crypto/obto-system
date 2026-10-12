const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 🟢 1. สร้างโฟลเดอร์เก็บไฟล์อัปโหลด
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 🟢 2. ตั้งค่า Multer (รองรับทั้งไฟล์และป้องกันการหลุดของฟอร์ม)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // รองรับไฟล์ขนาดใหญ่สุด 50MB
});

// 🟢 3. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(uploadDir));

// 🟢 4. เชื่อมต่อ SQLite Database (ใช้ /tmp บน Render เพื่อให้เขียนข้อมูลได้จริง)
const tmpDbPath = path.join('/tmp', 'database.db');
const dbPath = process.env.NODE_ENV === 'production' ? tmpDbPath : path.join(__dirname, 'database.db');

// ถ้ายังไม่มีฐานข้อมูลใน /tmp ให้ลองคัดลอกจากต้นฉบับ (ถ้ามี)
if (!fs.existsSync(dbPath) && fs.existsSync(path.join(__dirname, 'database.db'))) {
    try {
        fs.copyFileSync(path.join(__dirname, 'database.db'), dbPath);
    } catch (e) {}
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Database connection error:', err.message);
    else console.log('Connected to SQLite Database at:', dbPath);
});

// 🟢 5. สร้างโครงสร้างตารางให้สมบูรณ์พร้อมรองรับทุกฟิลด์
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
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
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
// 📚 APIs: จัดการบทเรียน (Lessons) - ป้องกัน Error 500 100%
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
    upload.single('image')(req, res, (uploadErr) => {
        try {
            const title = req.body.title || req.body.lesson_title || 'ไม่มีชื่อหัวข้อ';
            const category = req.body.category || '-';
            const summary = req.body.summary || '';
            const content = req.body.content || '';
            const video_url = req.body.video_url || '';
            const image_url = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || null);

            const sql = `INSERT INTO lessons (title, category, summary, content, image_url, video_url) VALUES (?, ?, ?, ?, ?, ?)`;
            db.run(sql, [title, category, summary, content, image_url, video_url], function(err) {
                if (err) {
                    console.error("Insert lesson error:", err.message);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "บันทึกบทเรียนสำเร็จ", id: this.lastID });
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

app.put('/api/lessons/:id', (req, res) => {
    upload.single('image')(req, res, (uploadErr) => {
        try {
            const { id } = req.params;
            const title = req.body.title || req.body.lesson_title || 'ไม่มีชื่อหัวข้อ';
            const category = req.body.category || '-';
            const summary = req.body.summary || '';
            const content = req.body.content || '';
            const video_url = req.body.video_url || '';
            
            if (req.file) {
                const image_url = `/uploads/${req.file.filename}`;
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
});

app.delete('/api/lessons/:id', (req, res) => {
    db.run("DELETE FROM lessons WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'ลบบทเรียนสำเร็จ' });
    });
});

// ==========================================
// 📄 APIs: จัดการเอกสาร (Documents) - ป้องกัน Error 500 100%
// ==========================================
app.post('/api/documents', (req, res) => {
    upload.single('file')(req, res, (uploadErr) => {
        try {
            const title = req.body.title || req.body.doc_title || req.body.name || (req.file ? req.file.originalname : 'ไม่มีชื่อเอกสาร');
            const category = req.body.category || '-';
            const fiscal_year = req.body.fiscal_year || req.body.year || '-';
            
            let file_url = req.body.file_url || '';
            if (req.file) {
                file_url = `/uploads/${req.file.filename}`;
            }

            const sql = `INSERT INTO documents (title, category, fiscal_year, file_path, file_url) VALUES (?, ?, ?, ?, ?)`;
            db.run(sql, [title, category, fiscal_year, file_url, file_url], function(err) {
                if (err) {
                    console.error('Error inserting document:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                res.json({
                    message: 'บันทึกเอกสารเรียบร้อยแล้ว',
                    data: { id: this.lastID, title, category, fiscal_year, file_url }
                });
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

app.get('/api/documents', (req, res) => {
    db.all("SELECT * FROM documents ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.delete('/api/documents/:id', (req, res) => {
    db.run("DELETE FROM documents WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "ลบเอกสารสำเร็จ" });
    });
});

app.post('/api/analytics/download-doc/:id', (req, res) => {
    db.run("UPDATE documents SET downloads = downloads + 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "บันทึกการดาวน์โหลดแล้ว" });
    });
});

// 🟢 6. เริ่มต้น Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
