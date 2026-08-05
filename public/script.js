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

        const container = document.getElementById('lessons-container') || document.getElementById('lessonContainer');
        if (!container) return;

        container.innerHTML = ''; 

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
             const embedUrl = getEmbedYoutubeUrl(lesson.video_url);
            
            const videoHTML = embedUrl 
                ? `<div style="margin-top: 10px;">
                     <iframe width="100%" height="250" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px;"></iframe>
                   </div>` 
                : '';
            // 🖼️ ตรวจสอบว่ามีรูปภาพหรือไม่
            const imageHTML = lesson.image_url 
                ? `<img src="${lesson.image_url}" alt="${title}" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; margin: 12px 0;">` 
                : '';

            // 🎬 ตรวจสอบว่ามีวิดีโอหรือไม่
            const videoHTML = lesson.video_url 
                ? `<div style="margin-top: 10px;"><iframe width="100%" height="220" src="${lesson.video_url}" frameborder="0" allowfullscreen style="border-radius: 8px;"></iframe></div>` 
                : '';

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

                <!-- 🖼️ รูปภาพประกอบบทเรียน (แสดงหน้าการ์ด) -->
                ${imageHTML}

                <!-- ปุ่มอ่านเพิ่มเติม -->
                <button onclick="toggleContent(${id})" id="btn-${id}" style="background: #2563eb; color: white; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer;">
                    📖 อ่านเนื้อหาเพิ่มเติม
                </button>

                <!-- 4. ส่วนรายละเอียดเนื้อหา (ซ่อนไว้ก่อน) -->
                <div id="content-${id}" style="display: none; margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                    <strong style="display: block; margin-bottom: 8px; color: #0f172a;">รายละเอียดเนื้อหา:</strong>
                    <div style="white-space: pre-line; line-height: 1.6;">${content}</div>
                    
                    <!-- 🎬 วิดีโอ (จะโชว์เมื่อกดเปิดเนื้อหา) -->
                    ${videoHTML}
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
  const lessonCards = document.querySelectorAll('#lessons-container > div, #lessonContainer > div');

  lessonCards.forEach(card => {
    const cardText = card.textContent.toLowerCase();
    if (cardText.includes(searchInput)) {
      card.style.display = ""; 
    } else {
      card.style.display = "none"; 
    }
  });
}

// ==========================================
// 3. ฟังก์ชันจัดการคลังเอกสาร (Documents)
// ==========================================
let allDocuments = [];

async function loadDocuments() {
    try {
        const response = await fetch('/api/documents');
        const result = await response.json();
        allDocuments = result.data || result; 

        renderDocumentTable(allDocuments);
        populateFiscalYearDropdown(allDocuments);
    } catch (err) {
        console.error('Error loading documents:', err);
    }
}

function renderDocumentTable(docs) {
    const tableBody = document.getElementById('documentTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = ''; 

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
    const yearSelect = document.getElementById('docYearFilter');
    if (!yearSelect) return;

    const years = [...new Set(docs.map(d => d.fiscal_year).filter(Boolean))].sort((a, b) => b - a);
    
    yearSelect.innerHTML = '<option value="all">-- ทุกปีงบประมาณ --</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

function filterDocuments() {
    const searchInput = document.getElementById('docSearchInput');
    const yearSelect = document.getElementById('docYearFilter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedYear = yearSelect ? yearSelect.value : '';

    const filteredDocs = allDocuments.filter(doc => {
        const titleMatch = (doc.title || '').toLowerCase().includes(searchTerm);
        const categoryMatch = (doc.category || '').toLowerCase().includes(searchTerm);
        const matchesSearch = titleMatch || categoryMatch;

        const matchesYear = (selectedYear === 'all' || selectedYear === '') || String(doc.fiscal_year) === selectedYear;

        return matchesSearch && matchesYear;
    });

    renderDocumentTable(filteredDocs);
}
// 📌 ฟังก์ชันแปลง URL จาก YouTube ปกติให้กลายเป็น Embed URL
function getEmbedYoutubeUrl(url) {
    if (!url) return '';
    
    // ถ้าใส่ลิงก์ embed มาอยู่แล้วให้ใช้ได้เลย
    if (url.includes('youtube.com/embed/')) return url;

    // ถ้าใส่ลิงก์ปกติ watch?v=
    let videoId = '';
    if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        // ถ้าเป็นลิงก์สั้น youtu.be/
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

// ผูก Event Listener เมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    const docSearchInput = document.getElementById('docSearchInput');
    const docYearFilter = document.getElementById('docYearFilter');

    if (docSearchInput) {
        docSearchInput.addEventListener('input', filterDocuments);
    }
    if (docYearFilter) {
        docYearFilter.addEventListener('change', filterDocuments);
    }
});
