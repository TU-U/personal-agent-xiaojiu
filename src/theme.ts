export type ThemeId = 'nature' | 'y2k' | 'brutalist';

export const themes: { id: ThemeId; name: string; description: string; colors: string[] }[] = [
  {
    id: 'nature',
    name: '自然生长',
    description: 'Organic Biophilic 配色，结合 Nature Distilled 与 Claymorphism 组件和动效',
    colors: ['#f2f4e9', '#526b43', '#c67b5c', '#d4c4a8'],
  },
  {
    id: 'y2k',
    name: '液态 Y2K',
    description: 'Y2K 色彩与组件，搭配 Liquid Glass 按钮和 Motion-Driven 动效',
    colors: ['#f5efff', '#d52c83', '#316ad2', '#8e69dc'],
  },
  {
    id: 'brutalist',
    name: '新粗野主义',
    description: 'Neubrutalism 色彩与组件，结合 3D Product Preview 质感和动效',
    colors: ['#fff1a8', '#174acb', '#ff705c', '#191919'],
  },
];

const storageKey = 'shiguang.web.theme';

export function readTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(storageKey);
    return themes.some((theme) => theme.id === saved) ? (saved as ThemeId) : 'nature';
  } catch {
    return 'nature';
  }
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  const browserColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (browserColor) {
    browserColor.content = theme === 'nature' ? '#f2f4e9' : theme === 'y2k' ? '#f6f1fb' : '#fff1a8';
  }
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Keep the selected theme for this visit when persistent storage is unavailable.
  }
}
