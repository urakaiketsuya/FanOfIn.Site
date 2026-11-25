import { cambriaArticles, homeworldPrimer } from "./cambria";
import { regaliaArticle, radiantArticles, asphodelArticles } from "./late";
import { azothArticles, sanguoArticles, underlandArticles } from "./middle";
import type { StoryArticle } from "./types";

interface StoryArc {
  id: string;
  name: string;
  sets?: string;
  travelers?: string[];
  summary: string;
  articles: StoryArticle[];
  readingNote?: string;
  related?: { to: string; label: string }[];
}

const otherworldlyPossessions = {
  to: "/story/radiant-origins#interlude-otherworldly-possessions",
  label: "Otherworldly Possessions",
};

export const storyArcs: StoryArc[] = [
  {
    id: "homeworld",
    name: "Homeworld",
    summary: "The Grand Archive watches over worlds linked by Aether. When a world’s relic begins to decay, the Archive sends Champions to find out what threatens it.",
    articles: [homeworldPrimer],
  },
  {
    id: "cambria",
    travelers: ["Lorraine", "Silvie", "Rai", "Zander", "Tristan", "Merlin"],
    name: "Cambria",
    sets: "Dawn of Ashes · Fractured Crown",
    summary: "A mysterious mage wins Aesa’s nobles over with promises of wealth and power, and rival houses raise armies against House Pendragon. On their first mission, the Archive’s Champions scatter across Cambria. Lorraine searches for Silvie as unrest turns to open war around Camelot.",
    articles: cambriaArticles,
    readingNote: "Lorraine I, Silvie I, Rai I, and Zander I overlap around the same deployment. Read each second chapter after its first.",
    related: [{ to: "/story/azoth#diana-i-creeping-torment", label: "Follow Tristan to Azoth" }],
  },
  {
    id: "azoth",
    travelers: ["Diana", "Arisanna", "Tonoris", "Tristan"],
    name: "Azoth",
    sets: "Alchemical Revolution · Mercurial Heart",
    summary: "Claude’s discovery of automaton alchemy transforms Dorumegia. Diana joins the Resistance and faces a choice about how far she will go to protect the people she has come to know.",
    articles: azothArticles,
    related: [{ to: "/story/cambria#tristan-i-it-s-all-just-games", label: "Tristan’s Cambria chapter" }, { to: "/story/radiant-origins#interlude-regaling-regalia", label: "Regaling Regalia" }],
  },
  {
    id: "sanguo",
    travelers: ["Kongming", "Guo Jia", "Jin Mara", "Zuo Ci"],
    name: "Sanguo",
    sets: "Mortal Ambition · Abyssal Heaven",
    summary: "With the throne empty, neighboring states turn on one another. As rivals vie to rule Sanguo, the world’s guardians and visitors from other realms are drawn into the conflict.",
    articles: sanguoArticles,
    related: [otherworldlyPossessions],
  },
  {
    id: "underland",
    travelers: ["Diana", "Ciel", "Merlin"],
    name: "Underland",
    sets: "Distorted Reflections · Phantom Monarchs",
    summary: "The Looking Glass opens a passage between Lucenia and Wonderland. As a search for the missing Golden Queen takes the Champions through the mirror, the two worlds draw dangerously close.",
    articles: underlandArticles,
    related: [otherworldlyPossessions],
  },
  {
    id: "radiant-origins",
    travelers: ["Returning Champions", "Luxera"],
    name: "Return to Homeworld",
    sets: "Radiant Origins",
    summary: "The Champions return to Homeworld and trade stories of their missions as Pantheon approaches. Behind the celebrations, discoveries from other worlds give Beatrice a new direction for her research.",
    articles: [...radiantArticles, regaliaArticle],
  },
  {
    id: "asphodel",
    travelers: ["Lorraine", "Casella", "Beatrice", "Zuo Ci"],
    name: "Asphodel",
    sets: ".asphodel/paradise · .asphodel/cantabile",
    summary: "Dis built its prosperity by redirecting Asphodel’s leylines. As the cost of that prosperity comes due, Dante investigates a disorder tied to his powers and Casella struggles to control her magic on her first mission.",
    articles: asphodelArticles,
    readingNote: "Read Dante I and II for his backstory, then Casella for the mission in Dis.",
    related: [otherworldlyPossessions],
  },
];

export const storyHooks: Record<string, string> = {
  homeworld: "When a world’s relic starts to decay, the Archive sends Champions to find out why.",
  cambria: "Lorraine’s search for Silvie takes her to Camelot on the brink of war.",
  azoth: "Diana joins a resistance movement in a world transformed by automaton alchemy.",
  sanguo: "An empty throne sets rival states on a collision course.",
  underland: "A queen vanishes, and the search leads through the Looking Glass.",
  "radiant-origins": "The Champions return to the Archive as Pantheon approaches.",
  asphodel: "A disorder tied to Dante’s powers leads him to the Epicurean Institute.",
};
