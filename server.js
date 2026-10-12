const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 🟢 0. สร้างโฟลเดอร์เก็บไฟล์ JSON สำรองอัตโนมัติ
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const lessonsJsonPath = path.join(dataDir, 'lessons.json');
const documentsJsonPath = path.join(dataDir, 'documents.json');

// 🟢 1. สร้างโฟลเดอร์ public/uploads อัตโนมัติ
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 🟢 2. ตั้งค่า Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 🟢 3. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(uploadDir));

// 🟢 4. เชื่อมต่อ SQLite Database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to SQLite Database.');
});

// ฟังก์ชันซิงค์ข้อมูลจาก SQLite ลงไฟล์ JSON แบบปลอดภัย
function backupToJSON() {
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        db.all("SELECT * FROM lessons", [], (err, rows) => {
            if (!err && rows) {
                fs.writeFileSync(lessonsJsonPath, JSON.stringify(rows, null, 2));
            }
        });
        db.all("SELECT * FROM documents", [], (err, rows) => {
            if (!err && rows) {
                fs.writeFileSync(documentsJsonPath, JSON.stringify(rows, null, 2));
            }
        });
    } catch (e) {
        console.error("Backup to JSON error:", e);
    }
}

// 🟢 5. สร้าง Tables และกู้คืนข้อมูลจากไฟล์ JSON อัตโนมัติเมื่อเริ่มระบบ
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
        db.get("SELECT COUNT(*) as count FROM lessons", (err, row) => {
            if (row && row.count === 0 && fs.existsSync(lessonsJsonPath)) {
                try {
                    const savedLessons = JSON.parse(fs.readFileSync(lessonsJsonPath, 'utf8'));
                    if (Array.isArray(savedLessons) && savedLessons.length > 0) {
                        const stmt = db.prepare("INSERT INTO lessons (id, title, category, summary, content, image_url, video_url, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                        savedLessons.forEach(l => {
                            stmt.run(l.id, l.title, l.category, l.summary, l.content, l.image_url, l.video_url, l.updated_at);
                        });
                        stmt.finalize();
                        console.log("Restored lessons from JSON backup.");
                    }
                } catch (e) {
                    console.error("Error restoring documents:", e);
                }
            }
        });
    });
});

// อัปเดตรหัสผ่าน admin เป็น admin1234
(async () => {
    try {
        const hash = await bcrypt.hash('admin1234', 10);
        db.run("UPDATE users SET password = ? WHERE username = 'admin'", [hash], (err) => {
            if (err) console.error("Error updating admin password:", err.message);
        });
    } catch (err) {
        console.error("Error hashing password:", err);
    }
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
            [username, hashedPassword, fullname || 'เจ้าหน้าที่ อบต.', role || 'admin'],
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
    db.all("SELECT id, username, fullname FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    if (userId === '1') {
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
    const { id } = req.params;
    db.get("SELECT * FROM lessons WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "ไม่พบบทเรียน" });
        res.json(row);
    });
});

app.post('/api/lessons', upload.single('image'), (req, res) => {
    const { title, category, summary, content, video_url } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const sql = `INSERT INTO lessons (title, category, summary, content, image_url, video_url) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [title, category, summary, content, image_url, video_url], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        backupToJSON();
        res.json({ message: "บันทึกบทเรียนสำเร็จ", id: this.lastID });
    });
});

app.put('/api/lessons/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { title, category, summary, content, video_url } = req.body;
    if (req.file) {
        const image_url = `/uploads/${req.file.filename}`;
        const sql = `UPDATE lessons SET title = ?, category = ?, summary = ?, content = ?, image_url = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        db.run(sql, [title, category, summary, content, image_url, video_url, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            backupToJSON();
            res.json({ message: "อัปเดตบทเรียนสำเร็จ", changes: this.changes });
        });
    } else {
        const sql = `UPDATE lessons SET title = ?, category = ?, summary = ?, content = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        db.run(sql, [title, category, summary, content, video_url, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            backupToJSON();
            res.json({ message: "อัปเดตบทเรียนสำเร็จ", changes: this.changes });
        });
    }
});

app.delete('/api/lessons/:id', (req, res) => {
    db.run("DELETE FROM lessons WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        backupToJSON();
        res.json({ message: 'ลบบทเรียนสำเร็จ', changes: this.changes });
    });
});

// ==========================================
// 📄 APIs: จัดการเอกสาร (Documents)
// ==========================================
app.post('/api/documents', upload.single('file'), (req, res) => {
    const { title, doc_title, name, category, year, fiscal_year, file_url, filename } = req.body;
    
    const finalTitle = title || doc_title || name || filename || (req.file ? req.file.originalname : 'ไม่มีชื่อเอกสาร');
    const finalCategory = category || '-';
    const finalYear = year || fiscal_year || '-';
    
    let finalFileUrl = file_url || '';
    if (req.file) {
        finalFileUrl = `/uploads/${req.file.filename}`;
    }

    const sql = `INSERT INTO documents (title, category, fiscal_year, file_path, file_url) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [finalTitle, finalCategory, finalYear, finalFileUrl, finalFileUrl], function(err) {
        if (err) {
            console.error('Error inserting document:', err.message);
            return res.status(500).json({ error: err.message });
        }
        backupToJSON();
        res.json({
            message: 'บันทึกเอกสารเรียบร้อยแล้ว',
            data: { id: this.lastID, title: finalTitle, category: finalCategory, fiscal_year: finalYear, file_url: finalFileUrl }
        });
    });
});

app.get('/api/documents', (req, res) => {
    db.all("SELECT * FROM documents ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            console.error("Fetch documents error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

app.delete('/api/documents/:id', (req, res) => {
    db.run("DELETE FROM documents WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        backupToJSON();
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
