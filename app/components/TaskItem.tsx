import type { Task } from "@/lib/types";
import Timer from "./Timer";

interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={`text-gray-300 truncate mr-2 ${task.isRunning ? "text-white" : ""}`}>
        {task.isRunning && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
        )}
        {task.title}
      </span>
      <Timer
        isRunning={task.isRunning}
        totalSeconds={task.totalSeconds}
        lastStarted={task.lastStarted}
      />
    </div>
  );
}
