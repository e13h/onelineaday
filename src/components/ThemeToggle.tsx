import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light mode' },
    { value: 'dark' as const, icon: Moon, label: 'Dark mode' },
    { value: 'system' as const, icon: Monitor, label: 'System setting' },
  ];

  const currentThemeIndex = themes.findIndex(t => t.value === theme);
  
  const handleToggle = () => {
    const nextIndex = (currentThemeIndex + 1) % themes.length;
    setTheme(themes[nextIndex].value);
  };

  const currentTheme = themes[currentThemeIndex];
  const Icon = currentTheme.icon;

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
      title={`Current: ${currentTheme.label}. Click to cycle themes.`}
    >
      <Icon 
        size={20} 
        className={`text-slate-600 dark:text-slate-300 transition-colors ${
          theme === 'system' && resolvedTheme === 'dark' ? 'text-yellow-500' : 
          theme === 'light' ? 'text-yellow-500' : 
          theme === 'dark' ? 'text-blue-400' : ''
        }`} 
      />
    </button>
  );
}