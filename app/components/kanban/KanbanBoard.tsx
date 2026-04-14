"use client";

import { useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
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

const COLUMN_DOT: Record<ProjectStatus, string> = {
  todo: "bg-studio-500",
  "in-progress": "bg-accent-blue",
  blocked: "bg-accent-red",
  done: "bg-accent-green",
};

const EMPTY_TASKS: Task[] = [];

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
  const visibleColumns = filter === "all" ? COLUMNS : COLUMNS.filter((c) => c.status === filter);

  const filtered = filterBySearch(projects, tasks, searchQuery);

  // Build a Map<projectId, Task[]> once per render for O(1) task lookups instead of O(P×T) per-column filter.
  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const list = map.get(task.projectId);
      if (list) list.push(task);
      else map.set(task.projectId, [task]);
    }
    return map;
  }, [tasks]);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    onReorder(draggableId, destination.droppableId as ProjectStatus, destination.index);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={`grid h-full min-h-0 gap-4 ${filter === "all" ? "grid-cols-4" : "max-w-[420px] grid-cols-1"}`}>
        {visibleColumns.map(({ status, label }) => {
          const columnProjects = sortProjects(
            filtered.filter((p) => p.status === status),
            tasks,
            sortBy
          );

          return (
            <section key={status} className="console-surface-soft flex min-h-0 min-w-0 flex-col overflow-hidden p-3">
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-studio-750/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`} />
                  <h2 className="text-xxs font-semibold uppercase tracking-widest text-studio-500">{label}</h2>
                  <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-medium text-studio-500">
                    {columnProjects.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onAddProject(status)}
                  aria-label={`Add project to ${label}`}
                  className="rounded-badge p-1 text-studio-500 transition-colors hover:bg-studio-800 hover:text-studio-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>

              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    role="region"
                    tabIndex={0}
                    aria-label={`${label} projects lane`}
                    className={`min-h-[60px] flex-1 space-y-2.5 overflow-y-auto pr-1 transition-colors duration-200 ${
                      snapshot.isDraggingOver
                        ? "rounded-card border border-dashed border-accent-blue/20 bg-accent-blue/5 p-1"
                        : ""
                    }`}
                  >
                    {columnProjects.length === 0 && !snapshot.isDraggingOver ? (
                      <div className="flex h-full min-h-[120px] items-center justify-center rounded-card border border-dashed border-studio-750/70 bg-studio-950/25 px-4 text-center">
                        <p className="text-xs italic text-studio-500">No projects in this lane</p>
                      </div>
                    ) : (
                      columnProjects.map((project, index) => (
                        <Draggable key={project.id} draggableId={project.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={
                                snapshot.isDragging ? "rotate-[1deg] scale-[1.02] opacity-95 shadow-modal" : ""
                              }
                            >
                              <ProjectCard
                                project={project}
                                tasks={tasksByProject.get(project.id) ?? EMPTY_TASKS}
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
            </section>
          );
        })}
      </div>
    </DragDropContext>
  );
}
