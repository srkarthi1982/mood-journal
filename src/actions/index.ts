import type { ActionAPIContext } from "astro:actions";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import {
  MoodJournalEntries,
  MoodPrompts,
  and,
  db,
  desc,
  eq,
  or,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createEntry: defineAction({
    input: z.object({
      entryDate: z.string().date().optional(),
      moodScore: z.number().int().min(1).max(10).nullable().optional(),
      moodLabel: z.string().min(1).max(50).nullable().optional(),
      tags: z.string().min(1).max(255).nullable().optional(),
      title: z.string().min(1).max(120).nullable().optional(),
      body: z.string().min(1).nullable().optional(),
      promptId: z.string().min(1).nullable().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const entry = {
        id: crypto.randomUUID(),
        userId: user.id,
        entryDate: input.entryDate ? new Date(input.entryDate) : now,
        moodScore: input.moodScore ?? null,
        moodLabel: input.moodLabel ?? null,
        tags: input.tags ?? null,
        title: input.title ?? null,
        body: input.body ?? null,
        promptId: input.promptId ?? null,
        createdAt: now,
        updatedAt: now,
      } satisfies typeof MoodJournalEntries.$inferInsert;

      await db.insert(MoodJournalEntries).values(entry);

      return {
        success: true,
        data: { entry },
      };
    },
  }),

  updateEntry: defineAction({
    input: z.object({
      id: z.string().min(1),
      entryDate: z.string().date().optional(),
      moodScore: z.number().int().min(1).max(10).nullable().optional(),
      moodLabel: z.string().min(1).max(50).nullable().optional(),
      tags: z.string().min(1).max(255).nullable().optional(),
      title: z.string().min(1).max(120).nullable().optional(),
      body: z.string().min(1).nullable().optional(),
      promptId: z.string().min(1).nullable().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const entry = (
        await db
          .select()
          .from(MoodJournalEntries)
          .where(
            and(
              eq(MoodJournalEntries.id, input.id),
              eq(MoodJournalEntries.userId, user.id),
            ),
          )
      )[0];

      if (!entry) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Entry not found.",
        });
      }

      const updateData: Partial<typeof MoodJournalEntries.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.entryDate) {
        updateData.entryDate = new Date(input.entryDate);
      }

      if (Object.hasOwn(input, "moodScore")) {
        updateData.moodScore = input.moodScore ?? null;
      }

      if (Object.hasOwn(input, "moodLabel")) {
        updateData.moodLabel = input.moodLabel ?? null;
      }

      if (Object.hasOwn(input, "tags")) {
        updateData.tags = input.tags ?? null;
      }

      if (Object.hasOwn(input, "title")) {
        updateData.title = input.title ?? null;
      }

      if (Object.hasOwn(input, "body")) {
        updateData.body = input.body ?? null;
      }

      if (Object.hasOwn(input, "promptId")) {
        updateData.promptId = input.promptId ?? null;
      }

      await db
        .update(MoodJournalEntries)
        .set(updateData)
        .where(
          and(
            eq(MoodJournalEntries.id, input.id),
            eq(MoodJournalEntries.userId, user.id),
          ),
        );

      return {
        success: true,
        data: { id: input.id },
      };
    },
  }),

  deleteEntry: defineAction({
    input: z.object({
      id: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const existing = (
        await db
          .select({ id: MoodJournalEntries.id })
          .from(MoodJournalEntries)
          .where(
            and(
              eq(MoodJournalEntries.id, input.id),
              eq(MoodJournalEntries.userId, user.id),
            ),
          )
      )[0];

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Entry not found.",
        });
      }

      await db
        .delete(MoodJournalEntries)
        .where(
          and(
            eq(MoodJournalEntries.id, input.id),
            eq(MoodJournalEntries.userId, user.id),
          ),
        );

      return {
        success: true,
      };
    },
  }),

  getEntry: defineAction({
    input: z.object({
      id: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const entry = (
        await db
          .select()
          .from(MoodJournalEntries)
          .where(
            and(
              eq(MoodJournalEntries.id, input.id),
              eq(MoodJournalEntries.userId, user.id),
            ),
          )
      )[0];

      if (!entry) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Entry not found.",
        });
      }

      return {
        success: true,
        data: { entry },
      };
    },
  }),

  listEntries: defineAction({
    input: z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const offset = (input.page - 1) * input.pageSize;

      const [entries, total] = await Promise.all([
        db
          .select()
          .from(MoodJournalEntries)
          .where(eq(MoodJournalEntries.userId, user.id))
          .orderBy(desc(MoodJournalEntries.entryDate))
          .limit(input.pageSize)
          .offset(offset),
        db
          .select({ id: MoodJournalEntries.id })
          .from(MoodJournalEntries)
          .where(eq(MoodJournalEntries.userId, user.id)),
      ]);

      return {
        success: true,
        data: {
          items: entries,
          total: total.length,
          page: input.page,
          pageSize: input.pageSize,
        },
      };
    },
  }),

  createPrompt: defineAction({
    input: z.object({
      title: z.string().min(1).max(120),
      promptText: z.string().min(1),
      category: z.string().min(1).max(80).nullable().optional(),
      isActive: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const prompt = {
        id: crypto.randomUUID(),
        userId: user.id,
        title: input.title,
        promptText: input.promptText,
        category: input.category ?? null,
        isSystem: false,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      } satisfies typeof MoodPrompts.$inferInsert;

      await db.insert(MoodPrompts).values(prompt);

      return {
        success: true,
        data: { prompt },
      };
    },
  }),

  updatePrompt: defineAction({
    input: z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(120).optional(),
      promptText: z.string().min(1).optional(),
      category: z.string().min(1).max(80).nullable().optional(),
      isActive: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const prompt = (
        await db
          .select()
          .from(MoodPrompts)
          .where(
            and(
              eq(MoodPrompts.id, input.id),
              eq(MoodPrompts.userId, user.id),
            ),
          )
      )[0];

      if (!prompt) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Prompt not found.",
        });
      }

      const updateData: Partial<typeof MoodPrompts.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.title) {
        updateData.title = input.title;
      }

      if (input.promptText) {
        updateData.promptText = input.promptText;
      }

      if (Object.hasOwn(input, "category")) {
        updateData.category = input.category ?? null;
      }

      if (Object.hasOwn(input, "isActive")) {
        updateData.isActive = input.isActive;
      }

      await db
        .update(MoodPrompts)
        .set(updateData)
        .where(
          and(
            eq(MoodPrompts.id, input.id),
            eq(MoodPrompts.userId, user.id),
          ),
        );

      return {
        success: true,
        data: { id: input.id },
      };
    },
  }),

  listPrompts: defineAction({
    input: z.object({
      includeInactive: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const ownershipFilter = or(
        eq(MoodPrompts.userId, user.id),
        eq(MoodPrompts.userId, null),
      );
      const activeFilter = eq(MoodPrompts.isActive, true);
      const combinedFilter = input.includeInactive
        ? ownershipFilter
        : and(activeFilter, ownershipFilter);

      const prompts = await db
        .select()
        .from(MoodPrompts)
        .where(combinedFilter)
        .orderBy(desc(MoodPrompts.createdAt));

      return {
        success: true,
        data: {
          items: prompts,
          total: prompts.length,
        },
      };
    },
  }),
};
