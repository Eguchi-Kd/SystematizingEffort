# 推測による実装判断の記録

- Node 20.18.0 との互換性のため Vite 6 / Vitest 3 / TypeScript 5.8 を採用（最新の Vite 8 は Node ^20.19.0 を要求するため）
- PWA アイコンは SVG（public/icon.svg）を使用。SPEC は 192/512px PNG を想定しているが、SVG は全サイズで鮮明かつ1ファイルで完結するため採用
- チャートライブラリは Recharts を採用（ComposedChart で Bar + Line を1つのグラフに描画）
- prevMissed パターンのラベルは「前回が未達成の翌日」とした（SPEC に具体的なラベル指定なし）
- デモシードデータは `?seed=demo` クエリパラメータで動的 import し、ビルドサイズへの影響を最小化
- .ics エクスポートの DTEND は DTSTART + amount 分として計算（SPEC に明記なし）
- オンボーディングは初回アクセス時に自動リダイレクト。設定画面から再診断可能
- HabitEditPage に funNote（楽しくする工夫）欄を全ペルソナで表示（notfun 以外でも編集可能にした方が柔軟）
