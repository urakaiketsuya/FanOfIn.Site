export interface DeckPackageCandidate {
  id: string;
  label: string;
  rationale: string;
  proposedActivation: string;
  proposedProtection: string;
  memberCards: string[];
  evidence: {
    matchingDecks: number;
    anchorDecks: number;
    sectionPattern: string;
    kind: "Named rules-text link" | "Subtype rules-text link";
  };
}

/** Review-only nominations mined from the deck-card index and verified against current card text.
 * They are deliberately separate from PACKAGE_DEFINITIONS and cannot affect recommendations. */
export const DECK_PACKAGE_CANDIDATES: DeckPackageCandidate[] = [
  {
    id: "clarent-reimagined-lineage",
    label: "Clarent replacement package",
    rationale: "Clarent, Reimagined can banish Clarent, Sword of Peace from the material deck to help pay its memory cost.",
    proposedActivation: "Both Clarent, Reimagined and Clarent, Sword of Peace are in Material.",
    proposedProtection: "Keep Clarent, Sword of Peace while Clarent, Reimagined remains in Material.",
    memberCards: ["Clarent, Reimagined", "Clarent, Sword of Peace"],
    evidence: { matchingDecks: 4_075, anchorDecks: 4_424, sectionPattern: "Material → Material", kind: "Named rules-text link" },
  },
  {
    id: "incarnate-majesty-spirit",
    label: "Incarnate Majesty package",
    rationale: "Incarnate Majesty puts The Majestic Spirit directly onto the field from the material deck or banishment.",
    proposedActivation: "Incarnate Majesty is in Main or Sideboard and The Majestic Spirit is in Material.",
    proposedProtection: "Keep The Majestic Spirit while Incarnate Majesty remains available.",
    memberCards: ["Incarnate Majesty", "The Majestic Spirit"],
    evidence: { matchingDecks: 3_690, anchorDecks: 3_744, sectionPattern: "Main/Sideboard → Material", kind: "Named rules-text link" },
  },
  {
    id: "scry-stars-skies",
    label: "Scry reserve-cost package",
    rationale: "Scry the Stars can banish Scry the Skies from the graveyard instead of paying its reserve cost.",
    proposedActivation: "Scry the Stars and Scry the Skies are both in Main or Sideboard.",
    proposedProtection: "Review cuts to either card as a package change, especially cuts to Scry the Skies.",
    memberCards: ["Scry the Stars", "Scry the Skies"],
    evidence: { matchingDecks: 269, anchorDecks: 286, sectionPattern: "Main/Sideboard → Main/Sideboard", kind: "Named rules-text link" },
  },
  {
    id: "argus-material-fuel",
    label: "Argus material-fuel package",
    rationale: "Argus can banish Crystal of Argus or Eye of Argus from the material deck, with each card paying three reserve cost.",
    proposedActivation: "Argus is in Main or Sideboard with Crystal of Argus or Eye of Argus in Material.",
    proposedProtection: "Keep the present Argus regalia while Argus remains available.",
    memberCards: ["Argus, All-Seeing Giant", "Crystal of Argus", "Eye of Argus"],
    evidence: { matchingDecks: 121, anchorDecks: 129, sectionPattern: "Main → Material", kind: "Named rules-text link" },
  },
  {
    id: "suzaku-ruby-fatestone",
    label: "Suzaku Fatestone package",
    rationale: "Avatar of Suzaku can put Fabled Ruby Fatestone onto the field from the material deck or banishment.",
    proposedActivation: "Avatar of Suzaku is in Main or Sideboard and Fabled Ruby Fatestone is in Material.",
    proposedProtection: "Keep Fabled Ruby Fatestone while Avatar of Suzaku remains available.",
    memberCards: ["Avatar of Suzaku", "Fabled Ruby Fatestone"],
    evidence: { matchingDecks: 515, anchorDecks: 518, sectionPattern: "Main → Material", kind: "Named rules-text link" },
  },
  {
    id: "genbu-sapphire-fatestone",
    label: "Genbu Fatestone package",
    rationale: "Avatar of Genbu can put Fabled Sapphire Fatestone onto the field from the material deck or banishment.",
    proposedActivation: "Avatar of Genbu is in Main or Sideboard and Fabled Sapphire Fatestone is in Material.",
    proposedProtection: "Keep Fabled Sapphire Fatestone while Avatar of Genbu remains available.",
    memberCards: ["Avatar of Genbu", "Fabled Sapphire Fatestone"],
    evidence: { matchingDecks: 53, anchorDecks: 54, sectionPattern: "Main/Sideboard → Material", kind: "Named rules-text link" },
  },
  {
    id: "byakko-emerald-fatestone",
    label: "Byakko Fatestone package",
    rationale: "Avatar of Byakko can put Fabled Emerald Fatestone onto the field from the material deck or banishment.",
    proposedActivation: "Avatar of Byakko is in Main or Sideboard and Fabled Emerald Fatestone is in Material.",
    proposedProtection: "Keep Fabled Emerald Fatestone while Avatar of Byakko remains available.",
    memberCards: ["Avatar of Byakko", "Fabled Emerald Fatestone"],
    evidence: { matchingDecks: 25, anchorDecks: 45, sectionPattern: "Main → Material", kind: "Named rules-text link" },
  },
  {
    id: "endura-reimagined-lineage",
    label: "Endura replacement package",
    rationale: "Endura, Reimagined can banish Endura, Scepter of Ignition from the material deck to gain enlighten counters.",
    proposedActivation: "Both Endura, Reimagined and Endura, Scepter of Ignition are in Material.",
    proposedProtection: "Keep Endura, Scepter of Ignition while Endura, Reimagined remains in Material.",
    memberCards: ["Endura, Reimagined", "Endura, Scepter of Ignition"],
    evidence: { matchingDecks: 21, anchorDecks: 24, sectionPattern: "Material → Material", kind: "Named rules-text link" },
  },
  {
    id: "materialize-munitions-bullets",
    label: "Materialize Munitions package",
    rationale: "Materialize Munitions explicitly materializes a Bullet card from the material deck. Several Bullet choices recur with it, but the exact protected set needs gameplay review.",
    proposedActivation: "Materialize Munitions is in Main with at least one Bullet card in Material.",
    proposedProtection: "Keep at least one usable Bullet target; decide whether all present Bullet options deserve protection.",
    memberCards: ["Materialize Munitions", "Penetrator Round", "Plated Bullet", "Tasershot", "Quickdraw Piercer"],
    evidence: { matchingDecks: 36, anchorDecks: 36, sectionPattern: "Main → Material", kind: "Subtype rules-text link" },
  },
];
