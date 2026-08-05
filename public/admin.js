// ==========================================
// 🛠️ ADMIN.JS - ระบบจัดการหลังบ้าน
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // โหลดข้อมูลเข้าตารางเมื่อเปิดหน้าเว็บ
    loadUsers();
    loadAdminDocuments();
    loadAdminLessons();

    // 1. ฟอร์มเพิ่มผู้ใช้งาน
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username')?.value.trim();
            const password = document.getElementById('password')?.value.trim();
            const fullname = document.getElementById('fullname')?.value.trim();

            if (!username || !password) {
                alert('กรุณากรอก Username และ Password ให้ครบถ้วน');
                return;
            }

            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, fullname })
                });
                const result = await response.json();
                if (response.ok) {
                    alert('เพิ่มผู้ใช้งานสำเร็จ!');
                    addUserForm.reset();
                    loadUsers();
                } else {
                    alert(result.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน');
                }
            } catch (err) {
                console.error('Error adding user:', err);
                alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            }
        });
    }

    // 2. ฟอร์มอัปโหลดเอกสาร
    const docForm = document.getElementById('documentForm') || document.getElementById('uploadDocForm');
    if (docForm) {
        docForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(docForm);

            try {
                const response = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData
                });
                if (response.ok) {
                    alert('อัปโหลดเอกสารสำเร็จ!');
                    docForm.reset();
                    loadAdminDocuments();
                } else {
                    alert('เกิดข้อผิดพลาดในการอัปโหลด');
                }
            } catch (err) {
                console.error('Error uploading document:', err);
            }
        });
    }

    // 3. ปุ่มบันทึกบทเรียน
    const btnSaveLesson = document.getElementById('btnSaveLesson');
    if (btnSaveLesson) {
        btnSaveLesson.addEventListener('click', async () => {
            const title = document.getElementById('lessonTitle')?.value.trim();
            const category = document.getElementById('lessonCategory')?.value.trim();
            const summary = document.getElementById('lessonSummary')?.value.trim();
            const content = document.getElementById('lessonContent')?.value.trim();
            const video_url = document.getElementById('lessonVideo')?.value.trim();
            const imageFile = document.getElementById('lessonImage')?.files[0];

            if (!title) {
                alert('กรุณากรอกหัวข้อบทเรียน');
                return;
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('category', category);
            formData.append('summary', summary);
            formData.append('content', content);
            formData.append('video_url', video_url);
            if (imageFile) {
                formData.append('image', imageFile);
            }

            try {
                const response = await fetch('/api/lessons', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert('เพิ่มบทเรียนเรียบร้อยแล้ว!');
                    if (document.getElementById('lessonTitle')) document.getElementById('lessonTitle').value = '';
                    if (document.getElementById('lessonCategory')) document.getElementById('lessonCategory').value = '';
                    if (document.getElementById('lessonSummary')) document.getElementById('lessonSummary').value = '';
                    if (document.getElementById('lessonContent')) document.getElementById('lessonContent').value = '';
                    if (document.getElementById('lessonVideo')) document.getElementById('lessonVideo').value = '';
                    if (document.getElementById('lessonImage')) document.getElementById('lessonImage').value = '';

                    loadAdminLessons();
                } else {
                    alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถบันทึกได้'));
                }
            } catch (err) {
                console.error('Error adding lesson:', err);
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
            }
        });
    }
});

// ==========================================
// 👥 โหลดผู้ใช้งาน (Users)
// ==========================================
async function loadUsers() {
    const userTableBody = document.getElementById('userTableBody') || document.getElementById('adminUserTableBody');
    if (!userTableBody) return;

    try {
        const response = await fetch('/api/users');
        const result = await response.json();
        const users = result.data || result;

        userTableBody.innerHTML = '';
        if (!Array.isArray(users) || users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 15px;">ไม่พบผู้ใช้งาน</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            const displayName = user.fullname || user.name || '-';
            const isMainAdmin = (user.id === 1 || user.username === 'admin');
            const deleteBtnHTML = isMainAdmin
                ? `<span style="color: #94a3b8; font-size: 13px;">🔒 ห้ามลบ</span>`
                : `<button onclick="deleteUser(${user.id})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">ลบ</button>`;

            row.innerHTML = `
                <td>${user.id}</td>
                <td><strong>${user.username}</strong></td>
                <td>${displayName}</td>
                <td>${deleteBtnHTML}</td>
            `;
            userTableBody.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading users:', err);
    }
}

async function deleteUser(id) {
    if (id === 1 || id === '1') {
        alert('ไม่สามารถลบบัญชี Admin หลักของระบบได้!');
        return;
    }
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งานนี้?')) return;

    try {
        const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('ลบผู้ใช้งานเรียบร้อยแล้ว');
            loadUsers();
        } else {
            const result = await response.json();
            alert(result.message || 'ไม่สามารถลบผู้ใช้งานได้');
        }
    } catch (err) {
        console.error('Error deleting user:', err);
    }
}

// ==========================================
// 📄 โหลดเอกสาร (Documents)
// ==========================================
async function loadAdminDocuments() {
    const docTableBody = document.getElementById('adminDocTableBody') || document.getElementById('docTableBody');
    if (!docTableBody) return;

    try {
        const response = await fetch('/api/documents');
        const result = await response.json();
        const docs = Array.isArray(result) ? result : (result.data || []);

        docTableBody.innerHTML = '';
        if (!docs || docs.length === 0) {
            docTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px;">ยังไม่มีเอกสารในระบบ</td></tr>`;
            return;
        }

        docs.forEach(doc => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';
            tr.innerHTML = `
                <td style="padding: 10px;">${doc.title}</td>
                <td style="padding: 10px;">${doc.category || '-'}</td>
                <td style="padding: 10px;">${doc.fiscal_year || '-'}</td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="deleteDocument(${doc.id})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                        🗑️ ลบ
                    </button>
                </td>
            `;
            docTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading documents:', err);
    }
}

async function deleteDocument(id) {
    if (!confirm('คุณต้องการลบเอกสารนี้ใช่หรือไม่?')) return;
    try {
        const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('ลบเอกสารเรียบร้อยแล้ว!');
            loadAdminDocuments();
        } else {
            alert('เกิดข้อผิดพลาดในการลบเอกสาร');
        }
    } catch (err) {
        console.error('Error deleting document:', err);
    }
}
// ==========================================
// 📚 โหลดบทเรียน (Lessons)
// ==========================================
async function loadAdminLessons() {
    const tableBody = document.getElementById('adminLessonsTable') || document.getElementById('adminLessonTableBody') || document.getElementById('lessonTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch('/api/lessons');
        const result = await response.json();
        const lessons = Array.isArray(result) ? result : (result.data || []);

        tableBody.innerHTML = '';
        if (!lessons || lessons.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">ยังไม่มีบทเรียนในระบบ</td></tr>';
            return;
        }

        lessons.forEach(lesson => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';

            const hasImage = lesson.image_url ? '🖼️' : '';
            const hasVideo = lesson.video_url ? '🎬' : '';
            const mediaBadge = (hasImage || hasVideo) ? `${hasImage} ${hasVideo}` : '-';

            // 📌 ใส่ทั้งปุ่ม "แก้ไข" และปุ่ม "ลบ" กลับเข้ามาตรงนี้ครับ
            tr.innerHTML = `
                <td style="padding: 12px 10px;">${lesson.id}</td>
                <td style="padding: 12px 10px;"><strong>${lesson.title || 'ไม่มีหัวข้อ'}</strong></td>
                <td style="padding: 12px 10px;"><span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 13px;">${lesson.category || '-'}</span></td>
                <td style="padding: 12px 10px; text-align: center;">${mediaBadge}</td>
                <td style="padding: 12px 10px; text-align: center; white-space: nowrap;">
                    <button onclick="openEditModal(${lesson.id})" style="background: #f59e0b; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                        ✏️ แก้ไข
                    </button>
                    <button onclick="deleteLesson(${lesson.id})" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                        🗑️ ลบ
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading admin lessons:', err);
    }
}

async function deleteLesson(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบทเรียนนี้?')) return;
    try {
        const response = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('ลบบทเรียนเรียบร้อยแล้ว');
            loadAdminLessons();
        } else {
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    } catch (err) {
        console.error('Error deleting lesson:', err);
    }
}
