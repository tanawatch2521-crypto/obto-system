// ==========================================
// 1. โหลดข้อมูลทั้งหมดเมื่อเปิดหน้าเว็บ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadDocuments();
    loadAdminLessons();
  });

// ==========================================
// 2. ฟังก์ชันจัดการผู้ใช้งาน (Users)
// ==========================================

// ดึงรายชื่อผู้ใช้งานมาแสดงในตาราง
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const result = await response.json();
        const users = result.data || result; // 📌 แก้บรรทัดนี้เพื่อดึงข้อมูลจาก { data: rows }
        
        const userTableBody = document.getElementById('userTableBody');
        if (!userTableBody) return;

        userTableBody.innerHTML = ''; 

        if (!users || users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 15px;">ไม่พบผู้ใช้งาน</td></tr>';
            return;
        }

               users.forEach(user => {
            const row = document.createElement('tr');
            const displayName = user.fullname || user.name || '-';

            // 🛡️ 1. เช็คว่าเป็น Admin หลักหรือไม่ (id เป็น 1 หรือ username เป็น admin)
            const isMainAdmin = (user.id === 1 || user.username === 'admin');

            // 🛡️ 2. กำหนดปุ่มลบ (ถ้าเป็น admin หลัก จะซ่อนปุ่มลบแล้วแสดงคำว่า 🔒 ห้ามลบ)
            const deleteBtnHTML = isMainAdmin 
                ? `<span style="color: #94a3b8; font-size: 13px;">🔒 ห้ามลบ</span>` 
                : `<button onclick="deleteUser(${user.id})" class="btn-danger">ลบ</button>`;

            row.innerHTML = `
                <td>${user.id}</td>
                <td><strong>${user.username}</strong></td>
                <td>${displayName}</td>
                <td>
                    ${deleteBtnHTML}
                </td>
            `;
            userTableBody.appendChild(row);
        });

    } catch (err) {
        console.error('Error loading users:', err);
        const userTableBody = document.getElementById('userTableBody');
        if (userTableBody) {
            userTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding: 15px;">เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้งาน</td></tr>';
        }
    }
}


// ฟังก์ชันเพิ่มผู้ใช้งานใหม่
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
                addUserForm.reset(); // ล้างช่องกรอกข้อมูล
                loadUsers(); // โหลดรายการผู้ใช้ใหม่ทันที
            } else {
                alert(result.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน');
            }
        } catch (err) {
            console.error('Error adding user:', err);
            alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    });
}

// ฟังก์ชันลบผู้ใช้งาน
async function deleteUser(id) {
    // 🛡️ ดักเช็คฝั่ง JS ไม่ให้สั่งลบ ID 1 เด็ดขาด
    if (id === 1 || id === '1') {
        alert('ไม่สามารถลบบัญชี Admin หลักของระบบได้!');
        return;
    }

    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งานนี้?')) return;

    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('ลบผู้ใช้งานเรียบร้อยแล้ว');
            loadUsers(); // อัปเดตตารางใหม่
        } else {
            const result = await response.json();
            alert(result.message || 'ไม่สามารถลบผู้ใช้งานได้');
        }
    } catch (err) {
        console.error('Error deleting user:', err);
        alert('เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
    }
}

// ==========================================
// 3. ฟังก์ชันจัดการเอกสาร (Documents)
// ==========================================

async function loadDocuments() {
    const docTableBody = document.getElementById('docTableBody');
    if (!docTableBody) return;

    try {
        const response = await fetch('/api/documents');
        const result = await response.json();
        
        // 📌 จุดแก้ไข: รองรับทั้งกรณีที่ส่งมาเป็น { data: [...] } หรือ Array [...] ตรงๆ
        const docs = Array.isArray(result) ? result : (result.data || []);

        docTableBody.innerHTML = ''; // ล้างข้อมูลเก่าก่อน

        if (docs.length === 0) {
            docTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px;">ยังไม่มีเอกสารในระบบ</td></tr>`;
            return;
        }

        // 📌 สั่งวนลูปปลอดภัย 100% แล้ว
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


// ฟังก์ชันสั่งลบเอกสาร
async function deleteDocument(id) {
    if (!confirm('คุณต้องการลบเอกสารนี้ใช่หรือไม่?')) return;

    try {
        const response = await fetch(`/api/documents/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('ลบเอกสารเรียบร้อยแล้ว!');
            loadAdminDocuments(); // เรียกฟังก์ชันโหลดตารางใหม่อีกครั้ง
        } else {
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    } catch (err) {
        console.error('Error deleting document:', err);
    }
}


// โหลดรายการบทเรียนมาใส่ตาราง Admin
async function loadAdminLessons() {
    try {
        const response = await fetch('/api/lessons');
        const result = await response.json();
        const lessons = result.data || result;

        const tableBody = document.getElementById('adminLessonsTable');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (!Array.isArray(lessons) || lessons.length === === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">ยังไม่มีบทเรียนในระบบ</td></tr>'; // 👈 colspan เปลี่ยนเป็น 5
            return;
        }

        lessons.forEach(lesson => {
            const tr = document.createElement('tr');
            
            // ตรวจสอบไอคอนสื่อประกอบ (รูปภาพ / วิดีโอ)
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

    } catch (err) {
        console.error('Error loading admin lessons:', err);
    }
}

// ฟังก์ชันสั่งลบบทเรียน
async function deleteLesson(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบทเรียนนี้?')) return;

    try {
        const response = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('ลบบทเรียนเรียบร้อยแล้ว');
            loadAdminLessons(); // โหลดตารางใหม่
        } else {
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    } catch (err) {
        console.error('Error deleting lesson:', err);
    }
}


// ฟังก์ชันสั่งลบบทเรียน
async function deleteLesson(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบทเรียนนี้?')) return;

    try {
        const response = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('ลบบทเรียนเรียบร้อยแล้ว');
            loadAdminLessons(); // โหลดตารางใหม่
        } else {
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    } catch (err) {
        console.error('Error deleting lesson:', err);
    }
}
// ฟังก์ชันส่งฟอร์มอัปโหลดเอกสาร
const docForm = document.getElementById('documentForm');
if (docForm) {
    docForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(docForm);

        try {
            const response = await fetch('/api/documents', {
                method: 'POST',
                body: formData // ส่งแบบ FormData เพื่ออัปโหลดไฟล์
            });

            if (response.ok) {
                alert('อัปโหลดเอกสารสำเร็จ!');
                docForm.reset();
                if (typeof loadDocuments === 'function') loadDocuments();
            } else {
                alert('เกิดข้อผิดพลาดในการอัปโหลด');
            }
        } catch (err) {
            console.error('Error uploading document:', err);
        }
    });
}
// ฟังก์ชันดึงรายการเอกสารมาแสดงในหน้า Admin
async function loadAdminDocuments() {
    const docTableBody = document.getElementById('docTableBody');
    if (!docTableBody) return;

    try {
        const response = await fetch('/api/documents');
        const result = await response.json();
        const docs = result.data || result;

        if (!docs || docs.length === 0) {
            docTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px;">ยังไม่มีเอกสารในระบบ</td></tr>`;
            return;
        }

        docTableBody.innerHTML = docs.map(doc => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px;">${doc.title}</td>
                <td style="padding: 10px;">${doc.category || '-'}</td>
                <td style="padding: 10px;">${doc.fiscal_year || '-'}</td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="deleteDocument(${doc.id})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                        🗑️ ลบ
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading documents:', err);
    }
}

// ฟังก์ชันสั่งลบเอกสาร
async function deleteDocument(id) {
    if (!confirm('คุณต้องการลบเอกสารนี้ใช่หรือไม่?')) return;

    try {
        const response = await fetch(`/api/documents/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('ลบเอกสารเรียบร้อยแล้ว!');
            loadAdminDocuments(); // โหลดตารางใหม่ทันทีหลังลบ
        } else {
            alert('เกิดข้อผิดพลาดในการลบเอกสาร');
        }
    } catch (err) {
        console.error('Error deleting document:', err);
    }
}

// เรียกใช้งานฟังก์ชันเมื่อเปิดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    loadAdminDocuments();
});
// โค้ดบันทึกบทเรียนใหม่เข้า Database
// โค้ดบันทึกบทเรียนใหม่เข้า Database
document.addEventListener('DOMContentLoaded', () => {
    const addLessonForm = document.getElementById('addLessonForm');

    if (addLessonForm) {
               addLessonForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // ป้องกันไม่ให้หน้าเว็บรีเฟรชเอง

            // ดึงข้อมูลทั้งหมดจากฟอร์มรวมถึงไฟล์รูปภาพและลิงก์วิดีโออัตโนมัติ
            const formData = new FormData(addLessonForm);

            try {
                const response = await fetch('/api/lessons', {
                    method: 'POST',
                    body: formData // ส่งเป็น FormData ตรงๆ (ไม่ต้องใส่ headers Content-Type)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('เพิ่มบทเรียนเรียบร้อยแล้ว!');
                    addLessonForm.reset(); // ล้างฟอร์ม
                    
                    // โหลดรายการใหม่ในตาราง Admin (ถ้ามีฟังก์ชันนี้อยู่)
                    if (typeof loadAdminLessons === 'function') {
                        loadAdminLessons();
                    }
                } else {
                    alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถบันทึกได้'));
                }
            } catch (err) {
                console.error('Error adding lesson:', err);
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
            }
        });
        });
// เปิด Modal และดึงข้อมูลบทเรียนเดิมมาแสดง
async function openEditModal(id) {
    try {
        const response = await fetch(`/api/lessons/${id}`);
        const lesson = await response.json();

        if (response.ok) {
            document.getElementById('editLessonId').value = lesson.id;
            document.getElementById('editLessonTitle').value = lesson.title || '';
            document.getElementById('editLessonCategory').value = lesson.category || '';
            document.getElementById('editLessonSummary').value = lesson.summary || '';
            document.getElementById('editLessonContent').value = lesson.content || '';
            
            // ดึงลิงก์วิดีโอเดิมมาวาง (ถ้ามี Element id="editLessonVideo")
            const videoEl = document.getElementById('editLessonVideo');
            if (videoEl) videoEl.value = lesson.video_url || '';

            // เคลียร์ช่องเลือกไฟล์รูปภาพใหม่
            const imageEl = document.getElementById('editLessonImage');
            if (imageEl) imageEl.value = '';

            document.getElementById('editLessonModal').style.display = 'flex';
        } else {
            alert('ไม่สามารถดึงข้อมูลบทเรียนได้');
        }
    } catch (err) {
        console.error('Error fetching lesson:', err);
    }
}

// ปิด Modal
function closeEditModal() {
    document.getElementById('editLessonModal').style.display = 'none';
}

// บันทึกข้อมูลที่แก้ไข
document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editLessonForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
                     e.preventDefault();

            const id = document.getElementById('editLessonId').value;
            
            // ใช้ FormData ดึงข้อมูลทั้งหมดในฟอร์มแก้ไข (รวมทั้งไฟล์รูปภาพใหม่)
            const formData = new FormData(editForm);

            try {
                const response = await fetch(`/api/lessons/${id}`, {
                    method: 'PUT',
                    body: formData // ส่งเป็น FormData ตรงๆ (ห้ามใส่ headers Content-Type)
                });

                if (response.ok) {
                    alert('อัปเดตบทเรียนเรียบร้อยแล้ว!');
                    closeEditModal();
                    if (typeof loadAdminLessons === 'function') {
                        loadAdminLessons();
                    }
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
