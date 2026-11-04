import type { Lesson, LessonExtras } from "./curriculum";
import * as python from "./content/python";
import * as javascript from "./content/javascript";
import * as html from "./content/html";
import * as css from "./content/css";
import * as java from "./content/java";
import * as cpp from "./content/cpp";

type ContentModule = {
  newLessons: Lesson[];
  extras: Record<string, LessonExtras>;
};

const modules: Record<string, ContentModule> = {
  python,
  javascript,
  html,
  css,
  java,
  cpp,
};

export const extraLessons: Record<string, Lesson[]> = {};
export const lessonExtras: Record<string, LessonExtras> = {};

for (const [languageId, content] of Object.entries(modules)) {
  extraLessons[languageId] = content.newLessons;
  for (const [lessonId, extra] of Object.entries(content.extras)) {
    lessonExtras[`${languageId}:${lessonId}`] = extra;
  }
}
