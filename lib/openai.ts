import "server-only";
import OpenAI from "openai";
import { getServerEnv } from "@/lib/config";

export const openai = new OpenAI({
  apiKey: getServerEnv().openAiApiKey,
});

type CreateResponseParams = Parameters<typeof openai.responses.create>[0];

function shouldFallbackToMini(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return (
      error.status >= 500 ||
      error.code === "rate_limit_exceeded" ||
      error.code === "insufficient_quota"
    );
  }

  if (typeof error === "object" && error !== null) {
    const status = "status" in error ? error.status : undefined;
    const code = "code" in error ? error.code : undefined;
    const message = "message" in error ? error.message : undefined;

    return (
      (typeof status === "number" && status >= 500) ||
      code === "rate_limit_exceeded" ||
      code === "insufficient_quota" ||
      (typeof message === "string" && /quota|rate limit|overloaded|temporar/i.test(message))
    );
  }

  return false;
}

export async function createResponseWithFallback(options: CreateResponseParams & {
  fallbackModel?: CreateResponseParams["model"];
}) {
  const { fallbackModel, model, ...rest } = options;

  try {
    return await openai.responses.create({
      ...rest,
      model,
    });
  } catch (error) {
    if (!fallbackModel || !shouldFallbackToMini(error)) {
      throw error;
    }

    return openai.responses.create({
      ...rest,
      model: fallbackModel,
    });
  }
}