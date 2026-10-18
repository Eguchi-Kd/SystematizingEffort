# 努力の仕組み化アプリ 実装仕様書(SPEC.md)

この文書は、Claude Code がこのリポジトリで Web アプリを実装するための仕様である。
設計の背景(山根承子『努力は仕組み化できる』の要素との対応)は別の設計書にある。この文書は「何をどう作るか」だけを定める。

---

## 0. Claude Code への作業指示

1. **マイルストーン順に実装する。** 「9. マイルストーン」の M0 から順に進める。各マイルストーンの完了条件をすべて満たしてから次に進む。
2. **ドメインロジックはテスト先行で書く。** 「6. ドメインロジック」の関数は、記載したテストケースをそのまま Vitest のテストにしてから実装する。
3. **仕様にない機能を足さない。** 特に、ポイント・バッジ・ランキング・祝福演出・AI 機能・ログイン機能・サーバー通信は作らない。
4. **UI 文言はすべて日本語にする。** 文言は「7.3 文言」の方針に従う。
5. **曖昧な点は実装前に質問する。** 推測で仕様を補った場合は、その箇所を `DECISIONS.md` に1行で記録する。
6. **各マイルストーンの終わりに** `npm run typecheck`、`npm run lint`、`npm test` がすべて通ることを確認し、変更点を短く報告する。
7. ライブラリは各パッケージの最新安定版を使う。メジャーバージョンの API 差異は公式ドキュメントで確認する。

---

## 1. プロダクト概要

- 個人用(利用者は1人)の習慣化アプリ。PWA としてスマホのホーム画面に追加して使う。
- 毎日の操作は「ホームを開いて『やった』を1回タップ」だけで完結させる。目安は10秒以内。
- 判断を伴う操作(理由の分析、自動化の自己評価、継続判断)は週1回の「週次チェック」にまとめる。
- データはすべて端末内(IndexedDB)に保存する。サーバーも外部送信もない。

### 1.1 設計原則(実装判断に迷ったらここに戻る)

| # | 原則 | 実装上の帰結 |
| --- | --- | --- |
| P1 | アプリの操作を努力にしない | 毎日の必須操作はタップ1回。確認ダイアログを出さない(取り消しで対応) |
| P2 | 中盤の停滞を見せ方で支える | 主表示は累積量と週単位の推移。日次の上下は強調しない |
| P3 | 外発的報酬を主役にしない | ポイント・バッジなし。連続日数は習慣詳細に小さく出すだけで、設定で非表示にできる |
| P4 | 失敗はデータとして扱う | 未達成は「記録なし」と表示。理由は事実を尋ねる形で聞く |
| P5 | やめるのも正当な選択肢 | 継続・縮小・終了のボタンを同じ見た目で並べる |

---

## 2. 技術スタック

| 用途 | 採用 | 備考 |
| --- | --- | --- |
| ビルド | Vite | `npm create vite@latest` の react-ts テンプレート |
| UI | React + TypeScript(strict) | |
| ルーティング | React Router | |
| スタイル | Tailwind CSS | ダークモードは `prefers-color-scheme` に追従 |
| 永続化 | Dexie.js + dexie-react-hooks | 画面は `useLiveQuery` で DB を直接購読する。グローバル状態ライブラリは使わない |
| 日付 | date-fns | |
| グラフ | Recharts | |
| バリデーション | zod | インポートデータとフォーム入力の検証 |
| PWA | vite-plugin-pwa | オフライン動作、ホーム画面追加 |
| テスト | Vitest + @testing-library/react + fake-indexeddb | |
| Lint/整形 | ESLint + Prettier | |
| ID 生成 | `crypto.randomUUID()` | |

**npm scripts**: `dev`, `build`, `preview`, `test`, `typecheck`(`tsc --noEmit`), `lint`。

---

## 3. ディレクトリ構成

```
src/
  domain/            # 純粋関数のみ。React・Dexie に依存しない
    types.ts         # 型定義(4章)
    dates.ts         # 日付ユーティリティ
    schedule.ts      # 予定日判定
    stats.ts         # 達成率・累積・週次系列・連続日数
    guards.ts        # 小さく始めるガード・段階アップ
    reasons.ts       # 理由入力が必要な日の抽出
    patterns.ts      # パターン検出(M4)
    automaticity.ts  # 自動化スコア・卒業判定(M4)
    review.ts        # 定期レビューの要否(M4)
    persona.ts       # タイプ診断(M5)
    exportSchema.ts  # エクスポート形式の zod スキーマ
    __tests__/       # 各ファイルのテスト
  db/
    db.ts            # Dexie 定義
    repo.ts          # 書き込み操作(記録・取り消し・習慣の保存など)
    seed.ts          # 既定の理由タグ投入
  ui/
    components/      # 汎用部品(Button, Card, BottomNav, TagButton など)
    pages/           # 画面(7章)
  App.tsx
  main.tsx
```

---

## 4. データモデル

### 4.1 型定義(`src/domain/types.ts`)

日付は **ローカル日付の文字列 `YYYY-MM-DD`**(型 `LocalDate`)で扱う。UTC 変換による日付ずれを避けるため、`Date#toISOString()` で日付文字列を作らない。

```typescript
export type LocalDate = string; // 'YYYY-MM-DD'

export type HabitKind = 'build' | 'replace';        // 始めたい / やめたい(置き換え)
export type HabitStatus = 'active' | 'graduated' | 'ended';

export interface Habit {
  id: string;
  kind: HabitKind;
  name: string;               // 行動名(例: ランニング)。1〜40文字
  replacesText?: string;      // kind='replace' のとき必須。置き換える悪習慣(例: 寝る直前の夕食)
  purpose: string;            // 始めた目的。0〜200文字(persona='meaning' のときは必須)
  unit: string;               // 回・分・ページ など。1〜10文字
  amount: number;             // 1回の量。正の整数
  minAmount: number;          // 自己申告の「絶対できる量」。1 以上 amount 以下
  amountChangedOn: LocalDate; // 量を最後に変更した日(作成時は startedOn)
  schedule: {
    days: number[];           // 曜日。0=日〜6=土。1つ以上
    time?: string;            // 'HH:mm'。time と cue の少なくとも一方は必須
    cue?: string;             // きっかけ行動(例: 夕食の後)
  };
  place: string;              // どこで。1〜40文字
  how: string;                // どのように。0〜80文字
  commitmentNote?: string;    // 環境設計メモ(例: スマホを別室に置く)
  funNote?: string;           // 楽しくする工夫(persona='notfun' で入力欄を表示)
  status: HabitStatus;
  startedOn: LocalDate;
  endedOn?: LocalDate;        // graduated/ended にした日
  endNote?: string;
  createdAt: string;          // ISO 日時
}

export interface Log {
  id: string;
  habitId: string;
  date: LocalDate;
  done: boolean;
  amount: number;             // done=false のときは 0
  reasonTagIds: string[];     // done=false のときのみ意味を持つ。空配列 = 理由スキップ
  memo?: string;
  recordedAt: string;         // ISO 日時
}

export interface ReasonTag {
  id: string;
  label: string;              // 1〜12文字
  builtIn: boolean;
  archived: boolean;          // 削除の代わりに非表示にする
}

export interface WeeklyCheck {
  id: string;
  habitId: string;
  weekStart: LocalDate;       // その週の月曜
  automaticity: [number, number, number, number]; // 各 1〜5
  review?: {
    stillUseful: number;      // 1〜5
    wouldChooseAgain: boolean;
    decision: 'continue' | 'reduce' | 'end';
  };
  answeredAt: string;
}

export interface Countermeasure {
  id: string;
  habitId: string;
  conditionKey: string;       // patterns.ts が返す条件キー(例: 'weekday:6', 'prevMissed')
  conditionLabel: string;     // 表示用(例: 土曜日)
  action: string;             // 1〜80文字
  createdOn: LocalDate;
}

export type Persona = 'regret' | 'optimist' | 'meaning' | 'selfblame' | 'notfun';

export interface Settings {
  id: 'singleton';
  persona?: Persona;
  showStreak: boolean;        // 既定 true
  lastExportAt?: string;
  onboarded: boolean;
}
```

### 4.2 Dexie スキーマ(`src/db/db.ts`)

```typescript
db.version(1).stores({
  habits: 'id, status, startedOn',
  logs: 'id, habitId, date, &[habitId+date]',
  reasonTags: 'id',
  weeklyChecks: 'id, habitId, weekStart, &[habitId+weekStart]',
  countermeasures: 'id, habitId',
  settings: 'id',
});
```

- `Log` は (habitId, date) で一意、`WeeklyCheck` は (habitId, weekStart) で一意。
- 達成率などの集計値は保存しない。毎回 `Log` から計算する。
- 初回起動時に `seed.ts` で既定の理由タグを入れる: 予定外の用事 / 疲れ / 忘れた / 気分が乗らない / 体調 / 前日の予定の影響 / その他。
- 起動時に `navigator.storage.persist()` を呼ぶ(結果は設定画面に表示)。

### 4.3 書き込み操作(`src/db/repo.ts`)

| 関数 | 振る舞い |
| --- | --- |
| `recordDone(habitId, date, amount?)` | その日の Log を upsert し `done=true`、`amount`(省略時は habit.amount)、`reasonTagIds=[]` にする。既存が done=true なら amount を加算する(追加実行) |
| `undoLog(habitId, date)` | その日の Log を削除する |
| `recordMissed(habitId, date, reasonTagIds, memo?)` | Log を upsert し `done=false, amount=0` にする |
| `saveHabit(habit)` | 作成・更新。amount が変わったら `amountChangedOn` を今日にする |
| `setHabitStatus(habitId, status, note?)` | graduated/ended にしたら `endedOn` を今日にする。active に戻すと `endedOn` を消す |
| `saveWeeklyCheck(check)` | upsert。review.decision が 'end' なら `setHabitStatus(..., 'ended')`、'reduce' なら習慣編集画面へ遷移させる(UI 側) |
| `exportAll()` / `importAll(json)` | 5章 |

記録を受け付ける日付は **今日と過去3日まで**。未来日と4日以上前は UI で選べないようにし、repo でも拒否する。

---

## 5. エクスポート/インポート

```json
{
  "app": "effort-system",
  "version": 1,
  "exportedAt": "2026-10-14T09:00:00+09:00",
  "habits": [], "logs": [], "reasonTags": [], "weeklyChecks": [], "countermeasures": [], "settings": {}
}
```

- エクスポート: 上記 JSON を `effort-backup-YYYYMMDD.json` としてダウンロードさせ、`settings.lastExportAt` を更新する。
- インポート: zod で検証する。不正なら何も変更せず、どこが不正かを表示する。正しければ「現在のデータをすべて置き換えます」と確認してから、トランザクション内で全テーブルを置き換える。
- `lastExportAt` が7日以上前(または未設定で習慣が1つ以上)のとき、ホームの最下部にバックアップを促すカードを出す。

---

## 6. ドメインロジック(すべて純粋関数・テスト必須)

引数の `today` は常に外から渡す(関数内で現在時刻を取らない)。テストの基準日は **2026-10-18(日)** とする。

共通のテスト用習慣 `H`:
- `startedOn: '2026-10-05'`(月)、`schedule.days: [1, 3, 5]`(月・水・金)、`amount: 10`、`minAmount: 5`、`status: 'active'`

### 6.1 `schedule.ts`

```typescript
isScheduled(habit: Habit, date: LocalDate): boolean
scheduledDates(habit: Habit, from: LocalDate, to: LocalDate): LocalDate[]
```

- 曜日が `schedule.days` に含まれ、`startedOn <= date`、かつ `endedOn` があれば `date <= endedOn` のとき true。

テスト:
- `scheduledDates(H, '2026-10-05', '2026-10-18')` → `['2026-10-05','2026-10-07','2026-10-09','2026-10-12','2026-10-14','2026-10-16']`
- `isScheduled(H, '2026-10-04')` → false(開始前)
- `isScheduled(H, '2026-10-06')` → false(火曜)

### 6.2 `stats.ts`

```typescript
achievementRate(habit, logs, from, to, today): { rate: number | null; done: number; scheduled: number }
cumulativeAmount(habit, logs): number
weeklySeries(habit, logs, today, weeks = 12): { weekStart: LocalDate; doneCount: number; scheduledCount: number; amount: number }[]
streak(habit, logs, today): number
```

- **achievementRate**: 対象は `[from, min(to, today)]` の予定日。`done` = その予定日のうち done=true の Log がある日数。予定日が0なら `rate: null`。予定外の日の記録は数えない。**今日が予定日で、まだ Log がない場合は分母に入れない**(1日の途中で達成率が下がるのを防ぐ)。
- **cumulativeAmount**: done=true の Log の amount 合計(予定外の日も含む)。
- **weeklySeries**: 今日を含む週(月曜始まり)から遡って `weeks` 週分を古い順に返す。`amount` は予定外の日を含む合計。
- **streak**: 今日以前の予定日を新しい順にたどり、done=true が続く数。今日が予定日でまだ Log がなければ今日は飛ばす。

テスト(ログ: 10-05 done 10、10-07 done 10、10-09 missed、10-12 done 10、10-14 done 15、10-16 Log なし、10-17(土・予定外)done 10):
- `achievementRate(H, logs, '2026-10-05', '2026-10-18', '2026-10-18')` → `{ rate: 4/6, done: 4, scheduled: 6 }`
- `cumulativeAmount(H, logs)` → 55
- `streak(H, logs, '2026-10-18')` → 0(10-16 が未記録)
- 10-16 を done にした場合の `streak` → 3(10-12, 10-14, 10-16)
- 今日を `'2026-10-16'` とし、10-16 の Log がない場合の `achievementRate(H, logs, '2026-10-05', '2026-10-16', '2026-10-16')` → `{ done: 4, scheduled: 5 }`
- `weeklySeries(H, logs, '2026-10-18', 2)` → `[{ weekStart:'2026-10-05', doneCount:2, scheduledCount:3, amount:20 }, { weekStart:'2026-10-12', doneCount:2, scheduledCount:3, amount:35 }]`

### 6.3 `guards.ts`

```typescript
smallStartSuggestion(amount: number, minAmount: number, persona?: Persona): number | null
levelUpSuggestion(habit, logs, today): number | null
```

- **smallStartSuggestion**: `amount > minAmount * k` なら `minAmount` を返し、それ以外は null。`k` は既定 2、persona が 'selfblame' なら 1.5。
- **levelUpSuggestion**: 次をすべて満たすとき `max(amount + 1, ceil(amount * 1.25))` を返し、それ以外は null。
  - 直近14日(`today-13`〜`today`)の achievementRate が 0.9 以上
  - その期間の予定日が4日以上
  - `amountChangedOn` から14日以上経過(`today - amountChangedOn >= 14`)

テスト:
- `smallStartSuggestion(60, 10)` → 10、`smallStartSuggestion(20, 10)` → null、`smallStartSuggestion(16, 10, 'selfblame')` → 10
- amount 10、直近14日の予定6日すべて done、amountChangedOn が15日前 → 13
- 上と同じで amountChangedOn が10日前 → null

### 6.4 `reasons.ts`

```typescript
pendingReasonPrompts(habits, logs, today): { habitId: string; date: LocalDate }[]
```

- active な習慣について、`today-3`〜`today-1` の予定日のうち Log がない日を、古い順に返す。
- テスト: 今日 2026-10-18、上記ログ → `[{ habitId: H.id, date: '2026-10-16' }]`(10-15 は予定日でない)

### 6.5 `patterns.ts`(M4)

```typescript
detectPatterns(habit, logs, today): { key: string; label: string; rate: number; n: number; overallRate: number }[]
reasonBreakdown(habit, logs, today): { tagId: string; count: number }[]
```

- 対象期間は `startedOn`〜`today-1` の予定日(今日は除く)。Log がない予定日は未達成として扱う。
- 条件は2種類:
  - `weekday:<0-6>`: その曜日の予定日
  - `prevMissed`: 直前の予定日が未達成だった予定日
- 各条件について、条件に当てはまる予定日の達成率 `rate` と日数 `n` を出す。全体の達成率 `overallRate` と比べ、**`n >= 8` かつ `overallRate - rate >= 0.2`** の条件だけを返す。差の大きい順に最大3件。
- 理由タグは「未達成の日にしか付かない」ため、条件には使わない。`reasonBreakdown` で件数の内訳として別に表示する。
- テスト: 月水金の習慣で、8週間分のうち金曜だけ8回中2回 done、月水はすべて done → `[{ key:'weekday:5', label:'金曜日', rate:0.25, n:8, overallRate:18/24 }]`。金曜の予定日が7日しかない場合は空配列。

### 6.6 `automaticity.ts`(M4)

```typescript
automaticityScore(check: WeeklyCheck): number           // 4問の平均(丸めない。表示時のみ小数1桁)
graduationEligible(habit, logs, checks, today): boolean
```

- **graduationEligible**: 次をすべて満たすとき true。
  - `today - startedOn >= 56`
  - その習慣の WeeklyCheck を weekStart の新しい順に並べた先頭3件がすべてスコア 4.0 以上(3件未満なら false)
  - 直近28日の achievementRate が 0.8 以上
- テスト: 57日経過・直近3回が [4.25, 4.0, 4.5]・達成率 0.85 → true。直近3回が [4.25, 3.75, 4.5] → false。50日経過 → false。

### 6.7 `review.ts`(M4)

```typescript
reviewDue(habit, checks, today, persona?): boolean
```

- 間隔 `d` = 28日(persona が 'meaning' なら14日)。
- `today - startedOn >= d` かつ、review を含む WeeklyCheck が直近 `d` 日以内にないとき true。

### 6.8 日付ユーティリティ(`dates.ts`)

`toLocalDate(d: Date)`, `parseLocalDate(s)`, `addDays(s, n)`, `diffDays(a, b)`, `weekStartOf(s)`(月曜), `weekdayOf(s)`(0=日)を実装し、テストする。夏時間のない JST 前提だが、date-fns のローカル関数で実装して TZ に依存しないようにする。

---

## 7. 画面仕様

スマホ縦画面(幅 360〜430px)を基準にする。下部タブは **ホーム / 振り返り / 習慣 / 設定** の4つ。

### 7.1 ルート

| パス | 画面 | 導入 |
| --- | --- | --- |
| `/` | ホーム | M2 |
| `/habits` | 習慣一覧 | M2 |
| `/habits/new` | 習慣作成ウィザード | M2 |
| `/habits/:id` | 習慣詳細 | M3 |
| `/habits/:id/edit` | 習慣編集(ウィザードと同じフォームを1ページで表示) | M2 |
| `/review` | 振り返り | M3(パターン表示は M4) |
| `/weekly` | 週次チェック | M4 |
| `/settings` | 設定 | M2 |
| `/onboarding` | 初回のタイプ診断 | M5 |

### 7.2 各画面

**ホーム(`/`)** 上から順に表示する。
1. **理由入力カード**(`pendingReasonPrompts` の結果があるとき、1件ずつ): 「10/16(金) ランニング は記録なし。何があった?」+ 理由タグのボタン(横並び、折り返し)+「理由なし」+「あとで」。タグ1つをタップした時点で `recordMissed` して次のカードに進む(複数選択はしない)。「理由なし」は空配列で記録する。「あとで」はこの画面を閉じるまで非表示にする。
2. **週次チェックカード**(M4。金〜日曜で、今週の WeeklyCheck が未回答の active 習慣があるとき): 「今週のチェック(1分)」→ `/weekly`
3. **今日の習慣**: 今日が予定日の active 習慣をカードで並べる。カードには行動名、実行意図の1文(7.4)、「やった」ボタンを置く。
   - 「やった」で `recordDone`。カードは「記録済み 10分 ・取り消す」の表示に変わる。
   - 「やった」を長押しすると、量を入力するボトムシートを開く。
   - 記録済みのカードには「追加で記録」ボタンを出す(量入力シートを開き、量を加算する)。
4. **今日は予定のない習慣**(折りたたみ、初期は閉じる): 予定外の日の実行を記録できる。
5. **過去の記録を直す**: 過去3日分の日付を選んで、記録・取り消しができるシートを開くリンク。
6. **バックアップ促進カード**(5章の条件)

習慣が1つもないときは、ホーム中央に「最初の習慣をつくる」ボタンだけを出す。

**習慣作成ウィザード(`/habits/new`)** 4ステップ。上部に「1/4」の進捗を出し、戻れるようにする。
1. 種類: 「始めたい」「やめたい」。「やめたい」を選んだら「やめたいこと」(replacesText)を入力させ、「代わりに何をする?」と次の行動名の入力に導く。
2. 行動と量: 行動名、目的(任意)、単位、1回の量、「絶対にできる量」。`smallStartSuggestion` が値を返したら「まず {minAmount}{unit} から始めませんか?」と表示し、「そうする」で amount に反映する。採用しなくても進める。
3. 実行意図: 曜日(複数選択のトグル)、時刻 または きっかけ行動、場所、やり方、環境設計メモ(任意)。persona が 'notfun' なら「楽しくする工夫」欄を出す。
4. 確認: 7.4 の1文を大きく表示して「この内容で始める」。保存後はホームに戻る。

**習慣詳細(`/habits/:id`)**
- 実行意図の1文、目的
- 累積量(大きく): 「これまで合計 55分」
- 直近28日の達成率: 「28日間で 4/6 回」(分子/分母を必ず併記する)
- 週次グラフ: `weeklySeries` 12週の棒グラフ(実行回数)と、予定回数の目安線
- 月間カレンダー: 予定日の枠、done の日の塗り、予定外の実行は小さな点
- 連続日数(`settings.showStreak` が true のときだけ、小さな文字で表示)
- 段階アップの提案(`levelUpSuggestion` が値を返すとき): 「量を {n}{unit} に上げてみませんか?」+「上げる」「今はしない」
- M4 以降: 自動化スコアの推移(折れ線)、理由の内訳、登録した対策、卒業提案(`graduationEligible`)
- 編集ボタン、状態変更(定着済みにする / 終了する / 再開する)

**振り返り(`/review`)**
- 全 active 習慣の今週・先週の `doneCount/scheduledCount`
- M4: 習慣ごとの `detectPatterns` の結果。各結果は「金曜日は 8回中2回(全体 75%)」のように件数を併記する。下に「この条件への対策を登録」(Countermeasure 作成。80文字以内の自由記述)を置く。結果がなければ「まだ傾向を出せるだけのデータがありません」と表示する。

**週次チェック(`/weekly`)(M4)**
- 対象: 今週の WeeklyCheck が未回答の active 習慣。1習慣ずつ表示する。
- 自動化の4問(各5段階のボタン):
  1. 考えなくても始めている
  2. やらないと落ち着かない
  3. 始めるのに意志の力がいらない
  4. 気づいたらやっている
- `reviewDue` が true の習慣には続けて2問を出す:
  1. この習慣は、始めた目的にまだ役立っていますか?(5段階。目的を表示する)
  2. 今ゼロから始めるとしても、この習慣を選びますか?(はい/いいえ)
  - その後、「続ける」「量を減らす」「やめる」を **同じスタイルのボタン** で並べ、「やめる」の下に「やめるのも判断です」と小さく添える。
- 卒業条件を満たした習慣には最後に「定着したようです。『定着済み』に移しますか?」と提案する。

**習慣一覧(`/habits`)**: 「実行中」「定着済み」「終了」の3セクション。各行に行動名と直近28日の達成回数。右上に「+ 新しい習慣」。

**設定(`/settings`)**: 連続日数の表示切り替え、理由タグの追加・名前変更・非表示、タイプ診断のやり直し(M5)、エクスポート、インポート、ストレージ永続化の状態、アプリのバージョン。

### 7.3 文言

- 未達成は「できなかった」「失敗」と書かず、「記録なし」と書く。
- 理由は「何があった?」と事実を尋ねる。
- 感嘆符、絵文字、「すごい!」などの評価語を使わない。完了時の表示は「記録しました」程度にとどめる。

### 7.4 実行意図の1文

`formatIntention(habit): string` を `domain` に置き、テストする。

- 曜日: 全曜日なら「毎日」、[1..5] なら「平日」、[0,6] なら「土日」、それ以外は「月・水・金曜」のように並べる。
- 形式: `{曜日}の{時刻 or きっかけ}に、{場所}で、{やり方}{行動名}を{量}{単位}`
  - time のみ: 「月・水・金曜の20:00に、ジムで、ランニングを10分」
  - cue のみ: 「毎日の夕食の後に、リビングで、英単語を10個」
  - how が空なら「、{やり方}」を省く。
- kind='replace' の場合は先頭に「{replacesText}の代わりに、」を付ける。

---

## 8. PWA・非機能要件

- `vite-plugin-pwa` で manifest(name: 努力の仕組み化、short_name: 仕組み化、theme/background color、192/512px のアイコン)と Service Worker を生成し、オフラインで全画面が動くようにする。アイコンは単純な図形の SVG から生成してよい。
- 外部へのネットワーク通信をしない(フォントも同梱するか、システムフォントを使う)。
- 「やった」ボタンは最低 48px の高さで、画面の下半分に来るようにする。
- 主要な操作要素に `aria-label` を付ける。色だけで状態を伝えない(記録済みは文字でも示す)。
- ダークモードに対応する。
- **リマインド通知は作らない。** サーバーなしの Web Push は成り立たないため、M5 で「カレンダー用ファイル(.ics)の書き出し」を代わりに提供する。

---

## 9. マイルストーン

### M0 プロジェクト基盤
- Vite + React + TS、Tailwind、ESLint/Prettier、Vitest、React Router を設定する。
- 下部タブと空の4画面。
- **完了条件**: `npm run dev` で4タブが切り替わる。`typecheck` / `lint` / `test` が通る。

### M1 ドメインとデータ層
- `types.ts`、`dates.ts`、`schedule.ts`、`stats.ts`、`guards.ts`、`reasons.ts`、`formatIntention`、`exportSchema.ts` と、6章のテスト一式。
- `db.ts`、`repo.ts`、`seed.ts`。repo は fake-indexeddb でテストする(upsert、追加実行の加算、日付範囲外の拒否、インポートの置き換えと不正データでの無変更)。
- **完了条件**: 6.1〜6.4・7.4 のテストケースがすべて通る。

### M2 MVP の記録ループ
- ホーム(理由入力カード、今日の習慣、予定外の習慣、過去3日の修正)、習慣作成ウィザード、習慣編集、習慣一覧、設定(エクスポート/インポート、タグ編集、連続日数の切り替え)。
- **完了条件**:
  - 習慣を作成し、ホームでタップ1回で記録・取り消しができる。
  - 前日の未記録が翌日のホームに理由入力カードとして出て、1タップで消える。
  - エクスポートした JSON を、データを消したブラウザでインポートすると元に戻る。
  - コンポーネントテスト: ホームの「やった」→「記録済み」の表示遷移。

### M3 可視化と PWA
- 習慣詳細(累積、達成率、週次グラフ、カレンダー、連続日数、段階アップ提案)、振り返り画面(週次サマリー)、PWA 化、バックアップ促進カード。
- **完了条件**: `npm run build && npm run preview` の状態でスマホからホーム画面に追加でき、機内モードでも記録できる。

### M4 週次チェックと分析
- `patterns.ts`、`automaticity.ts`、`review.ts` とテスト。週次チェック画面、振り返り画面のパターン表示と対策登録、習慣詳細の自動化スコア推移・理由内訳・卒業提案。
- **完了条件**: 6.5〜6.7 のテストが通る。テスト用のシードデータ(開発時のみ有効な `?seed=demo` で8週間分を投入)で、パターン・卒業提案・レビューが画面に出ることを確認できる。

### M5 個人化と仕上げ
- 初回オンボーディングのタイプ診断(下記)。
- 習慣ごとの .ics 書き出し(RRULE で曜日と時刻を繰り返し予定にする。time がない習慣は対象外)。
- **タイプ診断**: 次の5文に「当てはまる」度合いを5段階で答えさせ、最も高いものを persona にする(同点なら上の順で先のもの)。「スキップ」も可能。
  1. やるべきことはわかっているのに、できずに後悔することが多い → regret
  2. 努力しなくても、たいていは何とかなると思う → optimist
  3. 続けている途中で「これに意味があるのか」と止まってしまう → meaning
  4. 続かないのは自分の意志が弱いからだと思う → selfblame
  5. 努力はそもそも楽しくない → notfun
- persona による違い(これ以外は変えない):

  | persona | 変更点 |
  | --- | --- |
  | regret | ウィザードで環境設計メモを必須にする |
  | optimist | ホームの各カードに「今週 {done}/{scheduled} 回」を表示する |
  | meaning | 目的を必須にし、レビュー間隔を14日にする |
  | selfblame | 小さく始めるガードの倍率を 1.5 にする |
  | notfun | ウィザードに「楽しくする工夫」欄を出し、詳細画面に表示する |

- **完了条件**: 診断結果に応じて上記の変更が反映される。設定画面から診断をやり直せる。

---

## 10. 作らないもの

- ログイン、複数ユーザー、サーバー、同期
- 他人との共有・グループ機能
- ポイント、バッジ、レベル、ランキング、祝福アニメーション
- AI/LLM による提案やチャット
- Web Push 通知
- アクセス解析
