import { useState, useRef, useEffect } from "react";
import { useTheme, THEMES, type Theme } from "../services/ThemeContext";
import { SparkleIcon, LeafIcon, SunIcon } from "./ui/Icons";
import { Moon } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const getThemeIcon = (t: Theme, size = 14) => {
    switch (t) {
      case "mint":
        return <LeafIcon size={size} />;
      case "peach":
        return <SunIcon size={size} />;
      case "midnight":
        return <Moon size={size} />;
      default:
        return <SparkleIcon size={size} />;
    }
  };

  const currentConfig = THEMES[theme];

  return (
    <div className="theme-switcher-wrapper" ref={containerRef} style={{ position: "relative", zIndex: 1002 }}>
      <button
        type="button"
        className="theme-switcher-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Current theme: ${currentConfig.label}. Click to switch theme.`}
        title={`Theme: ${currentConfig.label}`}
      >
        <span
          className="theme-dot"
          style={{
            backgroundColor: currentConfig.primaryColor,
            boxShadow: `0 0 8px ${currentConfig.primaryColor}80`,
          }}
        />
        <span className="theme-trigger-icon" style={{ color: currentConfig.primaryColor }}>
          {getThemeIcon(theme, 13)}
        </span>
        <span className="theme-trigger-label">{currentConfig.label}</span>
      </button>

      {open && (
        <div className="theme-switcher-dropdown" role="menu" style={{ zIndex: 99999 }}>
          <div className="theme-dropdown-header">Select Theme</div>
          {(Object.keys(THEMES) as Theme[]).map((key) => {
            const item = THEMES[key];
            const isActive = theme === key;
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                className={`theme-dropdown-item${isActive ? " active" : ""}`}
                onClick={() => {
                  setTheme(key);
                  setOpen(false);
                }}
              >
                <div
                  className="theme-swatch"
                  style={{
                    backgroundColor: item.bgColor,
                    borderColor: item.primaryColor,
                  }}
                >
                  <span
                    className="theme-swatch-dot"
                    style={{ backgroundColor: item.primaryColor }}
                  />
                </div>
                <div className="theme-item-info">
                  <div className="theme-item-title-row">
                    <span className="theme-item-name">{item.label}</span>
                    <span className="theme-item-badge">{item.badge}</span>
                  </div>
                  <span className="theme-item-desc">{item.sublabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
