// ============================================================
// Firebase Configuration
// 既存プロジェクト（zaikokannri-sakaihigashi）の設定
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCKGPFyyTFec_OOfKkX_e2xqxC2LzrNRIQ",
  authDomain: "zaikokannri-sakaihigashi.firebaseapp.com",
  databaseURL: "https://zaikokannri-sakaihigashi-default-rtdb.firebaseio.com",
  projectId: "zaikokannri-sakaihigashi",
  storageBucket: "zaikokannri-sakaihigashi.firebasestorage.app",
  messagingSenderId: "92310858947",
  appId: "1:92310858947:web:fd3d6e1e537db7c2608676",
  measurementId: "G-W7QE5LYW06"
};

const usingEmulators = window.InventoryRuntime?.emulators === true && ['127.0.0.1','localhost'].includes(location.hostname);
const activeConfig = usingEmulators ? {...firebaseConfig,apiKey:'demo-api-key',projectId:'demo-inventory-security',databaseURL:'https://demo-inventory-security.firebaseio.com'} : firebaseConfig;
firebase.initializeApp(activeConfig);
if (!usingEmulators && window.InventoryRuntime?.appCheckSiteKey) {
  firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(window.InventoryRuntime.appCheckSiteKey),true);
}
if (usingEmulators) {
  firebase.auth().useEmulator('http://127.0.0.1:9099',{disableWarnings:true});
  firebase.database().useEmulator('127.0.0.1',9000);
}

const database = firebase.database();
