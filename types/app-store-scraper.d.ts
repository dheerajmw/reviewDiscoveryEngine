declare module "app-store-scraper" {
  interface AppStoreReview {
    text?: string;
    score?: number;
    updated?: string;
    date?: string;
    url?: string;
  }

  interface AppStoreScraper {
    reviews(options: {
      id: number;
      country?: string;
      page?: number;
      sort?: string;
    }): Promise<AppStoreReview[]>;
    sort: {
      RECENT: string;
      HELPFUL: string;
    };
  }

  const scraper: AppStoreScraper;
  export default scraper;
}
