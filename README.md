# 在庫管理システム — マルチ店舗対応版

複数店舗の在庫を管理するWebアプリケーションです。  
管理側アプリと使用側アプリの2つの画面で構成されています。

## 🚀 セットアップ

### 1. Firebase 設定

`js/firebase-config.js` を開き、`apiKey` を実際の値に変更してください：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC_YOUR_API_KEY_HERE",  // ← ここを変更
  // ... 他の設定はそのまま
};
```

### 2. Firebase Realtime Database ルール

Firebase コンソール > Realtime Database > ルール で以下を設定：

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ 本番運用時はセキュリティルールを適切に設定してください。

### 3. 初回起動

1. `admin.html` をブラウザで開く
2. 初回アクセス時、デフォルト管理者アカウントが自動作成されます：
   - **店舗ID**: `admin`
   - **パスワード**: `admin`
3. ログイン後、まず管理者パスワードを変更してください

### 4. 店舗の追加

1. 管理側アプリにログイン
2. サイドバーの「🏪 店舗管理」をクリック
3. 「+ 新規店舗」ボタンで店舗を登録
   - 店舗ID（英数字、例: `sakaihigashi`）
   - 店舗名（例: `堺東店`）
   - パスワード
   - 権限（管理者 or 使用者）

### 5. 既存データの移行

既存の `sakaihigashi/` データがある場合、ダッシュボードに「データ移行」ボタンが表示されます。
クリックすると `inventory/sakaihigashi/` に自動移行されます。

## 📱 使い方

### 管理側アプリ（admin.html）

| ページ | 機能 |
|--------|------|
| ダッシュボード | 全店舗の在庫概況 |
| 店舗管理 | 店舗アカウントの追加・編集・削除 |
| 商品管理 | 店舗別の商品追加・編集・削除、CSV出力 |
| 履歴 | 変更履歴の閲覧 |

### 使用側アプリ（index.html）

| 機能 | 説明 |
|------|------|
| ログイン | 店舗ID + パスワードでログイン |
| 在庫閲覧 | 自店舗の在庫一覧を表示 |
| 使用数入力 | 店舗使用数を直接入力・更新 |
| 残数コピー | 部門ごとの残数をクリップボードにコピー |

## 🌐 無料ホスティング

### GitHub Pages
1. GitHubリポジトリを作成
2. 全ファイルをpush
3. Settings > Pages > Source: main branch

### Netlify
1. [netlify.com](https://www.netlify.com/) にアクセス
2. プロジェクトフォルダをドラッグ&ドロップ

## 📁 ファイル構成

```
inventory-manager/
├── index.html          # 使用側アプリ
├── admin.html          # 管理側アプリ
├── css/
│   ├── common.css      # 共通デザインシステム
│   ├── admin.css       # 管理側スタイル（ダーク）
│   └── user.css        # 使用側スタイル（ライト）
├── js/
│   ├── firebase-config.js  # Firebase設定
│   ├── auth.js         # 認証
│   ├── db.js           # DB操作
│   ├── admin-app.js    # 管理側ロジック
│   └── user-app.js     # 使用側ロジック
└── README.md
```

## ⚙️ 技術スタック

- HTML5 + CSS3 + JavaScript (ES6+)
- Firebase Realtime Database
- Chart.js（管理側ダッシュボード）
- Google Fonts (Inter)
