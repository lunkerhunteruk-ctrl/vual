'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Plus, X, Ruler } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SizeSpecTableProps {
  specs: SizeSpec;
  onChange: (specs: SizeSpec) => void;
}

export interface SizeSpec {
  columns: string[]; // 身幅, 肩幅, 着丈, etc.
  rows: SizeRow[];
}

interface SizeRow {
  size: string; // 36, 38, S, M, L, etc.
  values: Record<string, string>; // { '身幅': '50', '肩幅': '39', ... }
}

const defaultColumns = ['身幅', '肩幅', '着丈', 'そで丈'];
const defaultSizes = ['S', 'M', 'L'];

export function SizeSpecTable({ specs, onChange }: SizeSpecTableProps) {
  const locale = useLocale();
  const [newColumnName, setNewColumnName] = useState('');
  const [newSizeName, setNewSizeName] = useState('');

  // Initialize with defaults if empty
  const columns = specs.columns.length > 0 ? specs.columns : [];
  const rows = specs.rows;

  const addColumn = () => {
    if (!newColumnName.trim()) return;
    const updatedColumns = [...columns, newColumnName.trim()];
    const updatedRows = rows.map(row => ({
      ...row,
      values: { ...row.values, [newColumnName.trim()]: '' }
    }));
    onChange({ columns: updatedColumns, rows: updatedRows });
    setNewColumnName('');
  };

  const removeColumn = (colName: string) => {
    const updatedColumns = columns.filter(c => c !== colName);
    const updatedRows = rows.map(row => {
      const newValues = { ...row.values };
      delete newValues[colName];
      return { ...row, values: newValues };
    });
    onChange({ columns: updatedColumns, rows: updatedRows });
  };

  const addRow = () => {
    if (!newSizeName.trim()) return;
    const newRow: SizeRow = {
      size: newSizeName.trim(),
      values: columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {})
    };
    onChange({ columns, rows: [...rows, newRow] });
    setNewSizeName('');
  };

  const removeRow = (index: number) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    onChange({ columns, rows: updatedRows });
  };

  const updateCell = (rowIndex: number, colName: string, value: string) => {
    const updatedRows = rows.map((row, i) => {
      if (i === rowIndex) {
        return { ...row, values: { ...row.values, [colName]: value } };
      }
      return row;
    });
    onChange({ columns, rows: updatedRows });
  };

  const updateSizeName = (rowIndex: number, newName: string) => {
    const updatedRows = rows.map((row, i) => {
      if (i === rowIndex) {
        return { ...row, size: newName };
      }
      return row;
    });
    onChange({ columns, rows: updatedRows });
  };

  const addDefaultTemplate = () => {
    const defaultRows: SizeRow[] = defaultSizes.map(size => ({
      size,
      values: defaultColumns.reduce((acc, col) => ({ ...acc, [col]: '' }), {})
    }));
    onChange({ columns: defaultColumns, rows: defaultRows });
  };

  const hasData = columns.length > 0 || rows.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide flex items-center gap-2">
          <Ruler size={16} />
          {locale === 'ja' ? 'サイズスペック' : 'Size Specifications'}
        </h3>
        {!hasData && (
          <button
            onClick={addDefaultTemplate}
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            {locale === 'ja' ? 'テンプレートを使用' : 'Use Template'}
          </button>
        )}
      </div>

      {!hasData ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Ruler size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-4">
            {locale === 'ja' ? 'サイズスペック表を作成してください' : 'Create a size specification table'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={addDefaultTemplate}
              className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90"
            >
              {locale === 'ja' ? 'テンプレートから作成' : 'Create from Template'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-600 w-24">
                    {locale === 'ja' ? 'サイズ' : 'Size'}
                  </th>
                  {columns.map((col) => (
                    <th key={col} className="border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-600 min-w-[80px] relative group">
                      <span>{col}</span>
                      <button
                        onClick={() => removeColumn(col)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X size={10} />
                      </button>
                    </th>
                  ))}
                  <th className="border border-gray-200 px-2 py-2 w-20">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                        placeholder={locale === 'ja' ? '項目名' : 'Name'}
                        className="w-full text-sm px-2 py-1 border border-gray-200 rounded text-center"
                      />
                      <button
                        onClick={addColumn}
                        disabled={!newColumnName.trim()}
                        className="p-1 text-gray-400 hover:text-[var(--color-accent)] disabled:opacity-30"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {rows.map((row, rowIndex) => (
                    <motion.tr
                      key={rowIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group"
                    >
                      <td className="border border-gray-200 px-3 py-2 relative">
                        <input
                          type="text"
                          value={row.size}
                          onChange={(e) => updateSizeName(rowIndex, e.target.value)}
                          className="w-full text-sm font-medium text-gray-700 bg-transparent focus:outline-none focus:bg-gray-50 rounded px-1"
                        />
                        <button
                          onClick={() => removeRow(rowIndex)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X size={10} />
                        </button>
                      </td>
                      {columns.map((col) => (
                        <td key={col} className="border border-gray-200 px-2 py-2">
                          <input
                            type="text"
                            value={row.values[col] || ''}
                            onChange={(e) => updateCell(rowIndex, col, e.target.value)}
                            placeholder="-"
                            className="w-full text-sm text-center text-gray-700 bg-transparent focus:outline-none focus:bg-gray-50 rounded px-1"
                          />
                        </td>
                      ))}
                      <td className="border border-gray-200"></td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {/* Add Row */}
                <tr>
                  <td className="border border-gray-200 px-2 py-2" colSpan={columns.length + 2}>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newSizeName}
                        onChange={(e) => setNewSizeName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addRow()}
                        placeholder={locale === 'ja' ? '新しいサイズ (例: XL, 40)' : 'New size (e.g., XL, 40)'}
                        className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded"
                      />
                      <button
                        onClick={addRow}
                        disabled={!newSizeName.trim()}
                        className="px-3 py-1.5 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors disabled:opacity-30"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-400">
            {locale === 'ja'
              ? '※ 単位はcmで入力してください。項目名やサイズ名は自由に変更できます。'
              : '* Enter values in cm. Column and size names can be customized.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default SizeSpecTable;
