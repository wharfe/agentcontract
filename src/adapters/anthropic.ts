import Anthropic from "@anthropic-ai/sdk";
import type { LLMAdapter, CompleteParams, CompleteResult } from "../core/types.js";

export class AnthropicAdapter implements LLMAdapter {
  readonly provider = "anthropic";
  private client: Anthropic;

  constructor(apiKey?: string) {
    // Anthropic SDK reads ANTHROPIC_API_KEY from env by default
    this.client = new Anthropic(apiKey ? { apiKey } : undefined);
  }

  async complete(params: CompleteParams): Promise<CompleteResult> {
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      system: params.system,
      messages: [{ role: "user", content: params.input }],
    });

    const output = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      output,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  }
}
