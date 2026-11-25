/* Firebase Authentication is the only source of identity. Local UI data grants no access. */
const Auth = (() => {
  const provider = firebase.auth();
  let session = null, accessRef = null, generation = 0;
  const listeners = new Set();
  // Remove the old forgeable session, but retain all monthly count and catalog keys.
  localStorage.removeItem('inventory_auth');
  provider.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(() => {});
  let initialized;
  const readyPromise = new Promise(resolve => { initialized = resolve; });
  const errorText = 'ログインできませんでした。店舗ID・パスワード、またはアカウントの移行設定を確認してください。';
  function emailFor(id) {
    if (!/^[a-z0-9_-]{1,64}$/.test(id)) throw new Error(errorText);
    return `${id}@inventory.invalid`;
  }
  function publish(next) {
    session = next;
    for (const callback of listeners) { try { callback(getSession()); } catch {} }
  }
  function detach() { if (accessRef) { accessRef.off(); accessRef = null; } }
  async function establish(user) {
    const ticket = ++generation; detach(); publish(null);
    if (!user) return null;
    const token = await user.getIdTokenResult();
    const id = token.claims.storeId, role = token.claims.role;
    if (typeof id !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(id) || !['user','admin'].includes(role)) throw new Error(errorText);
    const [accessSnapshot,storeSnapshot] = await Promise.all([
      database.ref(`access/${user.uid}`).once('value'), database.ref(`stores/${id}`).once('value')
    ]);
    const access = accessSnapshot.val(), store = storeSnapshot.val();
    if (!access || access.enabled !== true || access.storeId !== id || access.role !== role || !store || (access.validAfter && !(token.claims.auth_time >= access.validAfter))) throw new Error(errorText);
    if (ticket !== generation || provider.currentUser?.uid !== user.uid) return null;
    const next = Object.freeze({uid:user.uid,storeId:id,storeName:String(store.name || id),role});
    publish(next);
    accessRef = database.ref(`access/${user.uid}`);
    accessRef.on('value', snap => {
      const value = snap.val();
      if (!value || !value.enabled || value.storeId !== id || value.role !== role || (value.validAfter && !(token.claims.auth_time >= value.validAfter))) logout();
    }, () => logout());
    return getSession();
  }
  provider.onAuthStateChanged(async user => {
    try { await establish(user); }
    catch { await logout(); }
    finally { initialized(); }
  });
  function getSession() {
    return session && provider.currentUser?.uid === session.uid ? {...session} : null;
  }
  async function login(storeId,password) {
    const id = String(storeId).trim().toLowerCase();
    try {
      const credentials = await provider.signInWithEmailAndPassword(emailFor(id),password);
      return await establish(credentials.user);
    } catch {
      await logout(); throw new Error(errorText);
    }
  }
  async function logout() { ++generation; detach(); publish(null); await provider.signOut(); }
  async function getIdToken(force=false) {
    await readyPromise;
    if (!getSession()) throw new Error('ログインし直してください。');
    return provider.currentUser.getIdToken(force);
  }
  return {ready:()=>readyPromise,login,logout,getSession,getIdToken,
    isLoggedIn:()=>getSession()!==null,isAdmin:()=>getSession()?.role==='admin',
    onChange:callback=>{listeners.add(callback);return ()=>listeners.delete(callback);}};
})();
