'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPrevNext?: boolean;
  maxVisiblePages?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  showPrevNext = true,
  maxVisiblePages = 5,
}: PaginationProps) {
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - halfVisible);
    let end = Math.min(totalPages, currentPage + halfVisible);

    if (currentPage <= halfVisible) {
      end = maxVisiblePages - 1;
    } else if (currentPage >= totalPages - halfVisible) {
      start = totalPages - maxVisiblePages + 2;
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('ellipsis');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  if (totalPages <= 1) return null;

  return (
    <nav
      className={`flex items-center justify-center gap-1 ${className}`}
      aria-label="Pagination"
    >
      {showPrevNext && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            flex items-center gap-1 px-3 py-2
            text-sm font-medium
            rounded-[var(--radius-md)]
            transition-colors duration-200
            ${currentPage === 1
              ? 'text-[var(--color-text-placeholder)] cursor-not-allowed'
              : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
            }
          `}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>
      )}

      <div className="flex items-center gap-1">
        {visiblePages.map((page, index) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-3 py-2 text-[var(--color-text-placeholder)]"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`
                min-w-[40px] h-10 px-3
                text-sm font-medium
                rounded-[var(--radius-md)]
                transition-colors duration-200
                ${currentPage === page
                  ? 'bg-[var(--color-bg-inverse)] text-[var(--color-text-inverse)]'
                  : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
                }
              `}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>

      {showPrevNext && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            flex items-center gap-1 px-3 py-2
            text-sm font-medium
            rounded-[var(--radius-md)]
            transition-colors duration-200
            ${currentPage === totalPages
              ? 'text-[var(--color-text-placeholder)] cursor-not-allowed'
              : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
            }
          `}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      )}
    </nav>
  );
}

export default Pagination;
