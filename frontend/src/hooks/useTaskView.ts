import { useState } from 'react';

export type TaskViewMode = 'kanban' | 'list' | 'subprojects' | 'library';

export const useTaskView = (initialMode: TaskViewMode = 'kanban') => {
  const [viewMode, setViewMode] = useState<TaskViewMode>(initialMode);

  const toggleView = () => {
    setViewMode((prev) => (prev === 'kanban' ? 'list' : 'kanban'));
  };

  return {
    viewMode,
    setViewMode,
    toggleView,
    isKanban: viewMode === 'kanban',
    isList: viewMode === 'list',
    isSubprojects: viewMode === 'subprojects',
    isLibrary: viewMode === 'library',
  };
};

export default useTaskView;
