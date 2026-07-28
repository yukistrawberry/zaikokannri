// ============================================================
// Firebase Configuration
// 既存プロジェクト（zaikokannri-sakaihigashi）の設定
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "zaikokannri-sakaihigashi.firebaseapp.com",
  databaseURL: "https://zaikokannri-sakaihigashi-default-rtdb.firebaseio.com",
  projectId: "zaikokannri-sakaihigashi",
  storageBucket: "zaikokannri-sakaihigashi.appspot.com",
  messagingSenderId: "92310858947",
  appId: "1:92310858947:web:f6d6e1e537d87c2608676",
  measurementId: "G-W7QESLYW06"
};

firebase.initializeApp(firebaseConfig);

const database = firebase.database();
