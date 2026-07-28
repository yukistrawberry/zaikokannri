// ============================================================
// Authentication Module
// 店舗ID + パスワードによるシンプル認証
// ============================================================

const Auth = (() => {
  const STORAGE_KEY = 'inventory_auth';

  // SHA-256 ハッシュ関数
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ログイン
  async function login(storeId, password) {
    const id = storeId.trim().toLowerCase();
    if (!id || !password) {
      throw new Error('店舗IDとパスワードを入力してください。');
    }

    const snapshot = await database.ref(`stores/${id}`).once('value');
    const storeData = snapshot.val();

    if (!storeData) {
      throw new Error('店舗IDが見つかりません。');
    }

    const hashedInput = await hashPassword(password);
    if (storeData.password !== hashedInput) {
      throw new Error('パスワードが正しくありません。');
    }

    const session = {
      storeId: id,
      storeName: storeData.name,
      role: storeData.role || 'user',
      loginAt: Date.now()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  // ログアウト
  function logout() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // 現在のセッション取得
  function getSession() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  // ログイン済みか確認
  function isLoggedIn() {
    return getSession() !== null;
  }

  // 管理者か確認
  function isAdmin() {
    const session = getSession();
    return session && session.role === 'admin';
  }

  // 初期管理者アカウント作成（店舗が1つも登録されていない場合）
  async function ensureDefaultAdmin() {
    const snapshot = await database.ref('stores').once('value');
    if (snapshot.exists()) return false;

    const defaultPassword = await hashPassword('admin');
    await database.ref('stores/admin').set({
      name: '管理者',
      password: defaultPassword,
      role: 'admin',
      createdAt: Date.now()
    });

    return true;
  }

  return {
    hashPassword,
    login,
    logout,
    getSession,
    isLoggedIn,
    isAdmin,
    ensureDefaultAdmin
  };
})();
