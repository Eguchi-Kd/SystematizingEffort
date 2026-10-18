import { NavLink } from "react-router";

const tabs = [
  { to: "/", label: "ホーム" },
  { to: "/review", label: "振り返り" },
  { to: "/habits", label: "習慣" },
  { to: "/settings", label: "設定" },
] as const;

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      aria-label="メインナビゲーション"
    >
      <ul className="mx-auto flex max-w-lg list-none p-0">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 text-sm no-underline ${
                  isActive
                    ? "font-bold text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`
              }
              aria-label={tab.label}
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
