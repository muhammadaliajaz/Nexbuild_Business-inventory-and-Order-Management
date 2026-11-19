import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  lastPage,
  total,
  onPageChange,
}) => {
  if (lastPage <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 px-4 py-3 bg-white border-t border-slate-200">
      <div className="text-xs sm:text-sm text-slate-600">
        Total <span className="font-semibold text-slate-900">{total}</span> records
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 mr-0.5 sm:mr-1" /> Prev
        </button>
        <span className="text-xs sm:text-sm font-medium text-slate-700 px-1.5 sm:px-2 whitespace-nowrap">
          Page {currentPage} of {lastPage}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className="inline-flex items-center px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Next <ChevronRight className="w-4 h-4 ml-0.5 sm:ml-1" />
        </button>
      </div>
    </div>
  );
};
