// ==========================================
// 🛠️ ADMIN.JS - ระบบจัดการหลังบ้าน
// ==========================================

// --------------------------------------
// บันทึกบทเรียน (ผูกตรงกับปุ่ม type="button")
// --------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // โหลดตารางเมื่อเปิดหน้าเว็บ
    loadUsers();
    loadAdminDocuments();
    loadAdminLessons();

    const btnSaveLesson = document.getElementById('btnSaveLesson');
    const addLessonForm = document.getElementById('addLessonForm');

    if (btnSaveLesson && addLessonForm) {
        btnSaveLesson.addEventListener('click', async (e) => {
            e.preventDefault();

            // ดึงค่ามาเช็คว่ากรอกหัวข้อหรือยัง
            const titleInput = document.getElementById('lessonTitle');
            if (titleInput && !titleInput.value.trim()) {
                alert('กรุณากรอกหัวข้อบทเรียน');
                return;
            }

            const formData = new FormData(addLessonForm);

            try {
                const response = await fetch('/api/lessons', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert('เพิ่มบทเรียนเรียบร้อยแล้ว!');
                    addLessonForm.reset();
                    
                    // ล้าง Query String บน URL ออกให้สะอาด
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // โหลดรายการตารางใหม่ทันที
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

    // 3. ฟอร์มเพิ่มบทเรียน
    const addLessonForm = document.getElementById('addLessonForm');
    if (addLessonForm) {
        addLessonForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addLessonForm);

            try {
                const response = await fetch('/api/lessons', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (response.ok) {
                    alert('เพิ่มบทเรียนเรียบร้อยแล้ว!');
                    addLessonForm.reset();
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

    // 4. ฟอร์มแก้ไขบทเรียน
    const editForm = document.getElementById('editLessonForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editLessonId').value;
            const formData = new FormData(editForm);

            try {
                const response = await fetch(`/api/lessons/${id}`, {
                    method: 'PUT',
                    body: formData
                });
                if (response.ok) {
                    alert('อัปเดตบทเรียนเรียบร้อยแล้ว!');
                    closeEditModal();
                    loadAdminLessons();
                } else {
                    const result = await response.json();
                    alert('เกิดข้อผิดพลาดในการอัปเดต: ' + (result.error || ''));
                }
            } catch (err) {
                console.error('Error updating lesson:', err);
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
                : `<button onclick="deleteUser(${user.id})" class="btn-danger" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px;">ลบ</button>`;

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
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:15px;">ยังไม่มีบทเรียนในระบบ</td></tr>';
            return;
        }

        lessons.forEach(lesson => {
            const tr = document.createElement('tr');
            const hasImage = lesson.image_url ? '<i class="fas fa-image text-primary me-1" title="มีรูปภาพ"></i>' : '';
            const hasVideo = lesson.video_url ? '<i class="fab fa-youtube text-danger me-1" title="มีวิดีโอ"></i>' : '';
            const mediaBadge = (hasImage || hasVideo) ? `${hasImage} ${hasVideo}` : '<span class="text-muted">-</span>';

            tr.innerHTML = `
                <td>${lesson.id}</td>
                <td><strong>${lesson.title || 'ไม่มีหัวข้อ'}</strong></td>
                <td><span class="badge bg-secondary">${lesson.category || '-'}</span></td>
                <td class="text-center" style="font-size: 1.1rem;">${mediaBadge}</td>
                <td class="text-center">
                    <button onclick="openEditModal(${lesson.id})" style="background: #f59e0b; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                        ✏️ แก้ไข
                    </button>
                    <button onclick="deleteLesson(${lesson.id})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
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

// ==========================================
// ✏️ Modal แก้ไข
// ==========================================
async function openEditModal(id) {
    try {
        const response = await fetch(`/api/lessons/${id}`);
        const lesson = await response.json();

        if (response.ok) {
            if(document.getElementById('editLessonId')) document.getElementById('editLessonId').value = lesson.id;
            if(document.getElementById('editLessonTitle')) document.getElementById('editLessonTitle').value = lesson.title || '';
            if(document.getElementById('editLessonCategory')) document.getElementById('editLessonCategory').value = lesson.category || '';
            if(document.getElementById('editLessonSummary')) document.getElementById('editLessonSummary').value = lesson.summary || '';
            if(document.getElementById('editLessonContent')) document.getElementById('editLessonContent').value = lesson.content || '';

            const videoEl = document.getElementById('editLessonVideo');
            if (videoEl) videoEl.value = lesson.video_url || '';

            const imageEl = document.getElementById('editLessonImage');
            if (imageEl) imageEl.value = '';

            const modal = document.getElementById('editLessonModal');
            if (modal) modal.style.display = 'flex';
        } else {
            alert('ไม่สามารถดึงข้อมูลบทเรียนได้');
        }
    } catch (err) {
        console.error('Error fetching lesson:', err);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editLessonModal');
    if (modal) modal.style.display = 'none';
}
