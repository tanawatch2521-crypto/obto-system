// ==========================================
// 1. โหลดข้อมูลทั้งหมดเมื่อเปิดหน้าเว็บ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadLessons();
    loadDocuments();
});

// ==========================================
// 2. ฟังก์ชันจัดการบทเรียน (Lessons)
// ==========================================
async function loadLessons() {
    try {
        const response = await fetch('/api/lessons');
        if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลบทเรียนได้');

        const result = await response.json();
        const lessons = Array.isArray(result) ? result : (result.data || []);

        // หา Container จาก ID ใน HTML
        const container = document.getElementById('lessons-container') || document.getElementById('lessonContainer');
        if (!container) return;

        container.innerHTML = ''; // ล้างข้อความกำลังโหลด

        if (!Array.isArray(lessons) || lessons.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b; grid-column: 1/-1;">ไม่มีบทเรียนในระบบ</p>';
            return;
        }

        lessons.forEach(lesson => {
            const card = document.createElement('div');
            card.className = 'lesson-card';
            card.style.cssText = 'background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';

            const id = lesson.id;
            const category = lesson.category || 'ระบบ';
            const title = lesson.title || 'ไม่มีหัวข้อ';
            const summary = lesson.summary || lesson.description || '-';
            const content = lesson.content || 'ไม่มีรายละเอียดเนื้อหาเพิ่มเติม';

            card.innerHTML = `
                <!-- 1. หมวดหมู่ -->
                <span style="background: #2563eb; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                    ${category}
                </span>

                <!-- 2. หัวข้อบทเรียน -->
                <h3 style="margin: 10px 0 8px 0; font-size: 18px; color: #1e293b; font-weight: bold;">
                    ${title}
                </h3>

                <!-- 3. บทสรุป -->
                <p style="color: #64748b; font-size: 14px; margin-bottom: 12px;">
                    ${summary}
                </p>

                <!-- ปุ่มอ่านเพิ่มเติม -->
                <button onclick="toggleContent(${id})" id="btn-${id}" style="background: #2563eb; color: white; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer;">
                    อ่านเนื้อหาเพิ่มเติม
                </button>

                <!-- 4. ส่วนรายละเอียดเนื้อหา (ซ่อนไว้ก่อน) -->
                <div id="content-${id}" style="display: none; margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                    <strong style="display: block; margin-bottom: 8px; color: #0f172a;">รายละเอียดเนื้อหา:</strong>
                    <div style="white-space: pre-line; line-height: 1.6;">${content}</div>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (err) {
        console.error('Error loading lessons:', err);
    }
}

// ฟังก์ชันเปิด-ปิด แสดงเนื้อหาเพิ่มเติม
function toggleContent(id) {
    const contentDiv = document.getElementById(`content-${id}`);
    const btn = document.getElementById(`btn-${id}`);

    if (!contentDiv || !btn) return;

    if (contentDiv.style.display === 'none' || contentDiv.style.display === '') {
        contentDiv.style.display = 'block';
        btn.innerHTML = '✖️ ซ่อนเนื้อหา';
        btn.style.background = '#64748b';
    } else {
        contentDiv.style.display = 'none';
        btn.innerHTML = '📖 อ่านเนื้อหาเพิ่มเติม';
        btn.style.background = '#2563eb';
    }
}
function searchLessons() {
  const searchInput = document.getElementById('lessonSearchInput').value.toLowerCase();
  // ดึงการ์ดทั้งหมดที่อยู่ใน lessons-container
  const lessonCards = document.querySelectorAll('#lessons-container > div');

  lessonCards.forEach(card => {
    const cardText = card.textContent.toLowerCase();
    if (cardText.includes(searchInput)) {
      card.style.display = ""; // แสดงผล
    } else {
      card.style.display = "none"; // ซ่อน
    }
  });
}
// 📌 ตัวอย่างโค้ดสร้างการ์ดบทเรียน
function renderLessonCard(lesson) {
    // เช็คว่าบทเรียนนี้มี image_url หรือไม่
    const imageHTML = lesson.image_url 
        ? `<img src="${lesson.image_url}" alt="${lesson.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">` 
        : '';

    // เช็คว่ามีวิดีโอหรือไม่
    const videoHTML = lesson.video_url 
        ? `<div style="margin-top: 10px;"><iframe width="100%" height="250" src="${lesson.video_url}" frameborder="0" allowfullscreen style="border-radius: 8px;"></iframe></div>` 
        : '';

    return `
        <div class="lesson-card" style="border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <span class="badge" style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${lesson.category || 'ทั่วไป'}</span>
            <h3 style="margin: 8px 0;">${lesson.title}</h3>
            <p style="color: #64748b;">${lesson.summary || ''}</p>
            
            <!-- 🖼️ ใส่ HTML รูปภาพตรงนี้ -->
            ${imageHTML}

            <div class="lesson-content">
                <strong>รายละเอียดเนื้อหา:</strong>
                <p>${lesson.content}</p>
            </div>

            <!-- 🎬 ใส่ HTML วิดีโอตรงนี้ -->
            ${videoHTML}
        </div>
    `;
}


// ==========================================
// 3. ฟังก์ชันจัดการคลังเอกสาร (Documents)
// ==========================================

// ตัวแปร Global สำหรับเก็บข้อมูลเอกสารทั้งหมดไว้นำมากรอง
let allDocuments = [];

async function loadDocuments() {
    try {
        const response = await fetch('/api/documents');
        const result = await response.json();
        allDocuments = result.data || result; // บันทึกข้อมูลลงตัวแปร

        // วาดตารางครั้งแรก
        renderDocumentTable(allDocuments);
        
        // เติมตัวเลือกปีงบประมาณลง Dropdown
        populateFiscalYearDropdown(allDocuments);
    } catch (err) {
        console.error('Error loading documents:', err);
    }
}

// ฟังก์ชันสำหรับวาดตารางเอกสาร
function renderDocumentTable(docs) {
    const tableBody = document.getElementById('documentTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // ล้างข้อความ/ตารางเก่า

    if (!Array.isArray(docs) || docs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 15px;">ไม่พบเอกสารที่ค้นหา</td></tr>';
        return;
    }

    docs.forEach(doc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px; font-weight: 600;">${doc.title || doc.name || 'ไม่มีชื่อเอกสาร'}</td>
            <td style="padding: 12px; color: #2563eb;">${doc.category || '-'}</td>
            <td style="padding: 12px;">${doc.fiscal_year || doc.year || '-'}</td>
            <td style="padding: 12px;">
                <a href="${doc.file_path || doc.filePath || '#'}" download class="btn-download" style="background: #10b981; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; display: inline-block;">
                    📥 ดาวน์โหลด
                </a>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function populateFiscalYearDropdown(docs) {
    // เปลี่ยน id เป็น docYearFilter
    const yearSelect = document.getElementById('docYearFilter');
    if (!yearSelect) return;

    const years = [...new Set(docs.map(d => d.fiscal_year).filter(Boolean))].sort((a, b) => b - a);
    
    // ตั้งค่า option แรกเป็น value="all" ให้ตรงกับ HTML ของคุณ
    yearSelect.innerHTML = '<option value="all">-- ทุกปีงบประมาณ --</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}


// ฟังก์ชันค้นหาและกรองข้อมูล
function filterDocuments() {
    // เปลี่ยนตรงนี้ให้ตรงกับ ID ใน HTML (docSearchInput และ docYearFilter)
    const searchInput = document.getElementById('docSearchInput');
    const yearSelect = document.getElementById('docYearFilter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedYear = yearSelect ? yearSelect.value : '';

    const filteredDocs = allDocuments.filter(doc => {
        const titleMatch = (doc.title || '').toLowerCase().includes(searchTerm);
        const categoryMatch = (doc.category || '').toLowerCase().includes(searchTerm);
        const matchesSearch = titleMatch || categoryMatch;

        // ถ้ารับค่าเป็น 'all' หรือค่าว่าง ให้แสดงทั้งหมด
        const matchesYear = (selectedYear === 'all' || selectedYear === '') || String(doc.fiscal_year) === selectedYear;

        return matchesSearch && matchesYear;
    });

    renderDocumentTable(filteredDocs);
}


// ผูก Event Listener เมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    loadDocuments();

    const searchInput = document.getElementById('searchInput');
    const yearSelect = document.getElementById('fiscalYearSelect');

    // เมื่อพิมพ์ในช่องค้นหา ให้กรองทันทีแบบ Real-time
    if (searchInput) {
        searchInput.addEventListener('input', filterDocuments);
    }

    // เมื่อเลือกปีงบประมาณ ให้กรองทันที
    if (yearSelect) {
        yearSelect.addEventListener('change', filterDocuments);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (typeof loadLessons === 'function') loadLessons();
    if (typeof loadDocuments === 'function') loadDocuments();

    // ดึง ID ให้ตรงกับ HTML
    const searchInput = document.getElementById('docSearchInput');
    const yearSelect = document.getElementById('docYearFilter');

    if (searchInput) {
        searchInput.addEventListener('input', filterDocuments);
    }
    if (yearSelect) {
        yearSelect.addEventListener('change', filterDocuments);
    }
});
