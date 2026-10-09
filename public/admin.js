// ==========================================
// 🛠️ ADMIN.JS - เชื่อมต่อ Cloudinary ถาวร
// ==========================================
const CLOUDINARY_CLOUD_NAME = 'gibe8jv9';
const CLOUDINARY_UPLOAD_PRESET = 'nzjzsfyr';

let quill, editQuill;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('editor') && typeof Quill !== 'undefined') {
        quill = new Quill('#editor', { theme: 'snow', placeholder: 'พิมพ์เนื้อหาบทเรียน...' });
    }
    if (document.getElementById('editEditor') && typeof Quill !== 'undefined') {
        editQuill = new Quill('#editEditor', { theme: 'snow', placeholder: 'แก้ไขเนื้อหาบทเรียน...' });
    }

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

            if (!username || !password) return alert('กรุณากรอก Username และ Password ให้ครบถ้วน');

            try {
                const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, fullname })
                });
                const result = await res.json();
                if (res.ok) {
                    alert('เพิ่มผู้ใช้งานสำเร็จ!');
                    addUserForm.reset();
                    loadUsers();
                } else alert(result.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน');
            } catch (err) { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
        });
    }

    // 2. ฟอร์มอัปโหลดเอกสารไป Cloudinary (ถาวร 100%)
    const uploadDocForm = document.getElementById('uploadDocForm');
    if (uploadDocForm) {
        uploadDocForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('docTitle');
            const categoryInput = document.getElementById('docCategory');
            const yearInput = document.getElementById('docYear');
            const fileInput = document.getElementById('docFile');

            if (!fileInput || !fileInput.files[0]) return alert('กรุณาเลือกไฟล์เอกสารก่อนกดอัปโหลด');

            const file = fileInput.files[0];
            const titleVal = titleInput ? titleInput.value.trim() : file.name;

            try {
                // ส่งไฟล์ไปเก็บที่ Cloudinary
                const cloudData = new FormData();
                cloudData.append('file', file);
                cloudData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
                    method: 'POST',
                    body: cloudData
                });

                const cloudResult = await cloudRes.json();
                if (!cloudRes.ok) {
                    return alert('อัปโหลดไฟล์ไป Cloud Storage ไม่สำเร็จ: ' + (cloudResult.error?.message || ''));
                }

                // ส่ง URL ถาวรไปบันทึกลงระบบ
                const docData = {
                    title: titleVal,
                    doc_title: titleVal,
                    name: titleVal,
                   category: categoryInput ? categoryInput.value : '-',
                    year: yearInput ? yearInput.value : '-',
                    fiscal_year: yearInput ? yearInput.value : '-',
                    file_url: cloudResult.secure_url,
                    filename: file.name
                };

                const res = await fetch('/api/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(docData)
                });

                if (res.ok) {
                    alert('อัปโหลดเอกสารขึ้น Cloud Storage ถาวรเรียบร้อยแล้ว!');
                    uploadDocForm.reset();
                    loadAdminDocuments();
                } else alert('บันทึกข้อมูลเอกสารไม่สำเร็จ');

            } catch (err) {
                console.error('Upload Error:', err);
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
            }
        });
    }

    // 3. บันทึกบทเรียน
    const btnSaveLesson = document.getElementById('btnSaveLesson');
    if (btnSaveLesson) {
        btnSaveLesson.addEventListener('click', async () => {
            const title = document.getElementById('lessonTitle')?.value.trim();
            const category = document.getElementById('lessonCategory')?.value.trim();
            const summary = document.getElementById('lessonSummary')?.value.trim();
            const video_url = document.getElementById('lessonVideo')?.value.trim();
            const imageInput = document.getElementById('lessonImage');
            const imageFile = imageInput && imageInput.files ? imageInput.files[0] : null;
            const content = quill ? quill.root.innerHTML : (document.getElementById('lessonContent')?.value.trim() || '');

            if (!title) return alert('กรุณากรอกหัวข้อบทเรียน');

            const formData = new FormData();
            formData.append('title', title);
            formData.append('category', category);
            formData.append('summary', summary);
            formData.append('content', content);
            formData.append('video_url', video_url);
            if (imageFile) formData.append('image', imageFile);

            try {
                const res = await fetch('/api/lessons', { method: 'POST', body: formData });
                if (res.ok) {
                    alert('เพิ่มบทเรียนเรียบร้อยแล้ว!');
                    if (document.getElementById('lessonTitle')) document.getElementById('lessonTitle').value = '';
                    if (document.getElementById('lessonCategory')) document.getElementById('lessonCategory').value = '';
                    if (document.getElementById('lessonSummary')) document.getElementById('lessonSummary').value = '';
                    if (quill) quill.setText('');
                    loadAdminLessons();
                } else alert('เกิดข้อผิดพลาดในการบันทึกบทเรียน');
            } catch (err) { alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'); }
        });
    }

    // 4. แก้ไขบทเรียน
    const editLessonForm = document.getElementById('editLessonForm');
    if (editLessonForm) {
        editLessonForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editLessonId')?.value;
            const title = document.getElementById('editLessonTitle')?.value.trim();
            const category = document.getElementById('editLessonCategory')?.value.trim();
            const summary = document.getElementById('editLessonSummary')?.value.trim();
            const content = editQuill ? editQuill.root.innerHTML : '';
            const video_url = document.getElementById('editLessonVideo')?.value.trim();
            const imageInput = document.getElementById('editLessonImage');
            const imageFile = imageInput && imageInput.files ? imageInput.files[0] : null;

            const formData = new FormData();
            formData.append('title', title);
            formData.append('category', category);
            formData.append('summary', summary);
            formData.append('content', content);
            formData.append('video_url', video_url);
            if (imageFile) formData.append('image', imageFile);

            try {
                const res = await fetch(`/api/lessons/${id}`, { method: 'PUT', body: formData });
                if (res.ok) {
                    alert('อัปเดตบทเรียนสำเร็จ!');
                    closeEditModal();
                    loadAdminLessons();
                } else alert('เกิดข้อผิดพลาดในการอัปเดต');
            } catch (err) { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
        });
    }
});

// ==========================================
// 👥 โหลดผู้ใช้งาน
// ==========================================
async function loadUsers() {
    const userTableBody = document.getElementById('userTableBody') || document.getElementById('adminUserTableBody');
    if (!userTableBody) return;

    try {
        const res = await fetch('/api/users');
        const result = await res.json();
        const users = Array.isArray(result) ? result : (result.data || []);

        userTableBody.innerHTML = '';
        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px;">ไม่พบผู้ใช้งาน</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            const isMainAdmin = (user.id === 1 || user.username === 'admin');
            const deleteBtn = isMainAdmin
                ? `<span style="color:#94a3b8; font-size:13px;">🔒 ห้ามลบ</span>`
                : `<button onclick="deleteUser(${user.id})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">ลบ</button>`;

            row.innerHTML = `<td>${user.id}</td><td><strong>${user.username}</strong></td><td>${user.fullname || user.name || '-'}</td><td>${deleteBtn}</td>`;
            userTableBody.appendChild(row);
        });
    } catch (err) { console.error('Error loading users:', err); }
}

async function deleteUser(id) {
    if (id === 1 || id === '1') return alert('ไม่สามารถลบบัญชี Admin หลักได้!');
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งานนี้?')) return;
    try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) { alert('ลบผู้ใช้งานเรียบร้อยแล้ว'); loadUsers(); }
        else alert('ไม่สามารถลบผู้ใช้งานได้');
    } catch (err) { console.error('Error deleting user:', err); }
}

// ==========================================
// 📄 โหลดและลบเอกสาร
// ==========================================
async function loadAdminDocuments() {
    try {
        const res = await fetch('/api/documents');
        const result = await res.json();
        const docs = Array.isArray(result) ? result : (result.data || []);
        const tbody = document.getElementById('adminDocTableBody') || document.querySelector('#adminDocTable body');
        if (!tbody) return;

        tbody.innerHTML = '';
        docs.forEach(doc => {
            const docId = doc.id || doc._id || doc.doc_id;
            const docTitle = doc.title || doc.doc_title || doc.name || doc.filename || 'ไม่มีชื่อเอกสาร';
            const docCategory = doc.category || doc.doc_category || '-';
            const docYear = doc.year || doc.fiscal_year || doc.fiscalYear || '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:10px;">${docTitle}</td>
                <td style="padding:10px;">${docCategory}</td>
                <td style="padding:10px;">${docYear}</td>
                <td style="padding:10px;">
                    <button onclick="deleteDoc('${docId}')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">
                        🗑️ ลบ
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error('Error loading admin docs:', err); }
}

window.deleteDoc = async function(id) {
    if (!id || id === 'undefined' || id === 'null') return alert('ไม่พบ ID ของเอกสาร ไม่สามารถลบได้');
    if (!confirm('คุณต้องการลบเอกสารนี้ใช่หรือไม่?')) return;

    try {
        const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('ลบเอกสารเรียบร้อยแล้ว!');
            loadAdminDocuments();
        } else alert('เกิดข้อผิดพลาดในการลบเอกสาร');
    } catch (err) { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อลบข้อมูลได้'); }
};
window.deleteDocument = window.deleteDoc;

// ==========================================
// 📚 โหลดและลบบทเรียน
// ==========================================
async function loadAdminLessons() {
    const tableBody = document.getElementById('adminLessonsTable') || document.getElementById('adminLessonTableBody') || document.getElementById('lessonTableBody');
    if (!tableBody) return;

    try {
        const res = await fetch('/api/lessons');
        const result = await res.json();
        const lessons = Array.isArray(result) ? result : (result.data || []);

        tableBody.innerHTML = '';
        if (lessons.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">ยังไม่มีบทเรียนในระบบ</td></tr>';
            return;
        }

        lessons.forEach(lesson => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';
            const mediaBadge = (lesson.image_url ? '🖼️ ' : '') + (lesson.video_url ? '🎬' : '') || '-';

            tr.innerHTML = `
                <td style="padding:12px 10px;">${lesson.id}</td>
                <td style="padding:12px 10px;"><strong>${lesson.title || 'ไม่มีหัวข้อ'}</strong></td>
                <td style="padding:12px 10px;"><span style="background:#e2e8f0; padding:2px 8px; border-radius:4px; font-size:13px;">${lesson.category || '-'}</span></td>
                <td style="padding:12px 10px; text-align:center;">${mediaBadge}</td>
                <td style="padding:12px 10px; text-align:center; white-space:nowrap;">
                    <button onclick="openEditModal(${lesson.id})" style="background:#f59e0b; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">✏️ แก้ไข</button>
                    <button onclick="deleteLesson(${lesson.id})" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">🗑️ ลบ</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) { console.error('Error loading admin lessons:', err); }
}

async function deleteLesson(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบทเรียนนี้?')) return;
    try {
        const res = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
        if (res.ok) { alert('ลบบทเรียนเรียบร้อยแล้ว'); loadAdminLessons(); }
        else alert('เกิดข้อผิดพลาดในการลบ');
    } catch (err) { console.error('Error deleting lesson:', err); }
}

async function openEditModal(id) {
    try {
        const res = await fetch(`/api/lessons/${id}`);
        const result = await res.json();
        const lesson = result.data || result;
        if (!lesson) return alert('ไม่พบข้อมูลบทเรียน');

        if (document.getElementById('editLessonId')) document.getElementById('editLessonId').value = lesson.id;
        if (document.getElementById('editLessonTitle')) document.getElementById('editLessonTitle').value = lesson.title || '';
        if (document.getElementById('editLessonCategory')) document.getElementById('editLessonCategory').value = lesson.category || '';
        if (document.getElementById('editLessonSummary')) document.getElementById('editLessonSummary').value = lesson.summary || '';
        if (document.getElementById('editLessonVideo')) document.getElementById('editLessonVideo').value = lesson.video_url || '';
        if (editQuill) editQuill.root.innerHTML = lesson.content || '';

        const modal = document.getElementById('editModal') || document.getElementById('editLessonModal');
        if (modal) modal.style.display = 'flex';
    } catch (err) { alert('เกิดข้อผิดพลาดในการโหลดข้อมูลบทเรียน'); }
}

function closeEditModal() {
    const modal = document.getElementById('editModal') || document.getElementById('editLessonModal');
    if (modal) modal.style.display = 'none';
}
