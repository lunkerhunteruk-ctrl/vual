'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = createContext<AccordionContextValue | undefined>(undefined);

interface AccordionItemContextValue {
  value: string;
}

const AccordionItemContext = createContext<AccordionItemContextValue | undefined>(undefined);

function useAccordionContext() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion provider');
  }
  return context;
}

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error('AccordionTrigger/AccordionContent must be used within an AccordionItem');
  }
  return context;
}

interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
}

export function Accordion({
  type = 'single',
  defaultValue = [],
  children,
  className = '',
  collapsible = true,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
  );

  const toggleItem = (value: string) => {
    if (type === 'single') {
      if (collapsible) {
        setOpenItems((prev) => (prev.includes(value) ? [] : [value]));
      } else {
        setOpenItems([value]);
      }
    } else {
      setOpenItems((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      );
    }
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={`divide-y divide-[var(--color-line)] ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function AccordionItem({ value, children, className = '' }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={className}>{children}</div>
    </AccordionItemContext.Provider>
  );
}

interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function AccordionTrigger({
  children,
  className = '',
  icon,
}: AccordionTriggerProps) {
  const { openItems, toggleItem } = useAccordionContext();
  const { value } = useAccordionItemContext();
  const isOpen = openItems.includes(value);

  return (
    <button
      type="button"
      onClick={() => toggleItem(value)}
      className={`
        flex items-center justify-between w-full
        py-4 text-left
        text-sm font-medium tracking-[var(--letter-spacing-wide)] uppercase
        text-[var(--color-title-active)]
        hover:text-[var(--color-accent)]
        transition-colors duration-200
        ${className}
      `}
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown size={18} />
      </motion.div>
    </button>
  );
}

interface AccordionContentProps {
  children: ReactNode;
  className?: string;
}

export function AccordionContent({
  children,
  className = '',
}: AccordionContentProps) {
  const { openItems } = useAccordionContext();
  const { value } = useAccordionItemContext();
  const isOpen = openItems.includes(value);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className={`pb-4 text-sm text-[var(--color-text-body)] ${className}`}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Accordion;
