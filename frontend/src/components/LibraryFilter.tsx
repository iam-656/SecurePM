import React from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface LibraryFilterProps {
  search: string;
  onSearchChange: (search: string) => void;
  fileType: string;
  onFileTypeChange: (fileType: string) => void;
  source: string;
  onSourceChange: (source: string) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const LibraryFilter: React.FC<LibraryFilterProps> = ({
  search,
  onSearchChange,
  fileType,
  onFileTypeChange,
  source,
  onSourceChange,
  sortBy,
  onSortByChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  const fileTypeOptions = [
    { label: 'All Types', value: 'all' },
    { label: 'Documents', value: 'document' },
    { label: 'Images', value: 'image' },
    { label: 'Archives', value: 'archive' },
    { label: 'Other', value: 'other' },
  ];

  const sourceOptions = [
    { label: 'All Sources', value: 'all' },
    { label: 'Direct Uploads', value: 'direct' },
    { label: 'From Tasks', value: 'task' },
    { label: 'Forwarded Files', value: 'forwarded' },
  ];

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      {/* Top Row: Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search library files by name..."
            className="w-full pl-10 pr-9 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
            >
              <option value="newest">Newest Uploads</option>
              <option value="oldest">Oldest Uploads</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="size_asc">Size (Smallest)</option>
              <option value="size_desc">Size (Largest)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-950/60 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/40 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Filter Pills */}
      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-800/60">
        {/* File Type Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            Type:
          </span>
          {fileTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFileTypeChange(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                fileType === opt.value
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-950/50 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Source Filter */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto sm:ml-0">
          <span className="text-xs font-medium text-slate-400 mr-1">Source:</span>
          {sourceOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSourceChange(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                source === opt.value
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'bg-slate-950/50 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
