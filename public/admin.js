// ==========================================
// 🛠️ ADMIN.JS - ระบบจัดการหลังบ้าน (ฉบับแก้ไข SyntaxError สมบูรณ์)
// ==========================================
let quill;
let editQuill;

document.addEventListener('DOMContentLoaded', () => {
    // 1. เปิดใช้งาน Quill Editor
    const editorContainer = document.getElementById('editor');
    if (editorContainer && typeof Quill !== 'undefined') {
        quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['image', 'link'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            },
            placeholder: 'พิมพ์เนื้อหาบทเรียน...'
        });
    }

    const editEditorContainer = document.getElementById('editEditor');
    if (editEditorContainer && typeof Quill !== 'undefined') {
        editQuill = new Quill('#editEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['image', 'link'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            },
            placeholder: 'แก้ไขเนื้อหาบทเรียน...'
        });
    }

    // โหลดข้อมูลเข้าตารางเมื่อเปิดหน้าเว็บ
    loadUsers();
    loadAdminDocuments();
    loadAdminLessons();

    // 2. ฟอร์มเพิ่มผู้ใช้งาน
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

    // 3. ฟอร์มอัปโหลดเอกสารฝั่ง Admin
    const uploadDocForm = document.getElementById('uploadDocForm');
    if (uploadDocForm) {
        uploadDocForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const titleInput = document.getElementById('docTitle');
            const categoryInput = document.getElementById('docCategory');
            const yearInput = document.getElementById('docYear');
            const fileInput = document.getElementById('docFile');

            if (!fileInput || !fileInput.files[0]) {
                alert('กรุณาเลือกไฟล์เอกสารก่อนกดอัปโหลด');
                return;
            }

            const formData = new FormData();
            const titleValue = titleInput ? titleInput.value.trim() : '';
            formData.append('title', titleValue);
            formData.append('doc_title', titleValue);
            formData.append('name', titleValue);

            formData.append('category', categoryInput ? categoryInput.value : 'ทั่วไป');
            formData.append('year', yearInput ? yearInput.value : '-');
            formData.append('fiscal_year', yearInput ? yearInput.value : '-');

            formData.append('file', fileInput.files[0]);

            try {
                const res = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    alert('อัปโหลดเอกสารเรียบร้อยแล้ว!');
                    uploadDocForm.reset();
                    loadAdminDocuments();
                } else {
                    const errData = await res.json().catch(() => ({}));
                    alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + (errData.message || 'เซิร์ฟเวอร์ปฏิเสธการอัปโหลด'));
                }
            } catch (err) {
                console.error('Upload Error:', err);
                alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
            }
        });
    }

    // 4. ปุ่มบันทึกบทเรียน
    const btnSaveLesson = document.getElementById('btnSaveLesson');
    if (btnSaveLesson) {
        btnSaveLesson.addEventListener('click', async () => {
            const title = document.getElementById('lessonTitle')?.value.trim();
            const category = document.getElementById('lessonCategory')?.value.trim();
            const summary = document.getElementById('lessonSummary')?.value.trim();
            const video_url = document.getElementById('lessonVideo')?.value.trim();
            
            const imageInput = document.getElementById('lessonImage');
            const imageFile = imageInput && imageInput.files ? imageInput.files[0] : null;

            let content = quill ? quill.root.innerHTML : (document.getElementById('lessonContent')?.value.trim() || '');

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
            if (imageFile) formData.append('image', imageFile);

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
                    if (quill) quill.setText('');
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

    // 5. ฟอร์มบันทึกการแก้ไขบทเรียน (Update Lesson)
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
                const response = await fetch(`/api/lessons/${id}`, {
                    method: 'PUT',
                    body: formData
                });

                if (response.ok) {
                    alert('อัปเดตบทเรียนสำเร็จ!');
                    closeEditModal();
                    loadAdminLessons();
                } else {
                    alert('เกิดข้อผิดพลาดในการอัปเดตบทเรียน');
                }
            } catch (err) {
                console.error('Error updating lesson:', err);
                alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
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

    try
