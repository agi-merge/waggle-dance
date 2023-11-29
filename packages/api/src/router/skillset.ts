import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const createSkillSetShape = z.object({
  label: z.string().nonempty(),
  description: z.string(),
  isRecommended: z.boolean(),
  index: z.number(),
});

export const skillsetRouter = createTRPCRouter({
  // Create a new skillset
  create: protectedProcedure
    .input(createSkillSetShape)
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user?.id;

      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.db.skillset.create({
        data: {
          ...input,
          userSkillsets: {
            create: {
              userId,
            },
          },
        },
      });
    }),

  // Get a skillset by id
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.skillset.findUnique({
        where: { id: input.id },
        include: {
          skills: true,
        },
      });
    }),

  // Update a skillset
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        label: z.string().nonempty(),
        description: z.string(),
        isRecommended: z.boolean(),
        index: z.number(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user?.id;

      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.db.skillset.update({
        where: { id: input.id },
        data: input,
      });
    }),

  // Delete a skillset
  delete: protectedProcedure
    .input(z.string().nonempty())
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user?.id;

      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.db.skillset.delete({ where: { id: input } });
    }),
  // Add a skill to a skillset
  addSkill: protectedProcedure
    .input(
      z.object({
        skillsetId: z.string(),
        skillId: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.skill.update({
        where: { id: input.skillId },
        data: { skillsetId: input.skillsetId },
      });
    }),

  // Remove a skill from a skillset
  removeSkill: protectedProcedure
    .input(
      z.object({
        skillsetId: z.string(),
        skillId: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.skill.delete({
        where: {
          skillsetId: input.skillsetId,
          id: input.skillId,
        },
      });
    }),
});
