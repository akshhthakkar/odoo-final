import { useState, useMemo, useEffect } from 'react';

/**
 * Reusable client-side / server-side pagination hook.
 * 
 * @param {Array|number} itemsOrCount - Array of items to paginate or total count number
 * @param {Object} options
 * @param {number} [options.initialPage=1] - Starting page number
 * @param {number} [options.initialPageSize=5] - Default items per page
 * @param {Array} [options.resetDeps=[]] - Dependencies that should reset page back to 1 (e.g. [searchQuery, filter])
 */
export function usePagination(itemsOrCount, { initialPage = 1, initialPageSize = 5, resetDeps = [] } = {}) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Reset to page 1 whenever filter/search dependencies change
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const isArray = Array.isArray(itemsOrCount);
  const totalItems = isArray ? itemsOrCount.length : Number(itemsOrCount) || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is within valid range
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    if (!isArray) return [];
    const start = (safeCurrentPage - 1) * pageSize;
    return itemsOrCount.slice(start, start + pageSize);
  }, [isArray, itemsOrCount, safeCurrentPage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalItems, safeCurrentPage * pageSize);

  const handlePageChange = (page) => {
    const p = Math.min(Math.max(1, Number(page)), totalPages);
    setCurrentPage(p);
  };

  const handlePageSizeChange = (newSize) => {
    const size = Number(newSize) || 5;
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    currentPage: safeCurrentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
  };
}
