import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Pagination.scss';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 5,
  startIndex = 1,
  endIndex = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  itemLabel = 'items',
  showPageSizeSelector = true,
  className = '',
}) {
  if (totalItems <= 0) return null;

  const validTotalPages = Math.max(1, totalPages || 1);

  // Generate page numbers with smart ellipsis (e.g. [1, '...', 4, 5, 6, '...', 12])
  const getPageNumbers = () => {
    const delta = 1; // Number of pages to show around current page
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= validTotalPages; i++) {
      if (
        i === 1 ||
        i === validTotalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    let l;
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots.length > 0 ? rangeWithDots : [1];
  };

  const pages = getPageNumbers();
  const calculatedStart = startIndex || (totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0);
  const calculatedEnd = endIndex || Math.min(totalItems, currentPage * pageSize);

  return (
    <div className={`ui-pagination ${className}`}>
      {/* Left side: Results Count & Page Size Selector */}
      <div className="ui-pagination__info">
        <span className="ui-pagination__count-text">
          Showing <strong className="ui-pagination__bold">{calculatedStart}–{calculatedEnd}</strong> of{' '}
          <strong className="ui-pagination__bold">{totalItems}</strong> {itemLabel}
        </span>

        {showPageSizeSelector && onPageSizeChange && (
          <div className="ui-pagination__per-page">
            <span className="ui-pagination__per-page-label">Per page:</span>
            <select
              className="ui-pagination__select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation Controls (Always visible) */}
      <div className="ui-pagination__nav">
        {/* First Page */}
        <button
          type="button"
          className="ui-pagination__btn ui-pagination__btn--icon"
          onClick={() => onPageChange && onPageChange(1)}
          disabled={currentPage <= 1 || validTotalPages <= 1}
          title="First Page"
          aria-label="First page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          className="ui-pagination__btn ui-pagination__btn--prev"
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || validTotalPages <= 1}
          title="Previous Page"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span className="ui-pagination__btn-text">Prev</span>
        </button>

        {/* Page Number Chips */}
        <div className="ui-pagination__pages">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="ui-pagination__ellipsis">
                  …
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                className={`ui-pagination__page-chip ${isCurrent ? 'ui-pagination__page-chip--active' : ''}`}
                onClick={() => onPageChange && onPageChange(p)}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          className="ui-pagination__btn ui-pagination__btn--next"
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          disabled={currentPage >= validTotalPages || validTotalPages <= 1}
          title="Next Page"
          aria-label="Next page"
        >
          <span className="ui-pagination__btn-text">Next</span>
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          className="ui-pagination__btn ui-pagination__btn--icon"
          onClick={() => onPageChange && onPageChange(validTotalPages)}
          disabled={currentPage >= validTotalPages || validTotalPages <= 1}
          title="Last Page"
          aria-label="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
