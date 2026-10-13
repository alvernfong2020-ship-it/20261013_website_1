import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { getProvider, extractJson, providerStatus, type LlmMessage } from "./provider";
import { buildSystemPrompt, buildUserPrompt, type GenerationInput } from "./prompt";
import { draftStorySchema, type DraftStory } from "./contract";
import { generateDemoDraft } from "./demo";
import { normalizeDraft, DEMO_NOTE } from "./normalize";
import { slugify } from "@/lib/utils";
import type { StoryDocument } from "@/lib/story/schema";
import type { JobStatus } from "@prisma/client";

/**
 * Generation workflow.
 *
 * Step 1  validate input
 * Step 2  create the job record
 * Step 3  normalise source content (URL / text / document already extracted)
 * Step 4  produce a narrative outline
 * Step 5  generate section-by-section content plan
 * Step 6  select layout patterns   } done by normalisation (sectionFromDraft)
 * Step 7  attach visual assets     } uses uploads the user supplied
 * Step 8  define animation settings}
 * Step 9  validate the document
 * Step 10 save the draft
 * Step 11 open the draft in the editor
 *
 * Steps run in-process and stream progress into the job row so the client can
 * poll. In a multi-instance deployment `runJob` should be dispatched to a
 * queue worker instead; the interface is designed for that.
 */

export const GENERATION_STEPS = [
  "Validating input",
  "Preparing content",
  "Planning story",
  "Generating sections",
  "Preparing visuals",
  "Saving draft",
] as const;

export type GenerationStep = (typeof GENERATION_STEPS)[number];

export type CreateJobParams = {
  workspaceId: string;
  userId: string;
  input: GenerationInput;
  cost: number;
};

const MAX_PROMPT = 8000;

export function validateGenerationInput(input: GenerationInput) {
  const prompt = (input.prompt || "").trim();
  const hasSource = Boolean(input.sourceText?.trim() || input.sourceUrl?.trim());
  if (prompt.length < 3 && !hasSource) {
    throw new HttpError(422, "Describe what you want to create, or provide some source content.", "empty_brief");
  }
  if (prompt.length > MAX_PROMPT) {
    throw new HttpError(422, `Keep the description under ${MAX_PROMPT} characters.`, "prompt_too_long");
  }
  if (input.sourceText && input.sourceText.length > 200_000) {
    throw new HttpError(422, "That source document is too large.", "source_too_large");
  }
}

export async function createJob(params: CreateJobParams) {
  validateGenerationInput(params.input);
  const demo = !providerStatus().configured;
  return prisma.generationJob.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      status: "QUEUED",
      step: GENERATION_STEPS[0],
      progress: 0,
      demo,
      creditsUsed: params.cost,
      input: params.input as object,
    },
  });
}

async function setStep(jobId: string, step: GenerationStep, index: number, status: JobStatus = "RUNNING") {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status, step, progress: Math.round(((index + 0.5) / GENERATION_STEPS.length) * 100) },
  }).catch(() => undefined);
}

/** Runs the plan with retry on recoverable provider errors. */
async function planWithRetry(input: GenerationInput, attempts = 2): Promise<{ draft: DraftStory; demo: boolean }> {
  const provider = getProvider();
  if (!provider) {
    return { draft: generateDemoDraft(input), demo: true };
  }

  const messages: LlmMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserPrompt(input) },
  ];

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const raw = await provider.complete({ messages, json: true, maxTokens: 4000, temperature: 0.7 });
      const parsed = draftStorySchema.safeParse(extractJson(raw));
      if (!parsed.success) {
        throw new Error(`Model output failed schema validation: ${parsed.error.issues[0]?.message}`);
      }
      return { draft: parsed.data, demo: false };
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        // Nudge the model to correct itself on the second attempt.
        messages.push({
          role: "assistant",
          content: `The previous attempt failed validation: ${(err as Error).message}. Returning corrected JSON only.`,
        });
        messages.push({ role: "user", content: "Return the corrected JSON object now. JSON only." });
      }
    }
  }
  throw new HttpError(
    502,
    `Generation failed after ${attempts} attempts: ${(lastError as Error)?.message ?? "unknown error"}`,
    "generation_failed",
  );
}

export type RunResult = { document: StoryDocument; demo: boolean };

/**
 * Executes the full pipeline and returns the produced document. Callers persist
 * the story; keeping persistence out of here makes the pipeline unit-testable.
 */
export async function runGeneration(
  input: GenerationInput,
  onStep?: (step: GenerationStep, index: number) => Promise<void> | void,
): Promise<RunResult> {
  await onStep?.("Validating input", 0);
  validateGenerationInput(input);

  await onStep?.("Preparing content", 1);
  const sourceText = [input.sourceText, input.brandNotes].filter(Boolean).join("\n\n").trim();
  const enriched: GenerationInput = {
    ...input,
    sourceText: sourceText || undefined,
    sourceUrl: input.sourceUrl || undefined,
  };

  await onStep?.("Planning story", 2);
  const { draft, demo } = await planWithRetry(enriched);

  await onStep?.("Generating sections", 3);
  const document = normalizeDraft(draft, {
    storyType: input.storyType,
    slugBase: input.prompt,
    description: draft.description,
  });

  // Attach visuals the user supplied (uploaded files or chosen assets).
  await onStep?.("Preparing visuals", 4);
  if (input.assetUrls?.length) {
    let i = 0;
    for (const section of document.sections) {
      if (
        ["hero", "fullscreen-image", "image-text", "gallery", "carousel"].includes(section.type) &&
        input.assetUrls[i]
      ) {
        const asset = input.assetUrls[i];
        section.media = [{ url: asset.url, alt: asset.alt || "", focalPoint: "center" }];
        i++;
      }
    }
  }

  // Re-validate the fully composed document before it ever reaches the DB/UI.
  const { parseStoryDocument } = await import("@/lib/story/schema");
  const validated = parseStoryDocument(document);
  if (!validated.ok) {
    throw new HttpError(
      500,
      `The generated story failed validation: ${validated.errors.slice(0, 3).join("; ")}`,
      "invalid_document",
    );
  }

  if (demo) {
    validated.value.description = `${validated.value.description} ${DEMO_NOTE}`.trim();
  }

  await onStep?.("Saving draft", 5);
  return { document: validated.value, demo };
}

/** Full job runner: updates the job row as it progresses and persists the story. */
export async function executeJob(jobId: string) {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  const input = job.input as unknown as GenerationInput;

  try {
    const result = await runGeneration(input, async (step, index) => {
      await setStep(jobId, step, index);
    });

    const story = await prisma.story.create({
      data: {
        workspaceId: job.workspaceId,
        authorId: job.userId,
        title: result.document.title,
        slug: result.document.slug,
        description: result.document.description,
        storyType: (input.storyType as never) || "ONE_PAGE",
        status: "DRAFT",
        document: result.document as object,
        seo: result.document.seo as object,
        theme: result.document.theme,
        revision: 1,
      },
    });

    await prisma.$transaction([
      prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "SUCCEEDED",
          step: "Saving draft",
          progress: 100,
          storyId: story.id,
          output: { storyId: story.id, slug: story.slug, demo: result.demo },
          completedAt: new Date(),
        },
      }),
      prisma.usageRecord.create({
        data: {
          workspaceId: job.workspaceId,
          kind: "ai_generation",
          amount: job.creditsUsed,
          jobId: job.id,
          metadata: { demo: result.demo },
        },
      }),
    ]);

    return story;
  } catch (error) {
    await prisma.generationJob
      .update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error: (error as Error)?.message?.slice(0, 500) ?? "Unknown error",
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
    throw error;
  }
}

export function slugForPrompt(prompt: string) {
  return slugify(prompt);
}
