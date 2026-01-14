import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

const branchNameSchema = z.object({
  branchName: z.string().describe("A short, kebab-case branch name (e.g., 'add-user-auth', 'fix-login-bug')"),
});

export async function generateBranchName(apiKey: string, message: string): Promise<string> {
  const groq = createGroq({ apiKey });

  const { object } = await generateObject({
    model: groq("openai/gpt-oss-20b"),
    schema: branchNameSchema,
    prompt: `Based on the following user message, generate a concise git branch name in kebab-case format. The branch name should be descriptive but short (2-4 words max). Do not include prefixes like 'feature/' or 'fix/'.

User message: "${message}"`,
  });

  return object.branchName;
}
