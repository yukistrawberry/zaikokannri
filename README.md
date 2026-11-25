# 在庫管理・棚卸 統合版（無料版）

Firebase Spark + Authentication + Realtime Database + Hostingで使用。Cloud Functions不要。
店舗ログイン→毎日在庫→月末棚卸。画面と数量ルールは維持、棚卸は端末内保存。

2026-11-26: 元のFirebaseへアカウント移行・Database Rules・Hostingの公開を実施済み。公開先: https://zaikokannri-sakaihigashi.web.app 。Web設定とFraud Defenseサイトキーを設定済み。4アカウント、在庫・履歴の保全、未ログイン読み取り拒否を確認。

利用者による本番ログイン確認と、App Checkの指標確認・強制適用が残っている。月末棚卸のfile://端末データはHTTPSへ自動引継ぎされない。

店舗アカウント操作は管理者のローカルツールで行う。ブラウザーには管理用認証情報を配布しない。
Node.js 22、pnpm install、pnpm build。公開対象はdist。functionsは旧構成の参照用で無料版では使用しない。


GitHub Pages: https://yukistrawberry.github.io/zaikokannri/
GitHub Pagesでも使う場合は、Fraud Defenseのサイトキーの許可ドメインにyukistrawberry.github.ioを追加する。HostingのHTTPヘッダー設定はGitHub Pagesには反映されない。管理ツールやバックアップをPagesの公開フォルダーへ入れない。
