export interface StoryArticle {
  slug: string;
  title: string;
  summary: string;
  quote: string;
  recap: string[];
  kind?: "World guide" | "Interlude" | "Set preview";
  note?: string;
}

export interface StoryCard {
  name: string;
  slug: string;
  image: string;
  editionUuid: string;
  printing: string;
  kind: "Character" | "Location" | "Object";
  caption: string;
}
