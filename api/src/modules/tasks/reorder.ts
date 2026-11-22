import type { TaskStatus } from '@/common/contract';

export interface TaskPlacement {
  id: string;
  status: TaskStatus;
  position: number;
}

/**
 * Computes the placements that change when `taskId` is moved to `targetStatus` at
 * `targetPosition`. Columns are dense 0-based lists: the gap left in the origin column
 * is closed, a slot is opened in the destination, and a position outside the destination
 * (negative or past the end) puts the task at the end. Tasks that keep their placement
 * are not returned, so an unchanged move yields an empty list.
 */
export function reorderTasks(
  tasks: readonly TaskPlacement[],
  taskId: string,
  targetStatus: TaskStatus,
  targetPosition: number,
): TaskPlacement[] {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) throw new Error(`Task ${taskId} is not part of the given tasks`);

  const column = (status: TaskStatus): TaskPlacement[] =>
    tasks
      .filter((task) => task.status === status && task.id !== taskId)
      .sort((a, b) => a.position - b.position);

  const destination = column(targetStatus);
  const insertAt =
    targetPosition >= 0 && targetPosition <= destination.length
      ? targetPosition
      : destination.length;
  destination.splice(insertAt, 0, { id: taskId, status: targetStatus, position: insertAt });

  const reindexed = new Map<string, TaskPlacement>();
  const columns =
    moving.status === targetStatus ? [destination] : [column(moving.status), destination];
  for (const list of columns) {
    list.forEach((task, index) => {
      reindexed.set(task.id, {
        id: task.id,
        status: list === destination ? targetStatus : task.status,
        position: index,
      });
    });
  }

  const original = new Map(tasks.map((task) => [task.id, task]));
  return [...reindexed.values()].filter((next) => {
    const before = original.get(next.id);
    return before?.status !== next.status || before.position !== next.position;
  });
}
