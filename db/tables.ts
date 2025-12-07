/**
 * Mood Journal - log daily mood and reflections.
 *
 * Design goals:
 * - Simple daily entries with mood score + notes.
 * - Optional prompts so the app can suggest journaling questions.
 */

import { defineTable, column, NOW } from "astro:db";

export const MoodJournalEntries = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    entryDate: column.date({ default: NOW }),        // logical date of entry
    moodScore: column.number({ optional: true }),    // 1-10 scale
    moodLabel: column.text({ optional: true }),      // "happy", "stressed", "calm"
    tags: column.text({ optional: true }),           // comma-separated or JSON labels
    title: column.text({ optional: true }),
    body: column.text({ optional: true }),           // free-form journal text

    promptId: column.text({ optional: true }),       // reference to a prompt (if used)
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const MoodPrompts = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    // userId optional: null/system = global prompt
    userId: column.text({ optional: true }),

    title: column.text(),                            // "Gratitude check-in"
    promptText: column.text(),                       // actual question/prompt
    category: column.text({ optional: true }),       // "gratitude", "reflection", "stress"
    isSystem: column.boolean({ default: false }),
    isActive: column.boolean({ default: true }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const tables = {
  MoodJournalEntries,
  MoodPrompts,
} as const;
