const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 🟢 เชื่อมต่อ Supabase ผ่าน PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Supabase Connection Error:', err.stack);
    } else {
        console.log('Connected to Supabase PostgreSQL successfully!');
        release();
    }
});

// 🟢 สร้างตารางอัตโนมัติบน Supabase
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                fullname TEXT,
                role TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS lessons (
                id SERIAL PRIMARY KEY,
                title TEXT,
                category TEXT,
                summary TEXT,
                content TEXT,
                image_url TEXT,
                video_url TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                title TEXT,
                category TEXT,
                fiscal_year TEXT,
                file_path TEXT,
                file_url TEXT,
                downloads INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database tables verified on Supabase.');
    } catch (err) {
        console.error('Table Creation Error:', err.message);
    }
};
initDB();

// ==========================================
// 📚 APIs: Lessons
// ==========================================
app.get('/api/lessons', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM lessons ORDER BY id DESC");
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🟢 ปรับปรุง API ดึงข้อมูลบทเรียนราย ID ให้ส่งค่ากลับอย่างถูกต้อง
app.get('/api/lessons/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM lessons WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "ไม่พบบทเรียน" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/lessons', async (req, res) => {
    try {
        const title = req.body?.title || 'ไม่มีชื่อหัวข้อ';
        const category = req.body?.category || '-';
        const summary = req.body?.summary || '';
        const content = req.body?.content || '';
        const image_url = req.body?.image_url || null;
        const video_url = req.body?.video_url || '';

        const query = `INSERT INTO lessons (title, category, summary, content, image_url, video_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const values = [title, category, summary, content, image_url, video_url];
        const result = await pool.query(query, values);
        res.json({ message: "บันทึกบทเรียนสำเร็จ", id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/lessons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const title = req.body?.title || 'ไม่มีชื่อหัวข้อ';
        const category = req.body?.category || '-';
        const summary = req.body?.summary || '';
        const content = req.body?.content || '';
        const video_url = req.body?.video_url || '';
        const image_url = req.body?.image_url;

        let query, values;
        if (image_url) {
            query = `UPDATE lessons SET title = $1, category = $2, summary = $3, content = $4, video_url = $5, image_url = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7`;
            values = [title, category, summary, content, video_url, image_url, id];
        } else {
            query = `UPDATE lessons SET title = $1, category = $2, summary = $3, content = $4, video_url = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`;
            values = [title, category, summary, content, video_url, id];
        }

        await pool.query(query, values);
        res.json({ message: "อัปเดตบทเรียนสำเร็จ" });
    } catch (err) {
        console.error("Lesson Update Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/lessons/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM lessons WHERE id = $1", [req.params.id]);
        res.json({ message: 'ลบสำเร็จ' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 📄 APIs: Documents
// ==========================================
app.get('/api/documents', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM documents ORDER BY id DESC");
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/documents', async (req, res) => {
    try {
        const title = req.body?.title || req.body?.doc_title || req.body?.name || 'ไม่มีชื่อเอกสาร';
        const category = req.body?.category || '-';
        const fiscal_year = req.body?.fiscal_year || req.body?.year || '-';
        const file_url = req.body?.file_url || '';

        const query = `INSERT INTO documents (title, category, fiscal_year, file_path, file_url) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
        const result = await pool.query(query, [title, category, fiscal_year, file_url, file_url]);
        res.json({ message: 'บันทึกเอกสารสำเร็จ', id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/documents/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM documents WHERE id = $1", [req.params.id]);
        res.json({ message: 'ลบสำเร็จ' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 👤 APIs: Users & Login
// ==========================================
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, fullname, role FROM users");
        res.json({ data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const username = req.body?.username;
        const password = req.body?.password;
        const fullname = req.body?.fullname || username;
        const role = req.body?.role || 'เจ้าหน้าที่ทั่วไป';

        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (username, password, fullname, role) VALUES ($1, $2, $3, $4) RETURNING id`;
        const result = await pool.query(query, [username, hashedPassword, fullname, role]);
        res.json({ message: 'เพิ่มผู้ใช้งานสำเร็จ', id: result.rows[0].id });
    } catch (err) {
        console.error('User Insert Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
        res.json({ message: 'ลบผู้ใช้สำเร็จ' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const username = req.body?.username;
        const password = req.body?.password;

        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (result.rows.length === 0) return res.status(400).json({ message: 'ไม่พบผู้ใช้' });
        
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ message: 'รหัสผ่านผิด' });
        
        res.json({ message: 'สำเร็จ', user: { id: user.id, username: user.username, fullname: user.fullname } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
