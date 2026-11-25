// Admin App Logic

let currentSession = null;
let allStores = [];
let allDepartments = {}; // { key: name } e.g. { pack: 'パック', food: '食材' }
let allDepartmentNames = []; // ['パック', '食材']
let currentProducts = [];
let currentDept = '';
let selectedStoreForProducts = '';
let selectedStoreForHistory = '';
let inventoryRef = null;
let historyRef = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Basic setup for mobile menu
    if (window.innerWidth <= 768) {
        document.getElementById('mobile-header').style.display = 'flex';
        document.getElementById('mobile-menu-btn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    await Auth.ready();

    if (Auth.isLoggedIn() && Auth.isAdmin()) {
        currentSession = Auth.getSession();
        showMainApp();
    } else {
        showLogin();
    }

    setupEventListeners();
}

function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showMainApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('welcome-msg').textContent = `ようこそ、${currentSession.storeName} (${currentSession.storeId}) さん`;
    
    // Load stores data
    DB.onStoresChange((stores) => {
        allStores = stores;
        updateDashboard();
        updateStoresTable();
        updateStoreSelects();
    });

    // Load departments data
    database.ref('departments').on('value', snapshot => {
        const data = snapshot.val();
        if (!data) {
            // Initialize defaults if empty
            const defaults = { pack: 'パック', food: '食材' };
            database.ref('departments').set(defaults);
            return;
        }
        allDepartments = data;
        allDepartmentNames = Object.values(data);
        if (!currentDept && allDepartmentNames.length > 0) {
            currentDept = allDepartmentNames[0];
        }
        updateDepartmentsTable();
        updateProductDeptTabs();
        updateProductDeptSelect();
        renderProductsTable();
    });

    switchPage('dashboard');
}

// ---- Navigation ----
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetPage = document.getElementById(`${pageId}-page`);
    if(targetPage) targetPage.classList.add('active');
    
    const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if(navItem) navItem.classList.add('active');
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// ---- Events Setup ----
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            switchPage(e.currentTarget.dataset.page);
        });
    });

    // Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const storeId = document.getElementById('login-store-id').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        errorDiv.style.display = 'none';
        
        try {
            const session = await Auth.login(storeId, password);
            if(session.role !== 'admin') {
                await Auth.logout();
                errorDiv.textContent = '管理者権限がありません。';
                errorDiv.style.display = 'block';
                return;
            }
            currentSession = session;
            showMainApp();
            showToast('ログインしました', 'success');
        } catch (error) {
            errorDiv.textContent = '店舗IDまたはパスワードが正しくありません。';
            errorDiv.style.display = 'block';
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await Auth.logout();
        currentSession = null;
        if(inventoryRef) { DB.offInventoryChange(inventoryRef); inventoryRef = null; }
        // Clean up history listener if needed (db.js doesn't expose offHistoryChange easily, but we can manage)
        location.reload();
    });

    // ---- Store Management Events ----
    document.getElementById('btn-add-store').hidden = true;
    document.getElementById('btn-add-store').addEventListener('click', () => {
        openStoreModal();
    });

    document.getElementById('store-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const storeIdInput = document.getElementById('store-id');
        const isEdit = storeIdInput.hasAttribute('readonly');
        const storeId = storeIdInput.value.trim();
        const name = document.getElementById('store-name').value.trim();
        const password = document.getElementById('store-password').value;
        const role = document.getElementById('store-role').value;
        const storeType = document.getElementById('store-type').value;
        const autoApplyTemplate = document.getElementById('store-auto-template').checked;

        try {
            if (!isEdit && !password) {
                showToast('新規登録時はパスワードが必須です', 'error');
                return;
            }

            if (isEdit) {
                const updates = { name, role, storeType: role === 'admin' ? 'admin' : storeType };
                if (password) updates.password = password;
                await DB.updateStore(storeId, updates);
            } else {
                await DB.addStore(storeId, name, password, role, role === 'admin' ? 'admin' : storeType);
            }

            let typeResult = null;
            try {
                if (window.StoreTypeExtension?.saveStoreSettings) {
                    typeResult = await window.StoreTypeExtension.saveStoreSettings({
                        storeId,
                        role,
                        type: storeType,
                        autoApply: autoApplyTemplate,
                        isEdit,
                        silentTemplate: true
                    });
                }
            } catch (extensionError) {
                console.error('Store type/template save failed', extensionError);
                showToast('店舗は保存しましたが、店舗種別またはテンプレートの処理に失敗しました', 'error');
            }

            if (isEdit) {
                showToast('店舗情報を更新しました', 'success');
            } else {
                const addedCount = typeResult?.templateResult?.added || 0;
                const templateEmpty = typeResult?.templateResult?.templateEmpty || false;
                if (addedCount > 0) {
                    showToast(`店舗を追加し、テンプレート商品を${addedCount}件登録しました`, 'success');
                } else if (autoApplyTemplate && templateEmpty) {
                    showToast('店舗を追加しました（対象テンプレートは未登録です）', 'success');
                } else {
                    showToast('店舗を追加しました', 'success');
                }
            }
            closeModal('store-modal');
        } catch(error) {
            showToast(error.message || 'エラーが発生しました', 'error');
        }
    });

    // ---- Department Management Events ----
    document.getElementById('btn-add-dept').addEventListener('click', () => {
        document.getElementById('dept-form').reset();
        document.getElementById('dept-modal').classList.add('active');
    });

    document.getElementById('dept-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = document.getElementById('dept-key').value.trim().toLowerCase();
        const name = document.getElementById('dept-name').value.trim();
        if (!key || !name) return;
        try {
            await DB.addDepartment(key, name);
            showToast(`部門「${name}」を追加しました`, 'success');
            closeModal('dept-modal');
        } catch(error) {
            showToast(error.message || 'エラーが発生しました', 'error');
        }
    });

    // ---- Product Management Events ----
    document.getElementById('product-store-select').addEventListener('change', (e) => {
        selectedStoreForProducts = e.target.value;
        if (selectedStoreForProducts) {
            document.getElementById('product-management-content').style.display = 'block';
            document.getElementById('product-select-prompt').style.display = 'none';
            loadProductsForStore(selectedStoreForProducts);
        } else {
            document.getElementById('product-management-content').style.display = 'none';
            document.getElementById('product-select-prompt').style.display = 'block';
            if(inventoryRef) {
                DB.offInventoryChange(inventoryRef);
                inventoryRef = null;
            }
        }
    });

    document.getElementById('btn-add-product').addEventListener('click', () => {
        openProductModal();
    });

    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!selectedStoreForProducts) return;
        
        const department = document.getElementById('product-dept').value;
        const name = document.getElementById('product-name').value.trim();
        const warehouse = parseFloat(document.getElementById('product-warehouse').value) || 0;
        const used = parseFloat(document.getElementById('product-used').value) || 0;

        try {
            await DB.addProduct(selectedStoreForProducts, { department, name, warehouse, used });
            showToast('商品を追加しました', 'success');
            closeModal('product-modal');
        } catch(error) {
            showToast(error.message || 'エラーが発生しました', 'error');
        }
    });

    document.getElementById('btn-copy-remaining').addEventListener('click', () => {
        if(!currentProducts || currentProducts.length === 0) return;
        const filtered = currentProducts.filter(p => p.department === currentDept);
        
        let textToCopy = filtered.map(p => DB.formatRemaining(p));
        // Remove last item for 食材 logic per requirements
        if (currentDept === '食材' && textToCopy.length > 0) {
            textToCopy.pop();
        }
        
        const finalStr = textToCopy.join('\n');
        navigator.clipboard.writeText(finalStr).then(() => {
            showToast('残数をコピーしました', 'success');
        }).catch(() => {
            showToast('コピーに失敗しました', 'error');
        });
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
        if(!selectedStoreForProducts || !currentProducts) {
            showToast('店舗を選択してください', 'error');
            return;
        }
        const store = allStores.find(s => s.id === selectedStoreForProducts);
        const storeName = store ? store.name : selectedStoreForProducts;
        DB.exportToCSV(currentProducts, storeName);
    });

    // ---- History Events ----
    document.getElementById('history-store-select').addEventListener('change', (e) => {
        selectedStoreForHistory = e.target.value;
        if(selectedStoreForHistory) {
            document.getElementById('history-content').style.display = 'block';
            document.getElementById('history-select-prompt').style.display = 'none';
            loadHistoryForStore(selectedStoreForHistory);
        } else {
            document.getElementById('history-content').style.display = 'none';
            document.getElementById('history-select-prompt').style.display = 'block';
        }
    });

    // Close Modals
    document.querySelectorAll('.modal-close, .modal-close-btn, .modal-backdrop').forEach(el => {
        el.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if(modal && (e.target.classList.contains('modal-backdrop') || !e.target.closest('.modal-content') || e.target.closest('.modal-close') || e.target.closest('.modal-close-btn'))) {
                modal.classList.remove('active');
            }
        });
    });
}

// ---- Dashboard functions ----
function updateDashboard() {
    document.getElementById('kpi-store-count').textContent = allStores.length;
    
    // As we can't easily get total products without querying all stores, 
    // let's do a quick calculation if possible, or just skip it.
    let totalProducts = 0;
    const grid = document.getElementById('store-summary-grid');
    grid.innerHTML = '';
    
    allStores.forEach(store => {
        const card = document.createElement('div');
        card.className = 'card kpi-card';
        card.innerHTML = `
            <div class="kpi-title">${SecurityUI.escape(store.name)} (${SecurityUI.escape(store.id)})</div>
            <div class="kpi-value" id="count-${SecurityUI.escape(store.id)}">...</div>
        `;
        grid.appendChild(card);
        
        // Fetch count quickly
        firebase.database().ref(`inventory/${store.id}`).once('value', snap => {
            const count = snap.numChildren();
            totalProducts += count;
            const el = document.getElementById(`count-${store.id}`);
            if(el) el.textContent = `${count} 件`;
            document.getElementById('kpi-product-count').textContent = totalProducts;
        });
    });
}

// ---- Department Management Functions ----
function updateDepartmentsTable() {
    const tbody = document.querySelector('#departments-table tbody');
    tbody.innerHTML = '';
    
    Object.entries(allDepartments).forEach(([key, name]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;">${SecurityUI.escape(key)}</code></td>
            <td>${SecurityUI.escape(name)}</td>
            <td>
                <button class="btn btn-icon btn-ghost" style="color:var(--admin-danger);" data-safe-action="delete-dept" data-key="${SecurityUI.escape(key)}" data-name="${SecurityUI.escape(name)}" title="削除"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateProductDeptTabs() {
    const container = document.getElementById('product-dept-tabs');
    container.innerHTML = '';
    
    allDepartmentNames.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn' + (name === currentDept ? ' active' : '');
        btn.dataset.dept = name;
        btn.textContent = name;
        btn.addEventListener('click', () => {
            container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDept = name;
            renderProductsTable();
        });
        container.appendChild(btn);
    });
}

function updateProductDeptSelect() {
    const select = document.getElementById('product-dept');
    select.innerHTML = '';
    allDepartmentNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

window.confirmDeleteDept = (key, name) => {
    openConfirm(`部門「${name}」を削除しますか？\nこの部門に属する商品は削除されません。`, async () => {
        try {
            await DB.removeDepartment(key);
            showToast(`部門「${name}」を削除しました`, 'success');
        } catch(e) {
            showToast('削除に失敗しました', 'error');
        }
    });
};

// ---- Store Management Functions ----
function updateStoresTable() {
    const tbody = document.querySelector('#stores-table tbody');
    tbody.innerHTML = '';
    
    allStores.forEach(store => {
        const tr = document.createElement('tr');
        
        const dateStr = store.createdAt ? new Date(store.createdAt).toLocaleDateString('ja-JP') : '-';
        const roleBadge = store.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : '<span class="badge badge-user">User</span>';
        
        tr.innerHTML = `
            <td>${SecurityUI.escape(store.id)}</td>
            <td>${SecurityUI.escape(store.name)}</td>
            <td class="store-type-cell"></td>
            <td>${roleBadge}</td>
            <td>${dateStr}</td>
            <td>
                <button class="btn btn-icon btn-ghost" disabled data-safe-action="edit-store" data-key="${SecurityUI.escape(store.id)}" title="編集"><i class="fas fa-edit"></i></button>
                <button class="btn btn-icon btn-ghost" style="color:var(--admin-danger);" disabled data-safe-action="delete-store" data-key="${SecurityUI.escape(store.id)}" title="削除"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStoreSelects() {
    const updateSelect = (id) => {
        const select = document.getElementById(id);
        const currentVal = select.value;
        select.innerHTML = '<option value="">店舗を選択...</option>';
        allStores.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.name} (${s.id})`;
            select.appendChild(opt);
        });
        if(currentVal && allStores.find(s => s.id === currentVal)) {
            select.value = currentVal;
        }
    };
    
    updateSelect('product-store-select');
    updateSelect('history-store-select');
}

window.editStore = (storeId) => {
    const store = allStores.find(s => s.id === storeId);
    if(!store) return;
    
    document.getElementById('store-modal-title').textContent = '店舗編集';
    const idInput = document.getElementById('store-id');
    idInput.value = store.id;
    idInput.setAttribute('readonly', 'true');
    idInput.style.opacity = '0.5';
    
    document.getElementById('store-name').value = store.name;
    document.getElementById('store-password').value = '';
    document.getElementById('store-password').required = false;
    document.getElementById('store-password-hint').style.display = 'inline';
    document.getElementById('store-role').value = store.role;
    document.getElementById('store-auto-template').checked = true;
    
    document.getElementById('store-modal').classList.add('active');
};

function openStoreModal() {
    document.getElementById('store-modal-title').textContent = '店舗登録';
    const idInput = document.getElementById('store-id');
    idInput.value = '';
    idInput.removeAttribute('readonly');
    idInput.style.opacity = '1';
    
    document.getElementById('store-form').reset();
    document.getElementById('store-auto-template').checked = true;
    document.getElementById('store-password').required = true;
    document.getElementById('store-password-hint').style.display = 'none';
    
    document.getElementById('store-modal').classList.add('active');
}

window.confirmDeleteStore = (storeId) => {
    if(storeId === currentSession.storeId) {
        showToast('自分自身は削除できません', 'error');
        return;
    }
    openConfirm(`店舗「${storeId}」を削除しますか？\nこの操作は元に戻せません。`, async () => {
        try {
            await DB.deleteStore(storeId);
            showToast('店舗を削除しました', 'success');
        } catch(e) {
            showToast('削除に失敗しました', 'error');
        }
    });
};

// ---- Product Management Functions ----
function loadProductsForStore(storeId) {
    if(inventoryRef) {
        DB.offInventoryChange(inventoryRef);
    }
    inventoryRef = DB.onInventoryChange(storeId, (products) => {
        currentProducts = products;
        renderProductsTable();
    });
}

function renderProductsTable() {
    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = '';
    
    if(!currentProducts) return;
    
    const filtered = currentProducts.filter(p => p.department === currentDept);
    
    const stepWarehouse = currentDept === 'パック' ? 50 : 1;
    const stepUsed = currentDept === 'パック' ? 1 : 0.1;
    
    filtered.forEach(p => {
        const tr = document.createElement('tr');
        const remaining = DB.getRemaining(p);
        
        tr.innerHTML = `
            <td>${SecurityUI.escape(p.name)}</td>
            <td>
                <input type="number" class="form-input inline-input" step="${stepWarehouse}" value="${SecurityUI.escape(p.warehouse)}" 
                       data-safe-field="warehouse" data-key="${SecurityUI.escape(p.key)}" data-name="${SecurityUI.escape(p.name)}">
            </td>
            <td>
                <input type="number" class="form-input inline-input" step="${stepUsed}" value="${SecurityUI.escape(p.used)}" 
                       data-safe-field="used" data-key="${SecurityUI.escape(p.key)}" data-name="${SecurityUI.escape(p.name)}">
            </td>
            <td style="font-weight: 600;">${remaining}</td>
            <td>
                <button class="btn btn-icon btn-ghost" style="color:var(--admin-danger);" data-safe-action="delete-product" data-key="${SecurityUI.escape(p.key)}" data-name="${SecurityUI.escape(p.name)}" title="削除">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateProductField = async (key, field, value, productName) => {
    if(!selectedStoreForProducts) return;
    const numValue = parseFloat(value) || 0;
    const storeName = currentSession.storeName; // Admin's name or Store name? Usually admin name making change
    
    try {
        await DB.updateProductField(selectedStoreForProducts, key, field, numValue, productName, `管理者(${storeName})`);
    } catch(e) {
        showToast('更新に失敗しました', 'error');
        renderProductsTable(); // revert
    }
};

window.confirmDeleteProduct = (key, name) => {
    openConfirm(`商品「${name}」を削除しますか？`, async () => {
        try {
            await DB.deleteProduct(selectedStoreForProducts, key, name);
            showToast('商品を削除しました', 'success');
        } catch(e) {
            showToast('削除に失敗しました', 'error');
        }
    });
};

function openProductModal() {
    if(!selectedStoreForProducts) {
        showToast('先に店舗を選択してください', 'error');
        return;
    }
    document.getElementById('product-form').reset();
    document.getElementById('product-dept').value = currentDept;
    document.getElementById('product-modal').classList.add('active');
}

// ---- History Functions ----
function loadHistoryForStore(storeId) {
    if(historyRef) {
        // Stop listening previous if possible
        firebase.database().ref(`history/${storeId}`).off();
    }
    
    historyRef = DB.onHistoryChange(storeId, (historyItems) => {
        const timeline = document.getElementById('history-timeline');
        timeline.innerHTML = '';
        
        if(historyItems.length === 0) {
            timeline.innerHTML = '<div style="color:var(--admin-text-muted);">履歴がありません</div>';
            return;
        }
        
        historyItems.forEach(item => {
            const date = new Date(item.timestamp);
            const timeStr = date.toLocaleString('ja-JP');
            
            let icon = 'fa-edit';
            if(item.action === '追加') icon = 'fa-plus';
            if(item.action === '削除') icon = 'fa-trash';
            
            const el = document.createElement('div');
            el.className = 'timeline-item';
            el.innerHTML = `
                <div class="timeline-icon"><i class="fas ${icon}" style="font-size:8px;"></i></div>
                <div class="timeline-content">
                    <div class="timeline-time">${timeStr}</div>
                    <div style="font-weight:600; margin-bottom:4px;">${SecurityUI.escape(item.productName)} [${SecurityUI.escape(item.action)}]</div>
                    <div style="font-size:0.9rem; color:var(--admin-text-muted);">${SecurityUI.escape(item.detail)}</div>
                </div>
            `;
            timeline.appendChild(el);
        });
    }, 50); // limit 50
}

// ---- Utils ----
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function openConfirm(message, onConfirm) {
    document.getElementById('confirm-message').textContent = message;
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('active');
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    
    newOkBtn.addEventListener('click', () => {
        onConfirm();
        modal.classList.remove('active');
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    const color = type === 'success' ? 'var(--admin-secondary)' : 'var(--admin-danger)';
    
    toast.innerHTML = `
        <i class="fas ${icon}" style="color:${color}; font-size:1.2rem;"></i>
        <span>${SecurityUI.escape(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
