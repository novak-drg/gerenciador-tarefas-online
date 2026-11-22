// Contract types, mirrored from docs/API.md. Keep in sync with that file.

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'; // A fazer | Em andamento | Concluído
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type MemberRole = 'OWNER' | 'MEMBER';

export type User = { id: string; name: string; email: string };

export type Member = { user: User; role: MemberRole; addedAt: string };

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  dueDate: string;
  role: MemberRole; // role of the person asking
  memberCount: number;
  taskCounts: { TODO: number; IN_PROGRESS: number; DONE: number };
  createdAt: string;
  updatedAt: string;
};

export type Project = ProjectSummary & { members: Member[] };

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number; // order inside the column, starts at 0
  dueDate: string | null;
  assignee: User | null;
  createdBy: User;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskWithProject = Task & { project: { id: string; name: string } };

export type CalendarEvent =
  | { kind: 'TASK'; date: string; task: TaskWithProject }
  | { kind: 'PROJECT_DEADLINE'; date: string; project: { id: string; name: string } };

export type DashboardSummary = {
  projectCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  dueThisWeekCount: number;
  upcoming: TaskWithProject[];
};

// Error body, same shape on every failure
export type ApiErrorDetail = { path: string; message: string };
export type ApiErrorBody = {
  statusCode: number;
  error: string;
  message: string;
  details?: ApiErrorDetail[];
};

// Request bodies
export type LoginBody = { email: string; password: string };
export type RegisterBody = { name: string; email: string; password: string };

export type CreateProjectBody = {
  name: string;
  description?: string;
  startDate: string;
  dueDate: string;
  memberIds?: string[];
};
export type UpdateProjectBody = {
  name?: string;
  description?: string | null;
  startDate?: string;
  dueDate?: string;
};

export type CreateTaskBody = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
  status?: TaskStatus;
};
export type UpdateTaskBody = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
};
export type MoveTaskBody = { status: TaskStatus; position: number };
