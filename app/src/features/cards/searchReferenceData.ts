export interface SearchReferenceExample { query: string; description: string }
export const searchReferenceExamples = {
  text: [
    { query: 'draw recover', description: 'Both words in the card name or rules text.' },
    { query: 'name:lorraine', description: 'A name containing Lorraine.' },
    { query: 'effect:"draw a card"', description: 'An exact phrase within the rules text.' },
    { query: '!"Backup Charger"', description: 'The exact card name, ignoring capitalization.' },
  ],
  facets: [
    { query: 'class:warrior type:ally element:fire', description: 'Fire allies with the Warrior class.' },
    { query: 'subtype:harmony AND subtype:melody', description: 'Cards with both subtypes.' },
    { query: 'type:ally type:action', description: 'Either Ally or Action (adjacent choices in the same facet).' },
  ],
  printing: [
    { query: 'set:doa rarity:3', description: 'A Rare printing in the Dawn of Ashes family.' },
    { query: 'edition:"DOA 1st"', description: 'A printing with exactly the DOA 1st set code.' },
    { query: 'artist:"Raii"', description: 'An illustrator credit containing Raii.' },
  ],
  numeric: [
    { query: 'type:ally reserve<=3 power>=2', description: 'Allies costing at most 3 reserve with at least 2 power.' },
    { query: 'memory:0', description: 'A printed memory cost of zero.' },
    { query: 'level>=1 level<=3', description: 'Printed levels from 1 through 3, inclusive.' },
    { query: 'life!=20', description: 'A known numeric life value other than 20.' },
  ],
  boolean: [
    { query: '(type:ally OR type:action) reserve<=3', description: 'An Ally or Action, with reserve cost at most 3.' },
    { query: 'name:lorraine OR name:silvie AND level:1', description: 'Lorraine at any level, or Silvie at level 1. AND binds first.' },
    { query: '(name:lorraine OR name:silvie) level:1', description: 'Lorraine or Silvie, restricted to level 1.' },
  ],
  exclude: [
    { query: 'type:ally -subtype:harmony', description: 'Allies without the Harmony subtype.' },
    { query: '-effect:discard', description: 'Cards whose rules text does not contain discard.' },
    { query: 'NOT (element:fire OR element:water)', description: 'Neither Fire nor Water. You can also use -(…).' },
    { query: '-power>=3', description: 'Cards that do not have a known power of 3 or more, including missing power.' },
  ],
  tags: [
    { query: 'tag:forest', description: 'Cards labeled Forest in views with tag data.' },
  ],
} satisfies Record<string, SearchReferenceExample[]>;

export const searchReferenceUrl = (query: string) => `/cards?${new URLSearchParams({ q: query })}`;
