"use client";

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

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    onReorder(draggableId, destination.droppableId as ProjectStatus, destination.index);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={`grid h-full gap-6 ${filter === "all" ? "grid-cols-4" : "max-w-sm grid-cols-1"}`}>
        {visibleColumns.map(({ status, label }) => {
          const columnProjects = sortProjects(
            filtered.filter((p) => p.status === status),
            tasks,
            sortBy
          );
          const columnTasks = (projectId: string) => tasks.filter((t) => t.projectId === projectId);

          return (
            <div key={status} className="flex min-w-0 flex-col pt-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`} />
                  <h2 className="text-xxs font-semibold uppercase tracking-widest text-studio-500">{label}</h2>
                  <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-micro font-medium text-studio-500">
                    {columnProjects.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddProject(status)}
                  className="rounded-badge p-1 text-studio-600 transition-colors hover:bg-studio-800 hover:text-studio-300"
                  title={`Add project to ${label}`}
                >
                  <Plus size={14} />
                </button>
              </div>

              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[60px] flex-1 space-y-3 rounded-card transition-colors duration-200 ${
                      snapshot.isDraggingOver ? "border border-dashed border-accent-blue/20 bg-accent-blue/5" : ""
                    }`}
                  >
                    {columnProjects.length === 0 && !snapshot.isDraggingOver ? (
                      <p className="text-xxs italic text-studio-600">No projects</p>
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
