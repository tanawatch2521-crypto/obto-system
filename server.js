const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// เชื่อมต่อ SQLite Database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to SQLite Database.');
});


// ==========================================
// 📌 สร้าง Tables ในฐานข้อมูล (ถ้ายังไม่มี)
// ==========================================
db.serialize(() => {
    // 1. ตาราง Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        fullname TEXT,
        role TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. ตาราง Lessons (บทเรียน)
    db.run(`CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        category TEXT,
        summary TEXT,
        content TEXT,
        views INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. ตาราง Documents (เอกสารดาวน์โหลด)
    db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT,
        fiscal_year TEXT,
        file_path TEXT,
        downloads INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error("Error creating documents table:", err.message);
        } else {
            console.log("Documents table ready.");
        }
    });
});


    // สร้าง Admin ตั้งต้น (ถ้ายังไม่มี)
const defaultUser = 'admin';
db.get("SELECT * FROM users WHERE username = ?", [defaultUser], async (err, row) => {
    // บังคับอัปเดตรหัสผ่าน admin เป็น admin1234
(async () => {
    const hash = await bcrypt.hash('admin1234', 10);
    db.run("UPDATE users SET password = ? WHERE username = 'admin'", [hash], (err) => {
        if (err) console.error("Error updating admin password:", err.message);
        else console.log("Admin password updated successfully to admin1234");
    });
})();



// ==========================================
// 👥 API จัดการผู้ใช้งาน (Users API)
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
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

app.delete('/api/users/:id', (req, res) => {
     const userId = req.params.id;

    // 🛡️ ป้องกันไม่ให้ลบบัญชี ID: 1 (หรือ Admin หลัก)
    if (userId === '1') {
        return res.status(403).json({ error: 'ไม่สามารถลบบัญชี Admin หลักของระบบได้' });
    }
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "ลบบัญชีผู้ใช้เรียบร้อยแล้ว" });
    });
});

// Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ message: 'ไม่พบ Username นี้ในระบบ' });
        
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

        res.json({ message: 'เข้าสู่ระบบสำเร็จ', user: { id: user.id, username: user.username, fullname: user.fullname } });
    });
});

// API ดึงบทเรียนทั้งหมด
app.get('/api/lessons', (req, res) => {
    db.all("SELECT * FROM lessons ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            console.error("Fetch lessons error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        // 📌 ส่งออกทั้ง data และตัวมันเอง เพื่อให้รองรับทุกหน้าเว็บ
        const result = rows || [];
        res.json(result); 
    });
});
// API ดึงข้อมูลบทเรียนเดี่ยวตาม ID (เพื่อนำไปโชว์ในช่องแก้ไข)
app.get('/api/lessons/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM lessons WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "ไม่พบบทเรียน" });
        res.json(row);
    });
});

// API สำหรับบันทึกการแก้ไขบทเรียน
app.put('/api/lessons/:id', (req, res) => {
    const { id } = req.params;
    const { title, category, summary, content } = req.body;

    const sql = `UPDATE lessons SET title = ?, category = ?, summary = ?, content = ? WHERE id = ?`;
    db.run(sql, [title, category, summary, content, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "อัปเดตบทเรียนสำเร็จ", changes: this.changes });
    });
});


// API สำหรับลบบทเรียน
app.delete('/api/lessons/:id', (req, res) => {
    const lessonId = req.params.id;
    db.run("DELETE FROM lessons WHERE id = ?", [lessonId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'ลบบทเรียนสำเร็จ', changes: this.changes });
    });
});

// ตั้งค่าโฟลเดอร์สำหรับเก็บไฟล์อัปโหลด
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // ไฟล์จะถูกเก็บใน public/uploads/
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// 2. API สำหรับอัปโหลดเอกสารใหม่
app.post('/api/documents', upload.single('file'), (req, res) => {
    try {
        const { title, category, fiscal_year } = req.body;
        const filePath = req.file ? `/uploads/${req.file.filename}` : '';

        const sql = "INSERT INTO documents (title, category, fiscal_year, file_path) VALUES (?, ?, ?, ?)";
        db.run(sql, [title, category, fiscal_year, filePath], function(err) {
            if (err) {
                console.error("DB Insert Error:", err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "อัปโหลดเอกสารสำเร็จ", id: this.lastID });
        });
    } catch (err) {
        console.error("Upload Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});


// API สำหรับลบเอกสาร
app.delete('/api/documents/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM documents WHERE id = ?", [id], function(err) {
        if (err) {
            console.error("Delete Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "ลบเอกสารสำเร็จ" });
    });
});



app.post('/api/lessons', (req, res) => {
    const { title, category, summary, content } = req.body;
    db.run("INSERT INTO lessons (title, category, summary, content) VALUES (?, ?, ?, ?)",
        [title, category, summary, content], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "บันทึกบทเรียนสำเร็จ", id: this.lastID });
        });
});

app.post('/api/analytics/view-lesson', (req, res) => {
    const { lesson_id } = req.body;
    db.run("UPDATE lessons SET views = views + 1 WHERE id = ?", [lesson_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "บันทึกสถิติการอ่านแล้ว" });
    });
});

app.get('/api/documents', (req, res) => {
    db.all("SELECT * FROM documents ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});
// API สำหรับบวดยอดเข้าชม +1 เมื่อมีคนกดอ่านบทเรียน
app.post('/api/lessons/:id/view', (req, res) => {
    const lessonId = req.params.id;
    db.run("UPDATE lessons SET views = COALESCE(views, 0) + 1 WHERE id = ?", [lessonId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'บันทึกการเข้าชมสำเร็จ' });
    });
});
// API สำหรับเพิ่มบทเรียนใหม่เข้า Database
app.post('/api/lessons', (req, res) => {
    const { title, category, summary, content } = req.body;
    
    const sql = `INSERT INTO lessons (title, category, summary, content, views) VALUES (?, ?, ?, ?, 0)`;
    
    db.run(sql, [title, category, summary, content], function(err) {
        if (err) {
            console.error("Error inserting lesson:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "เพิ่มบทเรียนสำเร็จ", id: this.lastID });
    });
});

app.post('/api/documents', upload.single('file'), (req, res) => {
    const { title, category, fiscal_year } = req.body;
    const file_path = req.file ? `/uploads/${req.file.filename}` : '';
    db.run("INSERT INTO documents (title, category, fiscal_year, file_path) VALUES (?, ?, ?, ?)",
        [title, category, fiscal_year, file_path], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "อัปโหลดเอกสารสำเร็จ" });
        });
});

app.post('/api/analytics/download-doc/:id', (req, res) => {
    db.run("UPDATE documents SET downloads = downloads + 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "บันทึกการดาวน์โหลดแล้ว" });
    });
});

// เริ่มต้น Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
