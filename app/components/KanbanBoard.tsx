"use client";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { Project, Task, ProjectStatus, ViewFilter, SortOption } from "@/lib/types";
import ProjectCard from "./ProjectCard";

interface KanbanBoardProps {
  projects: Project[];
  tasks: Task[];
  filter: ViewFilter;
  sortBy: SortOption;
  searchQuery: string;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  onAddProject: (status: ProjectStatus) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onOpenProject: (project: Project) => void;
  onAddTask: (projectId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onToggleTaskComplete: (task: Task) => void;
  onReorder: (projectId: string, newStatus: ProjectStatus, newIndex: number) => void;
}

const COLUMNS: { status: ProjectStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in-progress", label: "In Progress" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
];

const COLUMN_ACCENT: Record<ProjectStatus, string> = {
  todo: "border-gray-600",
  "in-progress": "border-blue-600",
  blocked: "border-red-600",
  done: "border-green-600",
};

function sortProjects(projects: Project[], tasks: Task[], sortBy: SortOption): Project[] {
  const sorted = [...projects];
  switch (sortBy) {
    case "priority": {
      const order = { p0: 0, p1: 1, p2: 2, p3: 3 };
      return sorted.sort((a, b) => order[a.priority] - order[b.priority]);
    }
    case "date":
      return sorted.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    case "name":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted.sort((a, b) => a.order - b.order);
  }
}

function filterBySearch(projects: Project[], tasks: Task[], query: string): Project[] {
  if (!query) return projects;
  const q = query.toLowerCase();
  return projects.filter((p) => {
    if (p.title.toLowerCase().includes(q)) return true;
    if (p.description.toLowerCase().includes(q)) return true;
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    return projectTasks.some(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.labels.some((l) => l.toLowerCase().includes(q))
    );
  });
}

export default function KanbanBoard({
  projects,
  tasks,
  filter,
  sortBy,
  searchQuery,
  selectedProjectId,
  selectedTaskId,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onOpenProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskComplete,
  onReorder,
}: KanbanBoardProps) {
  const visibleColumns =
    filter === "all" ? COLUMNS : COLUMNS.filter((c) => c.status === filter);

  const filtered = filterBySearch(projects, tasks, searchQuery);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    onReorder(
      draggableId,
      destination.droppableId as ProjectStatus,
      destination.index
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={`grid gap-6 h-full ${filter === "all" ? "grid-cols-4" : "grid-cols-1 max-w-sm"}`}>
        {visibleColumns.map(({ status, label }) => {
          const columnProjects = sortProjects(
            filtered.filter((p) => p.status === status),
            tasks,
            sortBy
          );
          const columnTasks = (projectId: string) =>
            tasks.filter((t) => t.projectId === projectId);

          return (
            <div key={status} className={`flex flex-col min-w-0 border-t-2 ${COLUMN_ACCENT[status]} pt-3`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    {label}
                  </h2>
                  <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">
                    {columnProjects.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddProject(status)}
                  className="text-gray-600 hover:text-gray-300 transition-colors"
                  title={`Add project to ${label}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 flex-1 min-h-[60px] rounded transition-colors ${
                      snapshot.isDraggingOver ? "bg-gray-800/50" : ""
                    }`}
                  >
                    {columnProjects.length === 0 && !snapshot.isDraggingOver ? (
                      <p className="text-xs text-gray-600 italic">No projects</p>
                    ) : (
                      columnProjects.map((project, index) => (
                        <Draggable key={project.id} draggableId={project.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? "opacity-90" : ""}
                            >
                              <ProjectCard
                                project={project}
                                tasks={columnTasks(project.id)}
                                isSelected={project.id === selectedProjectId}
                                selectedTaskId={selectedTaskId}
                                onEditProject={onEditProject}
                                onDeleteProject={onDeleteProject}
                                onOpenProject={onOpenProject}
                                onAddTask={onAddTask}
                                onEditTask={onEditTask}
                                onDeleteTask={onDeleteTask}
                                onToggleTaskComplete={onToggleTaskComplete}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
