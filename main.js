// main.js
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

//inisialisasi firebase
const aplikasi = initializeApp(firebaseConfig)
const basisdata = getFirestore(aplikasi)


// Referensi ke koleksi bahan di Firestore
const itemsCollection = db.collection("items");

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

// Variabel global
let items = [];
let currentEditId = null;

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'success') {
    notification.textContent = message;
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

// Fungsi untuk menambahkan bahan baru
async function addItem(item) {
    try {
        // Tambahkan timestamp
        item.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        item.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Hitung status stok
        item.status = getStockStatus(item.quantity, item.minStock);
        
        // Simpan ke Firestore
        await itemsCollection.add(item);
        
        showNotification('Bahan berhasil ditambahkan!', 'success');
        resetForm();
    } catch (error) {
        console.error('Error adding item: ', error);
        showNotification('Gagal menambahkan bahan: ' + error.message, 'error');
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
    }, error => {
        console.error('Error getting items: ', error);
        showNotification('Gagal memuat data bahan', 'error');
    });
}

// Fungsi untuk memperbarui bahan
async function updateItem(id, updatedData) {
    try {
        // Tambahkan timestamp update
        updatedData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Hitung status stok
        updatedData.status = getStockStatus(updatedData.quantity, updatedData.minStock);
        
        await itemsCollection.doc(id).update(updatedData);
        
        showNotification('Bahan berhasil diperbarui!', 'success');
        closeEditModal();
    } catch (error) {
        console.error('Error updating item: ', error);
        showNotification('Gagal memperbarui bahan: ' + error.message, 'error');
    }
}

// Fungsi untuk menghapus bahan
async function deleteItem(id) {
    if (confirm('Apakah Anda yakin ingin menghapus bahan ini?')) {
        try {
            await itemsCollection.doc(id).delete();
            showNotification('Bahan berhasil dihapus!', 'success');
        } catch (error) {
            console.error('Error deleting item: ', error);
            showNotification('Gagal menghapus bahan: ' + error.message, 'error');
        }
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
        
        row.innerHTML = `
            <td>
                <strong>${item.name}</strong>
                ${item.notes ? `<br><small style="color: var(--gray);">${item.notes}</small>` : ''}
            </td>
            <td>${item.category}</td>
            <td>${item.quantity} ${item.unit}</td>
            <td>${item.minStock} ${item.unit}</td>
            <td>${formatStockStatus(item.status)}</td>
            <td>${item.location}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-outline edit-btn" data-id="${item.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger delete-btn" data-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        itemsList.appendChild(row);
    });
    
    // Tambahkan event listener untuk tombol edit dan delete
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteItem(btn.dataset.id));
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
        item.location.toLowerCase().includes(query.toLowerCase())
    );
    
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
    });
    
    // Inisialisasi dengan data contoh (hanya untuk demo jika tidak ada data)
    setTimeout(() => {
        if (items.length === 0) {
            // Tampilkan notifikasi bahwa aplikasi siap digunakan
            showNotification('Aplikasi siap digunakan! Tambahkan bahan pertama Anda.', 'success');
        }
    }, 1000);
});

// Menambahkan beberapa data contoh untuk demo
// Hapus kode ini di produksi atau jika sudah ada data
window.addSampleData = async function() {
    const sampleItems = [
    {
        name: "Beras",
        category: "Bahan Pokok",
        quantity: 10,
        unit: "kg",
        minStock: 2,
        location: "Lemari 1",
        notes: "Beras premium"
    },
    {
        name: "Minyak Goreng",
        category: "Bahan Pokok",
        quantity: 3,
        unit: "liter",
        minStock: 1,
        location: "Rak dapur",
        notes: "Minyak sayur"
    },
    {
        name: "Gula Pasir",
        category: "Bahan Pokok",
        quantity: 0.5,
        unit: "kg",
        minStock: 1,
        location: "Lemari 2",
        notes: "Stok menipis"
    },
    {
        name: "Telur",
        category: "Protein",
        quantity: 12,
        unit: "buah",
        minStock: 6,
        location: "Kulkas",
        notes: ""
    },
    {
        name: "Wortel",
        category: "Sayuran",
        quantity: 0,
        unit: "kg",
        minStock: 0.5,
        location: "Kulkas",
        notes: "Sudah habis"
    }];
    
    for (const item of sampleItems) {
        await addItem(item);
    }
    
    showNotification('Data contoh berhasil ditambahkan!', 'success');
};