type Properties = GoogleAppsScript.Properties.Properties;

class CustomSearchCredential {
  private constructor(private apiKey: string, private searchEngineId: string) {}

  public static create(propertyStore: Properties): CustomSearchCredential {
    const apiKey = propertyStore.getProperty("GOOGLE_API_KEY");
    const searchEngineId = propertyStore.getProperty("CUSTOM_SEARCH_ENGINE_ID");

    if (apiKey === null || searchEngineId === null) {
      throw new Error("Custom search credential not set.");
    }

    return new this(apiKey, searchEngineId);
  }

  public get ApiKey(): string {
    return this.apiKey;
  }

  public get SearchEngineId(): string {
    return this.searchEngineId;
  }
}

export { CustomSearchCredential };
