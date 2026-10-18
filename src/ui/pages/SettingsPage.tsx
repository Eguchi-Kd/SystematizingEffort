import { useRef, useState } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { exportAll, importAll } from "../../db/repo";
import type { ReasonTag } from "../../domain/types";
import Button from "../components/Button";
import Card from "../components/Card";

const PERSONA_LABELS: Record<string, string> = {
  regret: "後悔タイプ",
  optimist: "楽観タイプ",
  meaning: "意味タイプ",
  selfblame: "自責タイプ",
  notfun: "楽しくないタイプ",
};

function TagEditor({ tag }: { tag: ReasonTag }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(tag.label);

  const handleSave = async () => {
    if (label.trim().length > 0 && label.trim().length <= 12) {
      await db.reasonTags.update(tag.id, { label: label.trim() });
      setEditing(false);
    }
  };

  const handleToggleArchive = async () => {
    await db.reasonTags.update(tag.id, { archived: !tag.archived });
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={12}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          autoFocus
        />
        <Button size="sm" onClick={handleSave}>
          保存
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          取消
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-sm ${tag.archived ? "text-gray-400 line-through dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}
      >
        {tag.label}
      </span>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          名前変更
        </Button>
        <Button size="sm" variant="ghost" onClick={handleToggleArchive}>
          {tag.archived ? "表示する" : "非表示"}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get("singleton"));
  const tags = useLiveQuery(() => db.reasonTags.toArray()) ?? [];
  const [newTag, setNewTag] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [storageStatus, setStorageStatus] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleStreakToggle = async () => {
    if (!settings) return;
    await db.settings.update("singleton", {
      showStreak: !settings.showStreak,
    });
  };

  const handleExport = async () => {
    const json = await exportAll(db);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `effort-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(false);

    const text = await file.text();
    if (!confirm("現在のデータをすべて置き換えます。よろしいですか?")) return;

    const result = await importAll(text, db);
    if (result.success) {
      setImportSuccess(true);
    } else {
      setImportError(result.error ?? "不明なエラー");
    }
    e.target.value = "";
  };

  const handleAddTag = async () => {
    if (newTag.trim().length > 0 && newTag.trim().length <= 12) {
      await db.reasonTags.add({
        id: crypto.randomUUID(),
        label: newTag.trim(),
        builtIn: false,
        archived: false,
      });
      setNewTag("");
    }
  };

  const checkStorage = async () => {
    if (navigator.storage?.persisted) {
      const persisted = await navigator.storage.persisted();
      setStorageStatus(persisted);
    }
  };

  if (!settings) return null;

  return (
    <div className="flex-1 space-y-4 p-4 pb-20">
      <h1 className="text-xl font-bold">設定</h1>

      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            連続日数を表示
          </span>
          <button
            role="switch"
            aria-checked={settings.showStreak}
            onClick={handleStreakToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.showStreak ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                settings.showStreak ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
          理由タグ
        </h2>
        <div className="space-y-2">
          {tags.map((tag) => (
            <TagEditor key={tag.id} tag={tag} />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="新しいタグ"
            maxLength={12}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <Button
            size="sm"
            disabled={newTag.trim().length === 0}
            onClick={handleAddTag}
          >
            追加
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
          データ管理
        </h2>
        <div className="space-y-2">
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={handleExport}
          >
            エクスポート
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={handleImportClick}
          >
            インポート
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          {importSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              インポートが完了しました
            </p>
          )}
          {importError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              エラー: {importError}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
          ストレージ
        </h2>
        <Button variant="secondary" size="sm" onClick={checkStorage}>
          永続化の状態を確認
        </Button>
        {storageStatus !== null && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {storageStatus ? "永続化されています" : "永続化されていません"}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          タイプ診断
        </h2>
        {settings.persona ? (
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            現在のタイプ: {PERSONA_LABELS[settings.persona] ?? settings.persona}
          </p>
        ) : (
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            未診断
          </p>
        )}
        <Link to="/onboarding">
          <Button variant="secondary" size="sm">
            診断をやり直す
          </Button>
        </Link>
      </Card>

      <Card>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          努力の仕組み化 v0.1.0
        </p>
      </Card>
    </div>
  );
}
