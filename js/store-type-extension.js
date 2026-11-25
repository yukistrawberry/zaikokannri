/*
 * store-type-extension.js
 *
 * 管理画面に以下を追加する拡張スクリプトです。
 * - テイクアウト店舗 / 酒場店舗の分類
 * - 店舗種別ごとの在庫テンプレート管理
 * - 新規店舗登録時の在庫項目自動生成
 * - 既存店舗へのテンプレート再適用（重複項目は追加しない）
 *
 * Firebase Realtime Database 8.x を前提にしています。
 */
(() => {
    'use strict';

    const CONFIG = {
        storeTypePath: 'storeTypes',
        templatePath: 'inventoryTemplates',
        templateStatePath: 'inventoryTemplateState',
        storeRootCandidates: ['stores', 'users'],
        inventoryRootCandidates: ['inventory'],
        defaultInventoryRoot: 'inventory',
        retryCount: 12,
        retryIntervalMs: 250
    };

    const STORE_TYPES = {
        takeout: {
            label: 'テイクアウト',
            shortLabel: 'テイクアウト',
            icon: 'fa-bag-shopping',
            badgeClass: 'badge-takeout'
        },
        sakaba: {
            label: '酒場',
            shortLabel: '酒場',
            icon: 'fa-martini-glass-citrus',
            badgeClass: 'badge-sakaba'
        },
        admin: {
            label: '管理者',
            shortLabel: '管理者',
            icon: 'fa-user-shield',
            badgeClass: 'badge-admin'
        },
        unknown: {
            label: '未設定',
            shortLabel: '未設定',
            icon: 'fa-circle-question',
            badgeClass: 'badge-unknown'
        }
    };

    const state = {
        activeTemplateType: 'takeout',
        storeTypes: new Map(),
        departments: new Map(),
        inventoryRoot: null,
        templateUnsubscribe: null,
        isRenderingTemplate: false
    };

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function getDatabase() {
        if (!window.firebase || !firebase.database) {
            throw new Error('Firebase Realtime Database が読み込まれていません。');
        }
        return firebase.database();
    }

    function nowTimestamp() {
        return window.firebase?.database?.ServerValue?.TIMESTAMP || Date.now();
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalizeText(value) {
        return String(value ?? '')
            .trim()
            .toLocaleLowerCase('ja-JP')
            .replace(/[\s　_-]+/g, '');
    }

    function normalizeProductKey(product) {
        return `${normalizeText(departmentLabel(product.department))}::${normalizeText(product.name)}`;
    }

    function showToast(message, type = 'success') {
        const container = $('#toast-container');
        if (!container) {
            console[type === 'error' ? 'error' : 'log'](message);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i>
            <span>${escapeHtml(message)}</span>
        `;
        container.appendChild(toast);

        window.setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(24px)';
            window.setTimeout(() => toast.remove(), 250);
        }, 3200);
    }

    function getTypeDefinition(type) {
        return STORE_TYPES[type] || STORE_TYPES.unknown;
    }

    function typeBadgeHtml(type) {
        const definition = getTypeDefinition(type);
        return `
            <span class="badge store-type-badge ${definition.badgeClass}">
                <i class="fas ${definition.icon}"></i>
                ${escapeHtml(definition.shortLabel)}
            </span>
        `;
    }

    async function retry(task, label = '処理') {
        let lastError;
        for (let attempt = 0; attempt < CONFIG.retryCount; attempt += 1) {
            try {
                const result = await task(attempt);
                if (result !== false) return result;
            } catch (error) {
                lastError = error;
            }
            await sleep(CONFIG.retryIntervalMs);
        }
        throw lastError || new Error(`${label}に失敗しました。`);
    }

    async function findStoreRoot(storeId) {
        const database = getDatabase();
        for (const root of CONFIG.storeRootCandidates) {
            const snapshot = await database.ref(`${root}/${storeId}`).once('value');
            if (snapshot.exists()) return root;
        }
        return null;
    }

    async function readStoreType(storeId, options = {}) {
        if (!storeId) return 'unknown';
        const { fresh = false } = options;
        if (!fresh && state.storeTypes.has(storeId)) return state.storeTypes.get(storeId);

        const database = getDatabase();
        // 既存アプリの中心データである stores を最優先にする。
        const storeSnapshot = await database.ref(`stores/${storeId}/storeType`).once('value');
        let type = storeSnapshot.val();

        // 旧形式・補助形式との互換。
        if (!STORE_TYPES[type]) {
            const separateSnapshot = await database.ref(`${CONFIG.storeTypePath}/${storeId}`).once('value');
            const separateValue = separateSnapshot.val();
            type = typeof separateValue === 'string' ? separateValue : separateValue?.type;
        }

        if (!STORE_TYPES[type]) {
            const roleSnapshot = await database.ref(`stores/${storeId}/role`).once('value');
            if (roleSnapshot.val() === 'admin') type = 'admin';
        }

        if (!STORE_TYPES[type]) type = 'unknown';
        state.storeTypes.set(storeId, type);
        return type;
    }

    async function saveStoreType(storeId, type) {
        if (!storeId || !STORE_TYPES[type]) return;

        const database = getDatabase();
        // Account metadata is controlled by the authenticated server function.
        await DB.updateStore(storeId, { storeType: type });

        // 補助インデックスは権限設定によって書けない場合があるため、失敗しても本処理を止めない。
        try {
            await database.ref(`${CONFIG.storeTypePath}/${storeId}`).set({
                type,
                updatedAt: nowTimestamp()
            });
        } catch (error) {
            console.warn('[store-type-extension] storeTypes への補助保存をスキップしました。', error);
        }

        state.storeTypes.set(storeId, type);
    }

    async function resolveInventoryRoot(storeId = '') {
        if (state.inventoryRoot) return state.inventoryRoot;

        const database = getDatabase();
        for (const root of CONFIG.inventoryRootCandidates) {
            const targetPath = storeId ? `${root}/${storeId}` : root;
            const snapshot = await database.ref(targetPath).limitToFirst(1).once('value');
            if (snapshot.exists()) {
                state.inventoryRoot = root;
                return root;
            }
        }

        for (const root of CONFIG.inventoryRootCandidates) {
            const snapshot = await database.ref(root).limitToFirst(1).once('value');
            if (snapshot.exists()) {
                state.inventoryRoot = root;
                return root;
            }
        }

        state.inventoryRoot = CONFIG.defaultInventoryRoot;
        return state.inventoryRoot;
    }

    function flattenProducts(value, parentDepartment = '') {
        if (!value || typeof value !== 'object') return [];
        const products = [];

        Object.entries(value).forEach(([key, item]) => {
            if (!item || typeof item !== 'object') return;

            if (typeof item.name === 'string') {
                products.push({
                    key,
                    department: item.department || parentDepartment || '',
                    name: item.name,
                    warehouse: Number(item.warehouse) || 0,
                    used: Number(item.used) || 0,
                    raw: item
                });
                return;
            }

            Object.entries(item).forEach(([childKey, child]) => {
                if (!child || typeof child !== 'object' || typeof child.name !== 'string') return;
                products.push({
                    key: `${key}/${childKey}`,
                    department: child.department || key,
                    name: child.name,
                    warehouse: Number(child.warehouse) || 0,
                    used: Number(child.used) || 0,
                    raw: child
                });
            });
        });

        return products;
    }

    async function readStoreProducts(storeId) {
        const root = await resolveInventoryRoot(storeId);
        const snapshot = await getDatabase().ref(`${root}/${storeId}`).once('value');
        return flattenProducts(snapshot.val());
    }

    async function addStoreProduct(storeId, product) {
        const root = await resolveInventoryRoot(storeId);
        const payload = {
            // Existing staff/admin screens filter by the displayed department name.
            department: departmentLabel(product.department),
            name: product.name,
            warehouse: Number(product.warehouse) || 0,
            used: Number(product.used) || 0,
            createdAt: nowTimestamp(),
            templateGenerated: true
        };
        await getDatabase().ref(`${root}/${storeId}`).push(payload);
    }

    async function readTemplate(type) {
        const snapshot = await getDatabase().ref(`${CONFIG.templatePath}/${type}`).once('value');
        return flattenProducts(snapshot.val())
            .map(item => ({ ...item, order: Number(item.raw?.order) || 0 }))
            .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ja'));
    }

    async function seedStoreFromTemplate(storeId, type, options = {}) {
        const { silent = false } = options;
        if (!storeId || !['takeout', 'sakaba'].includes(type)) return { added: 0, skipped: 0 };

        const templateItems = await readTemplate(type);
        if (templateItems.length === 0) {
            if (!silent) {
                showToast(`${getTypeDefinition(type).label}用テンプレートが未登録です。`, 'error');
            }
            return { added: 0, skipped: 0, templateEmpty: true };
        }

        const existingProducts = await readStoreProducts(storeId);
        const existingKeys = new Set(existingProducts.map(normalizeProductKey));
        let added = 0;
        let skipped = 0;

        for (const item of templateItems) {
            const key = normalizeProductKey(item);
            if (existingKeys.has(key)) {
                skipped += 1;
                continue;
            }

            await addStoreProduct(storeId, item);
            existingKeys.add(normalizeProductKey({ ...item, department: departmentLabel(item.department) }));
            added += 1;
        }

        try {
            await getDatabase().ref(`${CONFIG.templateStatePath}/${storeId}`).set({
                type,
                appliedAt: nowTimestamp(),
                added,
                templateItemCount: templateItems.length
            });
        } catch (error) {
            console.warn('[store-type-extension] template state save skipped', error);
        }

        if (!silent) {
            const message = added > 0
                ? `${getTypeDefinition(type).label}用の在庫項目を${added}件追加しました。`
                : 'テンプレートの項目はすべて登録済みです。';
            showToast(message);
        }

        return { added, skipped };
    }

    async function importStoreProductsToTemplate(storeId, type) {
        const products = await readStoreProducts(storeId);
        if (products.length === 0) {
            showToast('選択した店舗に取り込める商品がありません。', 'error');
            return;
        }

        const existing = await readTemplate(type);
        const existingKeys = new Set(existing.map(normalizeProductKey));
        const templateRef = getDatabase().ref(`${CONFIG.templatePath}/${type}`);
        let added = 0;

        for (const product of products) {
            const normalizedKey = normalizeProductKey(product);
            if (existingKeys.has(normalizedKey)) continue;

            await templateRef.push({
                department: departmentLabel(product.department),
                name: product.name,
                warehouse: 0,
                used: 0,
                order: existing.length + added,
                createdAt: nowTimestamp()
            });
            existingKeys.add(normalizedKey);
            added += 1;
        }

        showToast(
            added > 0
                ? `${getTypeDefinition(type).label}用テンプレートに${added}件取り込みました。`
                : '同じ商品がすでにテンプレートへ登録されています。'
        );
    }

    async function loadDepartments() {
        const snapshot = await getDatabase().ref('departments').once('value');
        const value = snapshot.val() || {};
        state.departments.clear();

        Object.entries(value).forEach(([key, department]) => {
            const label = typeof department === 'string'
                ? department
                : department?.name || department?.label || key;
            state.departments.set(key, label);
        });

        if (state.departments.size === 0) {
            state.departments.set('pack', 'パック');
            state.departments.set('food', '食材');
        }

        renderDepartmentOptions();
    }

    function departmentLabel(value) {
        const rawValue = String(value ?? '').trim();
        if (!rawValue) return '未分類';
        return state.departments.get(rawValue) || rawValue;
    }

    function departmentKey(value) {
        const normalizedValue = normalizeText(value);
        for (const [key, label] of state.departments.entries()) {
            if (normalizeText(key) === normalizedValue || normalizeText(label) === normalizedValue) {
                return key;
            }
        }
        return String(value ?? '').trim();
    }

    function renderDepartmentOptions() {
        const selects = [$('#template-dept')].filter(Boolean);
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = [...state.departments.entries()]
                .map(([, label]) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`)
                .join('');
            if ([...select.options].some(option => option.value === currentValue)) {
                select.value = currentValue;
            }
        });
    }

    function openModal(modal) {
        if (!modal) return;
        modal.classList.add('active');
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
    }

    function updateTemplateTypeUi() {
        $$('[data-template-type]').forEach(button => {
            button.classList.toggle('active', button.dataset.templateType === state.activeTemplateType);
        });

        const label = $('#active-template-label');
        if (label) label.textContent = `${getTypeDefinition(state.activeTemplateType).label}用`;

        refreshTemplateSourceStores();
        subscribeTemplate();
    }

    function subscribeTemplate() {
        if (state.templateUnsubscribe) state.templateUnsubscribe();

        const reference = getDatabase().ref(`${CONFIG.templatePath}/${state.activeTemplateType}`);
        const handler = snapshot => renderTemplateTable(snapshot.val());
        reference.on('value', handler);
        state.templateUnsubscribe = () => reference.off('value', handler);
    }

    function renderTemplateTable(value) {
        const tbody = $('#template-items-table tbody');
        const empty = $('#template-empty-state');
        if (!tbody) return;

        const items = flattenProducts(value)
            .map(item => ({ ...item, order: Number(item.raw?.order) || 0 }))
            .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ja'));

        tbody.innerHTML = items.map(item => `
            <tr data-template-key="${escapeHtml(item.key)}">
                <td>${escapeHtml(departmentLabel(item.department))}</td>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${escapeHtml(item.warehouse)}</td>
                <td>${escapeHtml(item.used)}</td>
                <td>
                    <button class="btn btn-danger btn-icon btn-delete-template-item" type="button" title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        if (empty) empty.style.display = items.length === 0 ? 'block' : 'none';
        const count = $('#template-item-count');
        if (count) count.textContent = String(items.length);
    }

    async function refreshTemplateSourceStores() {
        const sourceSelect = $('#template-source-store');
        const mainSelect = $('#product-store-select');
        if (!sourceSelect || !mainSelect) return;

        const selectedValue = sourceSelect.value;
        const options = [];

        for (const option of [...mainSelect.options]) {
            const storeId = option.value;
            if (!storeId) continue;
            const type = await readStoreType(storeId);
            if (type !== state.activeTemplateType && type !== 'unknown') continue;

            options.push({
                value: storeId,
                label: option.dataset.baseLabel || option.textContent.replace(/^\[[^\]]+\]\s*/, '')
            });
        }

        sourceSelect.innerHTML = '<option value="">取り込み元店舗を選択...</option>'
            + options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');

        if (options.some(option => option.value === selectedValue)) {
            sourceSelect.value = selectedValue;
        }
    }

    async function decorateStoreSelect(select) {
        if (!select) return;

        for (const option of [...select.options]) {
            if (!option.value) continue;
            if (!option.dataset.baseLabel) option.dataset.baseLabel = option.textContent.trim();
            const type = await readStoreType(option.value);
            option.textContent = `[${getTypeDefinition(type).shortLabel}] ${option.dataset.baseLabel}`;
            option.dataset.storeType = type;
        }
    }

    async function decorateStoreTable() {
        const table = $('#stores-table');
        if (!table) return;

        const rows = $$('tbody tr', table);
        for (const row of rows) {
            const firstCell = row.cells[0];
            if (!firstCell) continue;
            const storeId = firstCell.textContent.trim();
            if (!storeId) continue;

            let typeCell = $('.store-type-cell', row);
            if (!typeCell) {
                typeCell = row.insertCell(Math.min(2, row.cells.length));
                typeCell.className = 'store-type-cell';
            }

            const roleCell = [...row.cells].find(cell =>
                cell !== typeCell && /管理者|Admin/i.test(cell.textContent)
            );
            let type = roleCell ? 'admin' : await readStoreType(storeId);
            if (type === 'unknown' && /admin/i.test(storeId)) type = 'admin';

            const badgeHtml = typeBadgeHtml(type);
            if (typeCell.innerHTML !== badgeHtml) typeCell.innerHTML = badgeHtml;
            row.dataset.storeType = type;
        }

        applyStoreFilter();
    }

    function applyStoreFilter() {
        const activeButton = $('.store-filter-btn.active');
        const filter = activeButton?.dataset.storeFilter || 'all';

        $$('#stores-table tbody tr').forEach(row => {
            const type = row.dataset.storeType || 'unknown';
            row.style.display = filter === 'all' || filter === type ? '' : 'none';
        });
    }

    async function updateSelectedStoreTypeBadge() {
        const select = $('#product-store-select');
        const target = $('#selected-store-type');
        const applyButton = $('#btn-apply-template');
        if (!select || !target) return;

        const storeId = select.value;
        if (!storeId) {
            target.innerHTML = '';
            if (applyButton) applyButton.disabled = true;
            return;
        }

        const type = await readStoreType(storeId, { fresh: true });
        target.innerHTML = typeBadgeHtml(type);
        if (applyButton) applyButton.disabled = !['takeout', 'sakaba'].includes(type);
    }

    async function syncStoreTypeField() {
        const modal = $('#store-modal');
        const storeIdInput = $('#store-id');
        const typeSelect = $('#store-type');
        const roleSelect = $('#store-role');
        const typeGroup = $('#store-type-group');
        if (!modal || !storeIdInput || !typeSelect || !roleSelect || !typeGroup) return;

        const isAdmin = roleSelect.value === 'admin';
        typeGroup.classList.toggle('is-disabled', isAdmin);
        typeSelect.disabled = isAdmin;

        if (isAdmin) {
            typeSelect.value = 'takeout';
            return;
        }

        const storeId = storeIdInput.value.trim();
        const editing = /編集/.test($('#store-modal-title')?.textContent || '') || storeIdInput.disabled || storeIdInput.readOnly;
        if (!storeId || !editing) return;

        const type = await readStoreType(storeId);
        if (['takeout', 'sakaba'].includes(type)) typeSelect.value = type;
    }

    async function saveStoreSettings(submission = {}) {
        const storeId = submission.storeId || $('#store-id')?.value.trim();
        const role = submission.role || $('#store-role')?.value || 'user';
        const selectedType = role === 'admin'
            ? 'admin'
            : (submission.type || $('#store-type')?.value || 'takeout');
        const autoApply = submission.autoApply ?? ($('#store-auto-template')?.checked ?? true);
        const isEdit = submission.isEdit ?? ($('#store-id')?.readOnly || false);
        const silentTemplate = submission.silentTemplate ?? false;
        if (!storeId) throw new Error('店舗IDが指定されていません。');

        const storeRoot = await findStoreRoot(storeId);
        if (!storeRoot) throw new Error('保存済みの店舗情報を確認できません。');

        await saveStoreType(storeId, selectedType);

        let templateResult = null;
        if (!isEdit && autoApply && ['takeout', 'sakaba'].includes(selectedType)) {
            templateResult = await seedStoreFromTemplate(storeId, selectedType, { silent: silentTemplate });
        }

        state.storeTypes.delete(storeId);
        await decorateStoreTable();
        await decorateStoreSelect($('#product-store-select'));
        await decorateStoreSelect($('#history-store-select'));
        await updateSelectedStoreTypeBadge();
        await refreshTemplateSourceStores();

        return { storeId, type: selectedType, templateResult };
    }

    function bindTemplatePage() {
        $$('[data-template-type]').forEach(button => {
            button.addEventListener('click', () => {
                state.activeTemplateType = button.dataset.templateType;
                updateTemplateTypeUi();
            });
        });

        $('#btn-add-template-item')?.addEventListener('click', () => {
            const form = $('#template-item-form');
            form?.reset();
            const warehouse = $('#template-warehouse');
            const used = $('#template-used');
            if (warehouse) warehouse.value = '0';
            if (used) used.value = '0';
            renderDepartmentOptions();
            openModal($('#template-item-modal'));
        });

        $('#template-item-form')?.addEventListener('submit', async event => {
            event.preventDefault();
            const department = $('#template-dept')?.value;
            const name = $('#template-name')?.value.trim();
            const warehouse = Number($('#template-warehouse')?.value || 0);
            const used = Number($('#template-used')?.value || 0);

            if (!department || !name || !Number.isFinite(warehouse) || !Number.isFinite(used)) {
                showToast('テンプレート項目を正しく入力してください。', 'error');
                return;
            }

            const existing = await readTemplate(state.activeTemplateType);
            if (existing.some(item => normalizeProductKey(item) === normalizeProductKey({ department, name }))) {
                showToast('同じ部門・商品名がすでに登録されています。', 'error');
                return;
            }

            try {
                await getDatabase().ref(`${CONFIG.templatePath}/${state.activeTemplateType}`).push({
                    department: departmentLabel(department),
                    name,
                    warehouse,
                    used,
                    order: existing.length,
                    createdAt: nowTimestamp()
                });

                closeModal($('#template-item-modal'));
                showToast('テンプレート項目を追加しました。');
            } catch (error) {
                console.error('[store-type-extension] template add failed', error);
                const permissionDenied = /permission|denied/i.test(String(error?.code || error?.message || error));
                showToast(
                    permissionDenied
                        ? 'Firebaseの権限によりテンプレートを保存できません。Realtime Databaseルールを確認してください。'
                        : `テンプレート項目を追加できませんでした: ${error?.message || '不明なエラー'}`,
                    'error'
                );
            }
        });

        $('#template-items-table')?.addEventListener('click', async event => {
            const button = event.target.closest('.btn-delete-template-item');
            if (!button) return;
            const row = button.closest('tr');
            const key = row?.dataset.templateKey;
            if (!key) return;

            await getDatabase().ref(`${CONFIG.templatePath}/${state.activeTemplateType}/${key}`).remove();
            showToast('テンプレート項目を削除しました。');
        });

        $('#btn-import-template')?.addEventListener('click', async () => {
            const storeId = $('#template-source-store')?.value;
            if (!storeId) {
                showToast('取り込み元店舗を選択してください。', 'error');
                return;
            }

            try {
                await importStoreProductsToTemplate(storeId, state.activeTemplateType);
            } catch (error) {
                console.error(error);
                showToast('店舗の商品一覧を取り込めませんでした。', 'error');
            }
        });
    }

    function bindStoreControls() {
        $('#store-role')?.addEventListener('change', syncStoreTypeField);
        $('#store-id')?.addEventListener('change', syncStoreTypeField);

        $$('.store-filter-btn').forEach(button => {
            button.addEventListener('click', () => {
                $$('.store-filter-btn').forEach(item => item.classList.remove('active'));
                button.classList.add('active');
                applyStoreFilter();
            });
        });

        $('#btn-apply-template')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            const storeId = $('#product-store-select')?.value;
            if (!storeId) {
                showToast('店舗を選択してください。', 'error');
                return;
            }

            button.disabled = true;
            const originalHtml = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 適用中';

            try {
                const type = await readStoreType(storeId, { fresh: true });
                if (!['takeout', 'sakaba'].includes(type)) {
                    showToast('先に店舗管理で店舗種別を設定してください。', 'error');
                    return;
                }
                await seedStoreFromTemplate(storeId, type);
            } catch (error) {
                console.error('[store-type-extension] template apply failed', error);
                const permissionDenied = /permission|denied/i.test(String(error?.code || error?.message || error));
                showToast(
                    permissionDenied
                        ? 'Firebaseの権限により商品を追加できません。Realtime Databaseルールを確認してください。'
                        : `テンプレートを適用できませんでした: ${error?.message || '不明なエラー'}`,
                    'error'
                );
            } finally {
                button.innerHTML = originalHtml;
                await updateSelectedStoreTypeBadge();
            }
        });
    }

    function bindNavigationFallback() {
        $$('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', () => {
                const pageName = item.dataset.page;
                const page = $(`#${pageName}-page`);
                if (!page) return;

                $$('.nav-item').forEach(navItem => navItem.classList.remove('active'));
                item.classList.add('active');
                $$('.main-content > .page').forEach(pageElement => pageElement.classList.remove('active'));
                page.classList.add('active');

                if (pageName === 'templates') updateTemplateTypeUi();
            });
        });
    }

    function bindModalClosers() {
        $$('#template-item-modal .modal-close, #template-item-modal .modal-close-btn, #template-item-modal .modal-backdrop')
            .forEach(button => button.addEventListener('click', () => closeModal($('#template-item-modal'))));
    }

    function observeDynamicUi() {
        const storesTableBody = $('#stores-table tbody');
        if (storesTableBody) {
            new MutationObserver(() => decorateStoreTable().catch(console.error))
                .observe(storesTableBody, { childList: true });
        }

        const productSelect = $('#product-store-select');
        if (productSelect) {
            new MutationObserver(() => {
                decorateStoreSelect(productSelect).catch(console.error);
                refreshTemplateSourceStores().catch(console.error);
            }).observe(productSelect, { childList: true });

            productSelect.addEventListener('change', () => {
                updateSelectedStoreTypeBadge().catch(console.error);
            });
        }

        const historySelect = $('#history-store-select');
        if (historySelect) {
            new MutationObserver(() => decorateStoreSelect(historySelect).catch(console.error))
                .observe(historySelect, { childList: true });
        }

        const storeModal = $('#store-modal');
        if (storeModal) {
            new MutationObserver(() => {
                if (storeModal.classList.contains('active')) {
                    window.setTimeout(() => syncStoreTypeField().catch(console.error), 0);
                }
            }).observe(storeModal, { attributes: true, attributeFilter: ['class'] });
        }
    }

    window.StoreTypeExtension = Object.freeze({
        saveStoreSettings,
        applyTemplateToStore: seedStoreFromTemplate,
        readStoreType
    });

    async function initialize() {
        try {
            await Auth.ready();
            if (!Auth.isAdmin()) {
                const stop = Auth.onChange(session => { if (session?.role === 'admin') { stop(); initialize(); } });
                return;
            }
            await retry(() => {
                if (!window.firebase || !firebase.database || !firebase.apps?.length) return false;
                return true;
            }, 'Firebase初期化');

            await loadDepartments();
            bindNavigationFallback();
            bindTemplatePage();
            bindStoreControls();
            bindModalClosers();
            observeDynamicUi();

            await decorateStoreTable();
            await decorateStoreSelect($('#product-store-select'));
            await decorateStoreSelect($('#history-store-select'));
            await updateSelectedStoreTypeBadge();
            updateTemplateTypeUi();
        } catch (error) {
            console.error('[store-type-extension]', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
