'use client';

import { useState, createContext, useContext } from 'react';
import { motion } from 'framer-motion';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
  onChange?: (value: string) => void;
}

export function Tabs({
  defaultValue,
  children,
  className = '',
  onChange,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onChange?.(value);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div
      className={`
        flex items-center gap-1
        border-b border-[var(--color-line)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  count?: number;
}

export function TabsTrigger({
  value,
  children,
  className = '',
  count,
}: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={`
        relative
        px-4 py-3
        text-sm font-medium
        transition-colors duration-200
        ${isActive ? 'text-[var(--color-title-active)]' : 'text-[var(--color-text-placeholder)] hover:text-[var(--color-text-body)]'}
        ${className}
      `}
    >
      <span className="flex items-center gap-2">
        {children}
        {count !== undefined && (
          <span
            className={`
              text-xs px-1.5 py-0.5 rounded-[var(--radius-sm)]
              ${isActive ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]' : 'bg-[var(--color-bg-element)] text-[var(--color-text-placeholder)]'}
            `}
          >
            {count}
          </span>
        )}
      </span>
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)]"
          transition={{ duration: 0.2 }}
        />
      )}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`pt-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default Tabs;
