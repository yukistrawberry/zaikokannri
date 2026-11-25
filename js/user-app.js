// user-app.js - Staff app logic

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const loginScreen = document.getElementById('login-screen');
    const mainScreen = document.getElementById('main-screen');
    const loginForm = document.getElementById('login-form');
    const storeIdInput = document.getElementById('store-id');
    const passwordInput = document.getElementById('password');
    const rememberStoreIdInput = document.getElementById('remember-store-id');
    const loginError = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const headerStoreName = document.getElementById('header-store-name');
    const departmentTabsContainer = document.getElementById('department-tabs');
    const inventoryList = document.getElementById('inventory-list');
    const emptyState = document.getElementById('empty-state');
    const copyBtn = document.getElementById('copy-btn');
    const toastContainer = document.getElementById('toast-container');

    // Login storage
    const REMEMBERED_STORE_ID_KEY = 'inventory_remembered_store_id';

    // App State
    let session = null;
    let inventoryData = [];
    let departments = [];
    let activeDepartment = '';
    let inventoryRef = null;

    // Initialize App
    init().catch(() => { showLoginScreen(); });

    async function init() {
        await Auth.ready();
        restoreRememberedStoreId();

        session = Auth.getSession();
        if (session && session.role === 'user') {
            showMainScreen();
        } else {
            if (session && session.role === 'admin') await Auth.logout();
            showLoginScreen();
        }
    }

    function restoreRememberedStoreId() {
        const rememberedStoreId = localStorage.getItem(REMEMBERED_STORE_ID_KEY);

        if (rememberedStoreId) {
            storeIdInput.value = rememberedStoreId;
            rememberStoreIdInput.checked = true;
            passwordInput.focus();
        }
    }

    function updateRememberedStoreId(storeId) {
        if (rememberStoreIdInput.checked) {
            localStorage.setItem(REMEMBERED_STORE_ID_KEY, storeId);
        } else {
            localStorage.removeItem(REMEMBERED_STORE_ID_KEY);
        }
    }

    // --- Screen Management ---
    function showLoginScreen() {
        if (document.body.dataset.requireSession === 'true') {
            location.replace('index.html?release=daily-route-2');
            return;
        }
        loginScreen.classList.remove('hidden');
        mainScreen.classList.add('hidden');
    }

    function showMainScreen() {
        loginScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        headerStoreName.textContent = session.storeName;
        
        loadData();
    }

    // --- Data Loading ---
    function loadData() {
        // Load Departments
        DB.onDepartmentsChange(deps => {
            departments = deps || [];
            if (!activeDepartment && departments.length > 0) {
                activeDepartment = departments[0];
            }
            renderTabs();
            renderInventory();
        });

        // Load Inventory
        if (inventoryRef) DB.offInventoryChange(inventoryRef);
        inventoryRef = DB.onInventoryChange(session.storeId, items => {
            inventoryData = items || [];
            renderInventory();
        });
    }

    // --- Rendering ---
    function renderTabs() {
        departmentTabsContainer.innerHTML = '';
        departments.forEach(dep => {
            const btn = document.createElement('button');
            btn.className = `tab-btn ${dep === activeDepartment ? 'active' : ''}`;
            btn.textContent = dep;
            btn.addEventListener('click', () => {
                activeDepartment = dep;
                renderTabs();
                renderInventory();
            });
            departmentTabsContainer.appendChild(btn);
        });
    }

    function renderInventory() {
        let filtered = inventoryData.filter(item => item.department === activeDepartment);
        
        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            inventoryList.style.display = 'none';
        } else {
            emptyState.classList.add('hidden');
            inventoryList.style.display = 'block';
        }

        const newKeys = new Set(filtered.map(i => i.key));
        
        // Remove old nodes
        Array.from(inventoryList.children).forEach(child => {
            if (!newKeys.has(child.dataset.key)) {
                child.remove();
            }
        });

        // Add or update nodes
        filtered.forEach(item => {
            let row = inventoryList.querySelector(`[data-key="${item.key}"]`);
            if (!row) {
                row = document.createElement('div');
                row.className = 'inventory-card';
                row.dataset.key = item.key;

                row.innerHTML = `
                    <div class="col-name"><div class="item-name"></div></div>
                    <div class="col-warehouse">
                        <input
                            type="number"
                            class="item-warehouse-input"
                            min="0"
                            inputmode="decimal"
                            placeholder="0"
                        >
                    </div>
                    <div class="col-used">
                        <input
                            type="number"
                            class="item-used-input"
                            min="0"
                            inputmode="decimal"
                            placeholder="0"
                        >
                    </div>
                    <div class="col-remaining"><div class="item-remaining"></div></div>
                `;
                inventoryList.appendChild(row);

                const warehouseInput = row.querySelector('.item-warehouse-input');
                const usedInput = row.querySelector('.item-used-input');

                warehouseInput.addEventListener('change', () => {
                    handleInventoryFieldChange(row._currentItem, 'warehouse', warehouseInput);
                });

                usedInput.addEventListener('change', () => {
                    handleInventoryFieldChange(row._currentItem, 'used', usedInput);
                });

                [warehouseInput, usedInput].forEach(input => {
                    input.addEventListener('blur', () => {
                        const currentItem = row._currentItem;
                        const field = input.classList.contains('item-warehouse-input')
                            ? 'warehouse'
                            : 'used';

                        if (input.value === '') {
                            input.value = currentItem?.[field] ?? 0;
                        }
                    });
                });
            }

            // イベントリスナーから常に最新の商品データを参照する
            row._currentItem = item;

            const nameEl = row.querySelector('.item-name');
            if (nameEl.textContent !== item.name) {
                nameEl.textContent = item.name;
            }

            const isFood = item.department === '食材';
            const warehouseInputEl = row.querySelector('.item-warehouse-input');
            const usedInputEl = row.querySelector('.item-used-input');

            warehouseInputEl.step = isFood ? '0.1' : '1';
            usedInputEl.step = isFood ? '0.01' : '1';
            warehouseInputEl.setAttribute('aria-label', `${item.name}の倉庫在庫`);
            usedInputEl.setAttribute('aria-label', `${item.name}の店舗使用数`);

            // 入力中の値をFirebaseからの再描画で上書きしない
            if (document.activeElement !== warehouseInputEl) {
                warehouseInputEl.value =
                    item.warehouse !== undefined && item.warehouse !== null
                        ? item.warehouse
                        : 0;
            }

            if (document.activeElement !== usedInputEl) {
                const usedValue =
                    item.used !== undefined && item.used !== null
                        ? Number(item.used)
                        : 0;
                usedInputEl.value = isFood
                    ? usedValue.toFixed(2)
                    : String(usedValue);
            }

            const remainingEl = row.querySelector('.item-remaining');
            const remaining = DB.getRemaining
                ? DB.getRemaining(item)
                : ((parseFloat(item.warehouse) || 0) + (parseFloat(item.used) || 0));
            const remainingStr = DB.formatRemaining
                ? DB.formatRemaining(item)
                : remaining;

            if (remainingEl.textContent !== String(remainingStr)) {
                remainingEl.textContent = remainingStr;
            }
        });
    }

    async function handleInventoryFieldChange(item, field, inputElement) {
        if (!item || !inputElement) return;

        const previousValue = Number(item[field]) || 0;
        const rawValue = inputElement.value.trim();
        const parsedValue = Number(rawValue);

        if (rawValue === '' || !Number.isFinite(parsedValue) || parsedValue < 0) {
            inputElement.value =
                item.department === '食材' && field === 'used'
                    ? previousValue.toFixed(2)
                    : String(previousValue);
            showToast('0以上の数値を入力してください', 'error');
            return;
        }

        // 食材の使用数は小数第2位に丸めて保存する
        const normalizedValue =
            item.department === '食材' && field === 'used'
                ? Math.round((parsedValue + Number.EPSILON) * 100) / 100
                : parsedValue;

        // 同じ値でも表示形式を小数第2位へ整える
        if (normalizedValue === previousValue) {
            inputElement.value =
                item.department === '食材' && field === 'used'
                    ? normalizedValue.toFixed(2)
                    : String(normalizedValue);
            return;
        }

        inputElement.disabled = true;

        try {
            await DB.updateProductField(
                session.storeId,
                item.key,
                field,
                normalizedValue,
                item.name,
                session.storeName
            );
            inputElement.value =
                item.department === '食材' && field === 'used'
                    ? normalizedValue.toFixed(2)
                    : String(normalizedValue);
        } catch (error) {
            console.error('Update failed', error);
            inputElement.value =
                item.department === '食材' && field === 'used'
                    ? previousValue.toFixed(2)
                    : String(previousValue);
            showToast(
                field === 'warehouse'
                    ? '倉庫数の更新に失敗しました'
                    : '使用数の更新に失敗しました',
                'error'
            );
        } finally {
            inputElement.disabled = false;
        }
    }

    // --- Event Listeners ---
    rememberStoreIdInput.addEventListener('change', () => {
        if (!rememberStoreIdInput.checked) {
            localStorage.removeItem(REMEMBERED_STORE_ID_KEY);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');
        loginBtn.disabled = true;
        const spinner = loginBtn.querySelector('.spinner');
        if(spinner) spinner.classList.remove('hidden');
        
        try {
            const userSession = await Auth.login(storeIdInput.value.trim(), passwordInput.value);
            if (userSession && userSession.role !== 'admin') {
                session = userSession;
                updateRememberedStoreId(session.storeId);
                showMainScreen();
                showToast(`${session.storeName} にログインしました`);

                // パスワードはlocalStorageへ保存しない。
                // ブラウザのパスワード保存判定を妨げないよう、少し待ってから消去する。
                window.setTimeout(() => {
                    passwordInput.value = '';
                    if (!rememberStoreIdInput.checked) {
                        storeIdInput.value = '';
                    }
                }, 1200);
            } else if (userSession && userSession.role === 'admin') {
                await Auth.logout();
                loginError.textContent = '管理者アカウントです。管理画面（admin.html）をご利用ください。';
                loginError.classList.remove('hidden');
            } else {
                loginError.textContent = '店舗IDまたはパスワードが間違っています。';
                loginError.classList.remove('hidden');
            }
        } catch (error) {
            loginError.textContent = 'ログイン処理中にエラーが発生しました。';
            loginError.classList.remove('hidden');
        } finally {
            loginBtn.disabled = false;
            if(spinner) spinner.classList.add('hidden');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        if (confirm('ログアウトしますか？')) {
            await Auth.logout();
            session = null;
            if (inventoryRef) {
                DB.offInventoryChange(inventoryRef);
                inventoryRef = null;
            }
            showLoginScreen();

            const rememberedStoreId = localStorage.getItem(REMEMBERED_STORE_ID_KEY);
            storeIdInput.value = rememberedStoreId || '';
            rememberStoreIdInput.checked = Boolean(rememberedStoreId);
            passwordInput.value = '';

            if (rememberedStoreId) {
                passwordInput.focus();
            } else {
                storeIdInput.focus();
            }
        }
    });

    copyBtn.addEventListener('click', () => {
        const currentItems = inventoryData.filter(item => item.department === activeDepartment);
        if (currentItems.length === 0) return;

        let itemsToCopy = currentItems;
        if (activeDepartment === '食材') {
            // Exclude the last item for 食材
            itemsToCopy = currentItems.slice(0, -1);
        }

        const lines = itemsToCopy.map(item => {
            return DB.getRemaining ? DB.getRemaining(item) : ((parseFloat(item.warehouse)||0) + (parseFloat(item.used)||0));
        });

        const textToCopy = lines.join('\n');
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast('残数をコピーしました');
            }).catch(err => {
                console.error('Clipboard error', err);
                fallbackCopy(textToCopy);
            });
        } else {
            fallbackCopy(textToCopy);
        }
    });
    
    function fallbackCopy(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; 
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('残数をコピーしました');
        } catch (e) {
            showToast('コピーに失敗しました', 'error');
        }
        document.body.removeChild(textArea);
    }

    // --- Utilities ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        // trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
