import { request } from "./api";
export type Problem = {
  id: string;
  lessonId: string | null;
  title: string;
  statement: string;
  difficulty: string;
  language: string;
  topicSlug: string;
  functionName: string;
  starterCode: string;
  rewardXp: number;
  rewardCoins: number;
  examples: { args: unknown[]; expected: unknown }[];
};
export type Course = {
  id: string;
  title: string;
  language: string;
  topics: {
    id: string;
    title: string;
    lessons: { id: string; title: string }[];
  }[];
};
export type Lesson = {
  id: string;
  title: string;
  theoryMd: string;
  problems: Pick<Problem, "id" | "title" | "starterCode" | "difficulty">[];
};
export type Progress = {
  lessons: { lessonId: string; state: string }[];
  completedProblems: { problemId: string }[];
};
export type Exercise = {
  id: string;
  title: string;
  description: string;
  templateCode?: string;
  rewardXp: number;
  rewardCoins: number;
};
export type Verdict = {
  status: string;
  passedCases: number;
  totalCases: number;
  rewarded: boolean;
  earnedXp: number;
  earnedCoins: number;
};
export const courses = () =>
  request<{ courses: Course[] }>("/learning/courses");
export const lesson = (id: string) =>
  request<{ lesson: Lesson }>(`/learning/lessons/${encodeURIComponent(id)}`);
export const startLesson = (id: string) =>
  request(`/learning/lessons/${encodeURIComponent(id)}/start`, {
    method: "POST",
  });
export const progress = () => request<Progress>("/learning/progress");
export const problems = () => request<{ problems: Problem[] }>("/problems");
export const problem = (id: string) =>
  request<{ problem: Problem }>(`/problems/${encodeURIComponent(id)}`);
export const submit = (id: string, code: string) =>
  request<Verdict>(`/problems/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    body: { code },
    timeoutMs: 180000,
  });
export const copies = () =>
  request<{ exercises: Exercise[] }>("/copy-exercises");
export const copy = (id: string) =>
  request<{ exercise: Exercise }>(`/copy-exercises/${encodeURIComponent(id)}`);
export const copyProgress = () =>
  request<{ completed: { exerciseId: string }[] }>("/copy-exercises/progress");
export const submitCopy = (id: string, code: string) =>
  request<{
    isExact: boolean;
    rewarded: boolean;
    earnedXp: number;
    earnedCoins: number;
  }>(`/copy-exercises/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    body: { code },
  });
