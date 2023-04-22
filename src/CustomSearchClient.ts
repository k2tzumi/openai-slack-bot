import { NetworkAccessError } from "./NetworkAccessError";
import { CustomSearchCredential } from "./CustomSearchCredential";

type HTTPResponse = GoogleAppsScript.URL_Fetch.HTTPResponse;

interface WebItem {
  link: string;
  title: string;
}

/**
 * Number of search results to return
 */
const NUM = 10;

class CustomSearchClient {
  /**
   *
   * @param {CustomSearchCredential} credentail
   * @param {string} locale
   * @param {string} rights Filters based on licensing. see https://wiki.creativecommons.org/wiki/CC_Search_integration
   */
  public constructor(
    private credentail: CustomSearchCredential,
    private locale?: string,
    private rights?: string
  ) {}

  /**
   * @param {string} keyword Search word
   * @param {numger} [repeate=1] Number of invocations
   * @return {WebItem[]}
   * @throws {NetworkAccessError}
   */
  public search(keyword: string, repeate = 1): WebItem[] {
    const start: number = NUM * (repeate - 1) + 1;
    const options = {
      muteHttpExceptions: true,
    };

    let response: HTTPResponse;

    try {
      response = UrlFetchApp.fetch(this.getEndpoint(keyword, start), options);
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200: {
        const items = JSON.parse(response.getContentText()).items;
        return items.map((item) => {
          return {
            link: item.link,
            title: item.title,
          } as WebItem;
        });
      }
      default:
        console.warn(
          `Custom Search API error. status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  private getEndpoint(keyword: string, start: number): string {
    const payload: Record<never, never> = {
      key: this.credentail.ApiKey,
      cx: this.credentail.SearchEngineId,
      searchType: null,
      q: keyword,
      safe: "active",
      lr: this.language(),
      rights: this.rights,
      num: NUM,
      start,
    };

    return this.formUrlEncoded(
      "https://www.googleapis.com/customsearch/v1",
      payload
    );
  }

  private formUrlEncoded(
    endPoint: string,
    payload: Record<never, never>
  ): string {
    const query = Object.entries<string>(payload)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => `${key}=${encodeURI(value)}`)
      .join("&");

    return `${endPoint}?${query}`;
  }

  private language(): string | null {
    switch (this.locale) {
      case "ja-JP":
        return "lang_ja";
      case "en-US":
        return "lang_en";
      default:
        return null;
    }
  }
}
export { CustomSearchClient, WebItem };
