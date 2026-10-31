import React from 'react'

export function SkeletonLoader({ rows = 5, cols = 4, type = 'table' }) {
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 h-32 flex flex-col justify-between">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-100 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 space-y-4 animate-pulse">
      <div className="h-10 bg-slate-100 rounded-lg w-full mb-6"></div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-4 bg-slate-200 rounded flex-1"
              style={{ opacity: 1 - c * 0.15 }}
            ></div>
          ))}
        </div>
      ))}
    </div>
  )
}
