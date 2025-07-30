import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

// Supabase configuration
const supabaseUrl = 'https://tuyttwketzbewvqqqdum.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eXR0d2tldHpiZXd2cXFxZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODM4MDAsImV4cCI6MjA2ODc1OTgwMH0.3S9meIoh6ULCH2L4-R_wzud2rw70U8lJzs4gj9028fY';
const supabase = createClient(supabaseUrl, supabaseKey);

// DOM elements
const emailInput = document.getElementById('emailInput');
const noteInput = document.getElementById('noteInput');
const addButton = document.getElementById('addButton');
const refreshButton = document.getElementById('refreshButton');
const tableContainer = document.getElementById('tableContainer');
const alertContainer = document.getElementById('alertContainer');
const appToggles = document.querySelectorAll('.app-toggle');
const noteModal = document.getElementById('noteModal');
const modalNoteInput = document.getElementById('modalNoteInput');
const cancelNoteEdit = document.getElementById('cancelNoteEdit');
const saveNoteEdit = document.getElementById('saveNoteEdit');
const searchToggleBtn = document.getElementById('searchToggleBtn');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');

// App status management
const statusCycle = ['unknown', 'used', 'unused'];
const statusIcons = {
    unknown: '⚪',
    used: '✅',
    unused: '❌'
};

let currentAppStates = {
    shopee: 'unknown',
    gemini: 'unknown',
    chatgpt: 'unknown',
    tiktok: 'unknown'
};

let currentEditingId = null;
let allEmailData = []; // เก็บข้อมูลทั้งหมด

function showAlert(message, type = 'error') {
    const alertEl = document.createElement('div');
    alertEl.className = `alert ${type}`;
    alertEl.textContent = message;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertEl);

    setTimeout(() => {
        alertEl.remove();
    }, 5000);
}

function updateAppToggle(element, status) {
    element.className = `app-toggle ${status}`;
    element.dataset.status = status;
    element.querySelector('.app-icon').textContent = statusIcons[status];
}

function cycleAppStatus(app) {
    const currentStatus = currentAppStates[app];
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    currentAppStates[app] = nextStatus;

    const toggle = document.querySelector(`.form-section [data-app="${app}"]`);
    if (toggle) updateAppToggle(toggle, nextStatus);
}

function resetForm() {
    emailInput.value = '';
    noteInput.value = '';
    Object.keys(currentAppStates).forEach(app => {
        currentAppStates[app] = 'unknown';
        const toggle = document.querySelector(`.form-section [data-app="${app}"]`);
        if (toggle) updateAppToggle(toggle, 'unknown');
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusIcon(status) {
    return statusIcons[status] || '⚪';
}

async function updateAppStatus(emailId, app, currentStatus) {
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    try {
        const { error } = await supabase
            .from('email_usage')
            .update({ [app]: nextStatus })
            .eq('id', emailId);

        if (error) throw error;

        await loadData();
    } catch (error) {
        showAlert(`ไม่สามารถอัปเดตสถานะ ${app}: ${error.message}`);
    }
}

async function deleteEmail(emailId) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลอีเมลนี้?')) {
        try {
            const { error } = await supabase
                .from('email_usage')
                .delete()
                .eq('id', emailId);

            if (error) throw error;

            showAlert('ลบข้อมูลอีเมลเรียบร้อยแล้ว!', 'success');
            await loadData();
        } catch (error) {
            showAlert(`ไม่สามารถลบข้อมูล: ${error.message}`);
        }
    }
}

function openNoteModal(emailId, currentNote) {
    currentEditingId = emailId;
    modalNoteInput.value = currentNote || '';
    noteModal.style.display = 'flex';
    modalNoteInput.focus();
}

function closeNoteModal() {
    noteModal.style.display = 'none';
    currentEditingId = null;
    modalNoteInput.value = '';
}

async function saveNote() {
    if (!currentEditingId) return;

    const newNote = modalNoteInput.value.trim();

    try {
        const { error } = await supabase
            .from('email_usage')
            .update({ note: newNote || null })
            .eq('id', currentEditingId);

        if (error) throw error;

        showAlert('บันทึกหมายเหตุเรียบร้อยแล้ว!', 'success');
        closeNoteModal();
        await loadData();
    } catch (error) {
        showAlert(`ไม่สามารถบันทึกหมายเหตุ: ${error.message}`);
    }
}

function createEmailCard(row) {
    const card = document.createElement('div');
    card.className = 'email-card';

    card.innerHTML = `
        <div class="card-header">
            <h3 class="email-title">${row.email.replace('@gmail.com', '')}</h3>
            <div class="card-actions">
                <button class="card-action-btn edit-btn" title="แก้ไขหมายเหตุ">📝</button>
                <button class="card-action-btn delete-btn" title="ลบอีเมล">🗑️</button>
            </div>
        </div>
        <div class="card-date">วันที่สมัคร: ${formatDate(row.created_at)}</div>
        <div class="card-apps">
            <div class="card-apps-title">แอปที่ลงทะเบียน:</div>
            <div class="card-apps-grid">
                <div class="card-app-item">
                    <span class="card-app-name">Shopee</span>
                    <span class="card-app-status" data-app="shopee">${getStatusIcon(row.shopee)}</span>
                </div>
                <div class="card-app-item">
                    <span class="card-app-name">Gemini</span>
                    <span class="card-app-status" data-app="gemini">${getStatusIcon(row.gemini)}</span>
                </div>
                <div class="card-app-item">
                    <span class="card-app-name">ChatGPT</span>
                    <span class="card-app-status" data-app="chatgpt">${getStatusIcon(row.chatgpt)}</span>
                </div>
                <div class="card-app-item">
                    <span class="card-app-name">TikTok</span>
                    <span class="card-app-status" data-app="tiktok">${getStatusIcon(row.tiktok)}</span>
                </div>
            </div>
        </div>
        <div class="card-note">
            <div class="card-note-title">หมายเหตุ:</div>
            <div class="card-note-content ${row.note ? '' : 'empty'}">${row.note || 'ไม่มีหมายเหตุ'}</div>
        </div>
    `;

    const noteContent = card.querySelector('.card-note-content');
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');

    const noteText = row.note || '';
    editBtn.addEventListener('click', () => openNoteModal(row.id, noteText));
    noteContent.addEventListener('click', () => openNoteModal(row.id, noteText));
    deleteBtn.addEventListener('click', () => deleteEmail(row.id));

    card.querySelectorAll('.card-app-status').forEach(statusEl => {
        const appName = statusEl.dataset.app;
        if (appName) {
            statusEl.addEventListener('click', () => updateAppStatus(row.id, appName, row[appName]));
        }
    });

    return card;
}

async function loadData() {
    const scrollPosition = window.scrollY;

    try {
        tableContainer.innerHTML = `<div class="loading"><div class="spinner"></div>กำลังโหลดข้อมูล...</div>`;

        const { data, error } = await supabase
            .from('email_usage')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allEmailData = data; // เก็บข้อมูลไว้ใช้ค้นหา

        renderEmailCards(data);
    } catch (error) {
        console.error('Error loading data:', error);
        showAlert(`ไม่สามารถโหลดข้อมูล: ${error.message}`);
        tableContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>ไม่สามารถโหลดข้อมูลได้</h3>
                <p>${error.message}</p>
            </div>`;
    } finally {
        window.scrollTo(0, scrollPosition);
    }
}

function renderEmailCards(data) {
    tableContainer.innerHTML = '';
    if (!data || data.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>ยังไม่มีอีเมลที่ติดตาม</h3>
                <p>เพิ่มอีเมลแรกของคุณเพื่อเริ่มต้น!</p>
            </div>`;
        return;
    }
    const cardContainer = document.createElement('div');
    cardContainer.className = 'table-container';
    tableContainer.appendChild(cardContainer);

    data.forEach(row => {
        const card = createEmailCard(row);
        cardContainer.appendChild(card);
    });
}

async function addEmail() {
    const username = emailInput.value.trim();
    const note = noteInput.value.trim();

    if (!username) {
        showAlert('กรุณากรอกชื่อผู้ใช้อีเมล');
        return;
    }

    if (username.includes('@')) {
        showAlert('กรุณากรอกเฉพาะชื่อผู้ใช้ (ก่อน @gmail.com)');
        return;
    }

    const email = `${username}@gmail.com`;

    try {
        addButton.disabled = true;
        addButton.textContent = 'กำลังเพิ่ม...';

        const { data, error } = await supabase
            .from('email_usage')
            .insert([{
                email: email,
                shopee: currentAppStates.shopee,
                gemini: currentAppStates.gemini,
                chatgpt: currentAppStates.chatgpt,
                tiktok: currentAppStates.tiktok,
                note: note || null
            }])
            .select();

        if (error) throw error;

        showAlert('เพิ่มอีเมลเรียบร้อยแล้ว!', 'success');
        resetForm();
        await loadData();
    } catch (error) {
        console.error('Error adding email:', error);
        showAlert(`ไม่สามารถเพิ่มอีเมล: ${error.message}`);
    } finally {
        addButton.disabled = false;
        addButton.textContent = 'เพิ่มอีเมล';
    }
}

// --- Event listeners ---
appToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const app = toggle.dataset.app;
        cycleAppStatus(app);
    });
});

addButton.addEventListener('click', addEmail);
refreshButton.addEventListener('click', loadData);
cancelNoteEdit.addEventListener('click', closeNoteModal);
saveNoteEdit.addEventListener('click', saveNote);

emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addEmail();
    }
});

modalNoteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveNote();
    }
});

noteModal.addEventListener('click', (e) => {
    if (e.target === noteModal) {
        closeNoteModal();
    }
});

document.querySelectorAll('.note-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const note = btn.dataset.note;
        if (noteInput.value.trim() === '') {
            noteInput.value = note;
        } else if (!noteInput.value.includes(note)) {
            noteInput.value += (noteInput.value.trim().endsWith(',') ? ' ' : ', ') + note;
        }
        noteInput.focus();
    });
});

// ค้นหาแบบรวดเร็ว
if (searchToggleBtn && searchBar && searchInput) {
    searchToggleBtn.addEventListener('click', () => {
        if (searchBar.style.display === 'none' || searchBar.style.display === '') {
            searchBar.style.display = 'flex';
            searchInput.focus();
        } else {
            searchBar.style.display = 'none';
            searchInput.value = '';
            renderEmailCards(allEmailData);
        }
    });

    searchInput.addEventListener('input', () => {
        const keyword = searchInput.value.trim().toLowerCase();
        if (!keyword) {
            renderEmailCards(allEmailData);
            return;
        }
        const filtered = allEmailData.filter(row =>
            row.email.toLowerCase().includes(keyword) ||
            (row.note && row.note.toLowerCase().includes(keyword))
        );
        renderEmailCards(filtered);
    });
}

// Initialize
loadData();