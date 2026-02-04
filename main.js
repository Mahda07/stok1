// main.js - Aplikasi Stok Bahan Makanan Bukit Saila Camp Ground

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCfqZD7UZZt-GWmtNhfJyksrv3-8ENRjto",
    authDomain: "insan-cemerlang-d5574.firebaseapp.com",
    projectId: "insan-cemerlang-d5574",
    storageBucket: "insan-cemerlang-d5574.appspot.com",
    messagingSenderId: "1035937160050",
    appId: "1:1035937160050:web:6d77d3874c3f78b2811beb",
    measurementId: "G-EVVQ80Q08C"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Referensi ke koleksi bahan di Firestore
const itemsCollection = db.collection("stok-makanan-minuman-bahan");

// Elemen DOM
const itemForm = document.getElementById('itemForm');
const itemsList = document.getElementById('itemsList');
const emptyRow = document.getElementById('emptyRow');
const searchInput = document.getElementById('searchInput');
const editModal = document.getElementById('editModal');
const closeModal = document.getElementById('closeModal');
const cancelEdit = document.getElementById('cancelEdit');
const editForm = document.getElementById('editForm');
const resetBtn = document.getElementById('resetBtn');
const notification = document.getElementById('notification');
const totalItemsEl = document.getElementById('totalItems');
const adequateStat = document.getElementById('adequateStat');
const lowStat = document.getElementById('lowStat');
const outStat = document.getElementById('outStat');
const addSampleBtn = document.getElementById('addSampleBtn');
const addFirstItemBtn = document.getElementById('addFirstItem');

// Variabel global
let items = [];
let currentEditId = null;
let isFirstLoad = true;

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'success') {
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    notification.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Fungsi untuk menghitung status stok
function getStockStatus(quantity, minStock) {
    if (quantity <= 0) return 'out';
    if (quantity <= minStock) return 'low';
    return 'adequate';
}

// Fungsi untuk memformat status stok
function formatStockStatus(status) {
    const statusMap = {
        'out': { text: 'Habis', class: 'status-out' },
        'low': { text: 'Menipis', class: 'status-low' },
        'adequate': { text: 'Cukup', class: 'status-adequate' }
    };
    
    const statusInfo = statusMap[status] || { text: 'Tidak diketahui', class: '' };
    return `<span class="status ${statusInfo.class}">${statusInfo.text}</span>`;
}

// Fungsi untuk memformat tanggal
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate();
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Fungsi untuk validasi input
function validateItemData(item) {
    const errors = [];
    
    if (!item.name || item.name.trim().length < 2) {
        errors.push('Nama bahan harus minimal 2 karakter');
    }
    
    if (!item.category) {
        errors.push('Kategori harus dipilih');
    }
    
    if (item.quantity < 0) {
        errors.push('Jumlah tidak boleh negatif');
    }
    
    if (item.minStock < 0) {
        errors.push('Stok minimum tidak boleh negatif');
    }
    
    if (!item.unit) {
        errors.push('Satuan harus dipilih');
    }
    
    if (!item.location || item.location.trim().length < 2) {
        errors.push('Lokasi penyimpanan harus diisi');
    }
    
    return errors;
}

// Fungsi untuk menambahkan bahan baru
async function addItem(item) {
    try {
        // Validasi data
        const validationErrors = validateItemData(item);
        if (validationErrors.length > 0) {
            showNotification(validationErrors.join(', '), 'error');
            return;
        }
        
        // Format data
        const itemData = {
            name: item.name.trim(),
            category: item.category,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            minStock: parseFloat(item.minStock),
            location: item.location.trim(),
            notes: item.notes ? item.notes.trim() : null,
            status: getStockStatus(item.quantity, item.minStock),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Simpan ke Firestore
        await itemsCollection.add(itemData);
        
        showNotification('✓ Bahan camping berhasil ditambahkan!', 'success');
        resetForm();
    } catch (error) {
        console.error('Error adding item: ', error);
        showNotification('✗ Gagal menambahkan bahan: ' + error.message, 'error');
    }
}

// Fungsi untuk mengambil semua bahan
function getItems() {
    itemsCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        items = [];
        snapshot.forEach(doc => {
            const item = doc.data();
            item.id = doc.id;
            items.push(item);
        });
        
        renderItems(items);
        updateStats(items);
        
        // Tampilkan notifikasi selamat datang hanya saat pertama kali load
        if (isFirstLoad && items.length === 0) {
            setTimeout(() => {
                showNotification('Selamat datang di BOEKIT SAILA CAMP GROUND! Mulai kelola stok bahan camping Anda.', 'success');
            }, 500);
            isFirstLoad = false;
        }
    }, error => {
        console.error('Error getting items: ', error);
        showNotification('✗ Gagal memuat data bahan camping', 'error');
    });
}

// Fungsi untuk memperbarui bahan
async function updateItem(id, updatedData) {
    try {
        // Validasi data
        const validationErrors = validateItemData(updatedData);
        if (validationErrors.length > 0) {
            showNotification(validationErrors.join(', '), 'error');
            return;
        }
        
        // Format data
        const itemData = {
            name: updatedData.name.trim(),
            category: updatedData.category,
            quantity: parseFloat(updatedData.quantity),
            unit: updatedData.unit,
            minStock: parseFloat(updatedData.minStock),
            location: updatedData.location.trim(),
            notes: updatedData.notes ? updatedData.notes.trim() : null,
            status: getStockStatus(updatedData.quantity, updatedData.minStock),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await itemsCollection.doc(id).update(itemData);
        
        showNotification('✓ Bahan camping berhasil diperbarui!', 'success');
        closeEditModal();
    } catch (error) {
        console.error('Error updating item: ', error);
        showNotification('✗ Gagal memperbarui bahan: ' + error.message, 'error');
    }
}

// Fungsi untuk menghapus bahan
async function deleteItem(id, name) {
    if (confirm(`Apakah Anda yakin ingin menghapus "${name}" dari daftar bahan camping Bukit Saila?`)) {
        try {
            await itemsCollection.doc(id).delete();
            showNotification(`✓ "${name}" berhasil dihapus dari stok!`, 'success');
        } catch (error) {
            console.error('Error deleting item: ', error);
            showNotification('✗ Gagal menghapus bahan: ' + error.message, 'error');
        }
    }
}

// Fungsi untuk menambah jumlah stok
async function incrementStock(id, currentQuantity, amount = 1) {
    try {
        const newQuantity = currentQuantity + amount;
        await itemsCollection.doc(id).update({
            quantity: newQuantity,
            status: getStockStatus(newQuantity, items.find(item => item.id === id)?.minStock || 0),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`✓ Stok berhasil ditambahkan ${amount} unit`, 'success');
    } catch (error) {
        console.error('Error incrementing stock: ', error);
        showNotification('✗ Gagal menambah stok: ' + error.message, 'error');
    }
}

// Fungsi untuk mengurangi jumlah stok
async function decrementStock(id, currentQuantity, amount = 1) {
    try {
        const newQuantity = Math.max(0, currentQuantity - amount);
        await itemsCollection.doc(id).update({
            quantity: newQuantity,
            status: getStockStatus(newQuantity, items.find(item => item.id === id)?.minStock || 0),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`✓ Stok berhasil dikurangi ${amount} unit`, 'success');
    } catch (error) {
        console.error('Error decrementing stock: ', error);
        showNotification('✗ Gagal mengurangi stok: ' + error.message, 'error');
    }
}

// Fungsi untuk merender daftar bahan
function renderItems(itemsToRender) {
    if (itemsToRender.length === 0) {
        emptyRow.style.display = 'table-row';
        itemsList.innerHTML = '';
        itemsList.appendChild(emptyRow);
        return;
    }
    
    emptyRow.style.display = 'none';
    itemsList.innerHTML = '';
    
    itemsToRender.forEach(item => {
        const row = document.createElement('tr');
        
        // Tentukan ikon berdasarkan kategori
        let categoryIcon = 'fa-box';
        if (item.category === 'Makanan Instan') categoryIcon = 'fa-utensils';
        if (item.category === 'Minuman') categoryIcon = 'fa-wine-bottle';
        if (item.category === 'Snack') categoryIcon = 'fa-cookie-bite';
        if (item.category === 'Protein') categoryIcon = 'fa-drumstick-bite';
        if (item.category === 'Bumbu') categoryIcon = 'fa-mortar-pestle';
        if (item.category === 'Perlengkapan') categoryIcon = 'fa-tools';
        
        row.innerHTML = `
            <td>
                <strong>${item.name}</strong>
                ${item.notes ? `<br><small style="color: var(--gray);"><i class="fas fa-sticky-note"></i> ${item.notes}</small>` : ''}
                ${item.createdAt ? `<br><small style="color: #888; font-size: 0.8rem;"><i class="far fa-calendar"></i> ${formatDate(item.createdAt)}</small>` : ''}
            </td>
            <td><i class="fas ${categoryIcon} nature-icon"></i> ${item.category}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <strong style="font-size: 1.1rem; min-width: 40px; text-align: center;">${item.quantity}</strong>
                    <span>${item.unit}</span>
                    <div class="btn-group" style="margin-left: 10px;">
                        <button class="btn btn-outline btn-small increment-btn" data-id="${item.id}" data-quantity="${item.quantity}" title="Tambah 1">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-outline btn-small decrement-btn" data-id="${item.id}" data-quantity="${item.quantity}" title="Kurangi 1">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </div>
            </td>
            <td>${item.minStock} ${item.unit}</td>
            <td>${formatStockStatus(item.status)}</td>
            <td><i class="fas fa-map-marker-alt nature-icon"></i> ${item.location}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-outline btn-small edit-btn" data-id="${item.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-small delete-btn" data-id="${item.id}" data-name="${item.name}" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        itemsList.appendChild(row);
    });
    
    // Tambahkan event listener untuk semua tombol
    addEventListenersToButtons();
}

// Fungsi untuk menambahkan event listener ke tombol
function addEventListenersToButtons() {
    // Tombol edit
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    
    // Tombol delete
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteItem(btn.dataset.id, btn.dataset.name));
    });
    
    // Tombol tambah stok
    document.querySelectorAll('.increment-btn').forEach(btn => {
        btn.addEventListener('click', () => incrementStock(btn.dataset.id, parseFloat(btn.dataset.quantity), 1));
    });
    
    // Tombol kurangi stok
    document.querySelectorAll('.decrement-btn').forEach(btn => {
        btn.addEventListener('click', () => decrementStock(btn.dataset.id, parseFloat(btn.dataset.quantity), 1));
    });
}

// Fungsi untuk membuka modal edit
function openEditModal(id) {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    currentEditId = id;
    
    // Isi form dengan data bahan
    document.getElementById('editId').value = id;
    document.getElementById('editName').value = item.name;
    document.getElementById('editCategory').value = item.category;
    document.getElementById('editQuantity').value = item.quantity;
    document.getElementById('editUnit').value = item.unit;
    document.getElementById('editMinStock').value = item.minStock;
    document.getElementById('editLocation').value = item.location;
    document.getElementById('editNotes').value = item.notes || '';
    
    editModal.style.display = 'flex';
}

// Fungsi untuk menutup modal edit
function closeEditModal() {
    editModal.style.display = 'none';
    currentEditId = null;
    editForm.reset();
}

// Fungsi untuk reset form tambah
function resetForm() {
    itemForm.reset();
}

// Fungsi untuk mencari bahan
function searchItems(query) {
    if (!query.trim()) {
        renderItems(items);
        return;
    }
    
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.location.toLowerCase().includes(query.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(query.toLowerCase()))
    );
    
    renderItems(filteredItems);
}

// Fungsi untuk filter berdasarkan kategori
function filterByCategory(category) {
    if (!category || category === 'all') {
        renderItems(items);
        return;
    }
    
    const filteredItems = items.filter(item => item.category === category);
    renderItems(filteredItems);
}

// Fungsi untuk filter berdasarkan status
function filterByStatus(status) {
    if (!status || status === 'all') {
        renderItems(items);
        return;
    }
    
    const filteredItems = items.filter(item => item.status === status);
    renderItems(filteredItems);
}

// Fungsi untuk memperbarui statistik
function updateStats(items) {
    totalItemsEl.textContent = items.length;
    
    const adequateCount = items.filter(item => item.status === 'adequate').length;
    const lowCount = items.filter(item => item.status === 'low').length;
    const outCount = items.filter(item => item.status === 'out').length;
    
    adequateStat.textContent = adequateCount;
    lowStat.textContent = lowCount;
    outStat.textContent = outCount;
}

// Fungsi untuk mengekspor data ke CSV
function exportToCSV() {
    if (items.length === 0) {
        showNotification('Tidak ada data untuk diekspor', 'error');
        return;
    }
    
    const headers = ['Nama Bahan', 'Kategori', 'Jumlah', 'Satuan', 'Stok Minimum', 'Status', 'Lokasi', 'Catatan', 'Tanggal Ditambahkan'];
    const csvData = items.map(item => [
        `"${item.name}"`,
        `"${item.category}"`,
        item.quantity,
        `"${item.unit}"`,
        item.minStock,
        `"${item.status === 'adequate' ? 'Cukup' : item.status === 'low' ? 'Menipis' : 'Habis'}"`,
        `"${item.location}"`,
        `"${item.notes || ''}"`,
        `"${formatDate(item.createdAt)}"`
    ]);
    
    const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `stok_bukit_saila_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('✓ Data berhasil diekspor ke CSV', 'success');
}

// Fungsi untuk menambahkan data contoh khusus Bukit Saila
async function addSampleData() {
    const sampleItems = [
    {
        name: "Beras Premium",
        category: "Bahan Pokok",
        quantity: 5,
        unit: "kg",
        minStock: 1,
        location: "Tenda Utama",
        notes: "Untuk 3 hari camping di Bukit Saila"
    },
    {
        name: "Mi Instan Goreng",
        category: "Makanan Instan",
        quantity: 15,
        unit: "bungkus",
        minStock: 5,
        location: "Kotak Makan 1",
        notes: "Berbagai rasa, makanan cepat saji"
    },
    {
        name: "Sarden Kaleng",
        category: "Protein",
        quantity: 8,
        unit: "kaleng",
        minStock: 2,
        location: "Coolbox",
        notes: "Makanan praktis untuk camping"
    },
    {
        name: "Air Mineral Galon",
        category: "Minuman",
        quantity: 2,
        unit: "buah",
        minStock: 1,
        location: "Tenda Samping",
        notes: "Galon 19L untuk kelompok"
    },
    {
        name: "Kopi Bubuk Toraja",
        category: "Minuman",
        quantity: 0.3,
        unit: "kg",
        minStock: 0.1,
        location: "Kotak Bumbu",
        notes: "Kopi spesial untuk pagi di Bukit Saila"
    },
    {
        name: "Biskuit Energi",
        category: "Snack",
        quantity: 0,
        unit: "pack",
        minStock: 3,
        location: "Kotak Snack",
        notes: "Sudah habis, perlu beli sebelum camping"
    },
    {
        name: "Minyak Goreng",
        category: "Bumbu",
        quantity: 2,
        unit: "liter",
        minStock: 0.5,
        location: "Kotak Masak",
        notes: "Untuk memasak di area camping"
    },
    {
        name: "Telur Ayam",
        category: "Protein",
        quantity: 20,
        unit: "buah",
        minStock: 6,
        location: "Coolbox",
        notes: "Untuk sarapan pagi camping"
    },
    {
        name: "Gas LPG Portable",
        category: "Perlengkapan",
        quantity: 2,
        unit: "buah",
        minStock: 1,
        location: "Tenda Perlengkapan",
        notes: "Tabung gas 3kg untuk kompor camping"
    },
    {
        name: "Plastik Sampah",
        category: "Perlengkapan",
        quantity: 1,
        unit: "pack",
        minStock: 0.5,
        location: "Kotak Perlengkapan",
        notes: "Untuk menjaga kebersihan area camping"
    }];
    
    let addedCount = 0;
    
    for (const item of sampleItems) {
        try {
            const itemData = {
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                minStock: item.minStock,
                location: item.location,
                notes: item.notes,
                status: getStockStatus(item.quantity, item.minStock),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await itemsCollection.add(itemData);
            addedCount++;
        } catch (error) {
            console.error('Error adding sample item: ', error);
        }
    }
    
    if (addedCount > 0) {
        showNotification(`✓ ${addedCount} data contoh berhasil ditambahkan!`, 'success');
    } else {
        showNotification('✗ Gagal menambahkan data contoh', 'error');
    }
}

// Fungsi untuk mendapatkan ringkasan stok
function getStockSummary() {
    const summary = {
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        lowStockItems: items.filter(item => item.status === 'low').length,
        outOfStockItems: items.filter(item => item.status === 'out').length,
        categories: {}
    };
    
    // Hitung per kategori
    items.forEach(item => {
        if (!summary.categories[item.category]) {
            summary.categories[item.category] = {
                count: 0,
                totalQuantity: 0
            };
        }
        summary.categories[item.category].count++;
        summary.categories[item.category].totalQuantity += item.quantity;
    });
    
    return summary;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Muat data dari Firebase
    getItems();
    
    // Submit form tambah bahan
    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const item = {
            name: document.getElementById('name').value,
            category: document.getElementById('category').value,
            quantity: parseFloat(document.getElementById('quantity').value),
            unit: document.getElementById('unit').value,
            minStock: parseFloat(document.getElementById('minStock').value),
            location: document.getElementById('location').value,
            notes: document.getElementById('notes').value || null
        };
        
        addItem(item);
    });
    
    // Submit form edit bahan
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const updatedItem = {
            name: document.getElementById('editName').value,
            category: document.getElementById('editCategory').value,
            quantity: parseFloat(document.getElementById('editQuantity').value),
            unit: document.getElementById('editUnit').value,
            minStock: parseFloat(document.getElementById('editMinStock').value),
            location: document.getElementById('editLocation').value,
            notes: document.getElementById('editNotes').value || null
        };
        
        updateItem(currentEditId, updatedItem);
    });
    
    // Tombol reset form
    resetBtn.addEventListener('click', resetForm);
    
    // Tombol tambah data contoh
    addSampleBtn.addEventListener('click', addSampleData);
    
    // Tombol tambah bahan pertama
    if (addFirstItemBtn) {
        addFirstItemBtn.addEventListener('click', () => {
            document.getElementById('name').focus();
            showNotification('Isi form di atas untuk menambahkan bahan pertama Anda', 'success');
        });
    }
    
    // Pencarian
    searchInput.addEventListener('input', (e) => {
        searchItems(e.target.value);
    });
    
    // Modal edit
    closeModal.addEventListener('click', closeEditModal);
    cancelEdit.addEventListener('click', closeEditModal);
    
    // Tutup modal saat klik di luar modal
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });
    
    // Tutup modal dengan tombol ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editModal.style.display === 'flex') {
            closeEditModal();
        }
        
        // Shortcut Ctrl+F untuk focus search
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Shortcut Ctrl+N untuk tambah baru
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            document.getElementById('name').focus();
        }
    });
    
    // Tambah tombol ekspor ke UI
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary';
    exportBtn.innerHTML = '<i class="fas fa-file-export"></i> Ekspor CSV';
    exportBtn.addEventListener('click', exportToCSV);
    
    // Tempatkan tombol ekspor di sebelah tombol data contoh
    const buttonGroup = document.querySelector('.btn-group');
    if (buttonGroup) {
        buttonGroup.appendChild(exportBtn);
    }
});

// Fungsi untuk menginisialisasi aplikasi (bisa dipanggil dari console)
function initApp() {
    console.log('Aplikasi Stok Bahan Bukit Saila telah diinisialisasi');
    console.log('Fungsi yang tersedia:');
    console.log('- addSampleData() - Menambahkan data contoh');
    console.log('- exportToCSV() - Mengekspor data ke CSV');
    console.log('- getStockSummary() - Mendapatkan ringkasan stok');
    console.log('- filterByCategory(category) - Filter berdasarkan kategori');
    console.log('- filterByStatus(status) - Filter berdasarkan status');
    
    return {
        addSampleData,
        exportToCSV,
        getStockSummary,
        filterByCategory,
        filterByStatus,
        items: () => items
    };
}

// Ekspor fungsi untuk akses global
window.BukitSailaStock = initApp();

// Debug mode
if (window.location.hash === '#debug') {
    console.log('Debug mode aktif');
    console.log('Akses aplikasi melalui window.BukitSailaStock');
}