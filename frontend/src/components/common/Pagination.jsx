import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
}) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-white text-xs sm:text-sm text-slate-600 rounded-b-xl">
      <div>
        Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span> entries
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="px-2 font-medium">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
