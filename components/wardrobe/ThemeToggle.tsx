'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'wardrobe-theme';

export function WardrobeThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') {
      setIsDark(true);
      document.querySelector('.my-wardrobe')?.removeAttribute('data-theme');
    }
  }, []);

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    const wrapper = document.querySelector('.my-wardrobe');
    if (next === 'light') {
      wrapper?.setAttribute('data-theme', 'light');
    } else {
      wrapper?.removeAttribute('data-theme');
    }
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'ライトモードに切替' : 'ダークモードに切替'}
      className="relative cursor-pointer"
      style={{ outline: 'none' }}
    >
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(0,0,0,0.08)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'}`,
          position: 'relative',
          transition: 'all 300ms ease',
        }}
      >
        {/* Track label: sun / moon */}
        <span
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: isDark ? 6 : 'auto',
            right: isDark ? 'auto' : 6,
            fontSize: 10,
            lineHeight: 1,
            opacity: 0.5,
            transition: 'all 300ms ease',
          }}
        >
          {isDark ? '☽' : '☀'}
        </span>

        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: isDark ? 22 : 2,
            width: 18,
            height: 18,
            borderRadius: 9,
            background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
            transition: 'left 300ms cubic-bezier(0.68,-0.15,0.32,1.15)',
          }}
        />
      </div>
    </button>
  );
}
