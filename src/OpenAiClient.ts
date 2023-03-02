import { NetworkAccessError } from "./NetworkAccessError";

type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
type HttpMethod = GoogleAppsScript.URL_Fetch.HttpMethod;
type HTTPResponse = GoogleAppsScript.URL_Fetch.HTTPResponse;

interface Models {
  data: {
    id: string;
    object: string;
    owned_by: string;
    permission: string[];
  }[];
}

interface CompletionsResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    text?: string;
    message?: Message;
    index: number;
    logprobs: number | null;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ErrorResponse {
  error: {
    message: string;
    type: string;
    param: string;
    code: string;
  };
}

interface Message {
  role: RoleType;
  content: string;
}

enum RoleType {
  User = "user",
  Assistant = "assistant",
  System = "system",
}

class OpenAiClient {
  static readonly BASE_PATH = "https://api.openai.com/v1/";

  public constructor(private apiKey: string) {}

  public listModels(): Models {
    const endPoint = OpenAiClient.BASE_PATH + "models";
    const payload: Record<never, never> = {};

    const response: Models = this.invokeAPI(endPoint, payload);

    return response;
  }

  /**
   * @see https://platform.openai.com/docs/api-reference/completions
   * @param prompt
   * @returns
   */
  public completions(prompt: string): CompletionsResponse | ErrorResponse {
    const endPoint = OpenAiClient.BASE_PATH + "completions";
    const payload: Record<never, never> = {
      model: "gpt-3.5-turbo",
      prompt: prompt,
      temperature: 0.5,
      top_p: 0.5,
      frequency_penalty: 0.9,
      max_tokens: 1000,
    };

    try {
      const response: CompletionsResponse = this.invokeAPI(endPoint, payload);

      return response;
    } catch (e) {
      console.error(`Completions failed. response: ${JSON.stringify(e)}`);
      if (e instanceof NetworkAccessError) {
        const error = JSON.parse(e.e) as ErrorResponse;

        return error;
      }

      throw e;
    }
  }

  /**
   * @see https://platform.openai.com/docs/guides/chat
   * @param messages
   * @returns
   */
  public chatCompletions(
    messages: Message[]
  ): CompletionsResponse | ErrorResponse {
    const endPoint = OpenAiClient.BASE_PATH + "chat/completions";
    const payload: Record<never, never> = {
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.5,
      top_p: 0.5,
      frequency_penalty: 0.9,
      max_tokens: 1000,
    };

    try {
      const response: CompletionsResponse = this.invokeAPI(endPoint, payload);

      return response;
    } catch (e) {
      console.error(`Chat completions failed. response: ${JSON.stringify(e)}`);
      if (e instanceof NetworkAccessError) {
        const error = JSON.parse(e.e) as ErrorResponse;

        return error;
      }

      throw e;
    }
  }

  private postRequestHeader() {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "content-type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private getRequestHeader() {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private postRequestOptions(
    payload: string | Record<never, never>
  ): URLFetchRequestOptions {
    const options: URLFetchRequestOptions = {
      method: "post",
      headers: this.postRequestHeader(),
      muteHttpExceptions: true,
      payload: payload instanceof String ? payload : JSON.stringify(payload),
    };

    return options;
  }

  private getRequestOptions(): URLFetchRequestOptions {
    const options: URLFetchRequestOptions = {
      method: "get",
      headers: this.getRequestHeader(),
      muteHttpExceptions: true,
    };

    return options;
  }

  /**
   * @param endPoint OpenAI API endpoint
   * @param options
   * @throws NetworkAccessError
   */
  private invokeAPI(endPoint: string, payload: Record<never, never>): any {
    let response: HTTPResponse;

    try {
      switch (this.preferredHttpMethod(endPoint)) {
        case "post":
          response = UrlFetchApp.fetch(
            endPoint,
            this.postRequestOptions(payload)
          );
          break;
        case "get":
          response = UrlFetchApp.fetch(
            this.formUrlEncoded(endPoint, payload),
            this.getRequestOptions()
          );
          break;
      }
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200:
        return JSON.parse(response.getContentText());
      default:
        console.warn(
          `OpenAI API error. endpoint: ${endPoint}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  private preferredHttpMethod(endPoint: string): HttpMethod {
    switch (true) {
      case /(.)*models$/.test(endPoint):
        return "get";
      default:
        return "post";
    }
  }

  private formUrlEncoded(
    endPoint: string,
    payload: Record<never, never>
  ): string {
    const query = Object.entries<string>(payload)
      .map(([key, value]) => `${key}=${encodeURI(value)}`)
      .join("&");

    return `${endPoint}?${query}`;
  }
}

export { OpenAiClient, Message, RoleType };
