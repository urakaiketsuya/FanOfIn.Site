// Hand-authored, same manual-refresh spirit as ./data.ts — each product's Media Kit "Character
// Cutouts" folder has transparent art for a handful of its featured prints, keyed by the exact
// printed card name (not just the base Champion name, since "Diao Chan, Idyll Corsage" and
// "Diao Chan, Enchantress" are different cards with different cutout art). Only entries that
// matched a real card name exactly were kept — a few files (tokens like "Arcane Slime", or ones
// whose art didn't correspond to any catalog card) were skipped rather than guessed at.
export const CHARACTER_CUTOUTS: Record<string, string> = {
  "Arisanna, Herbalist Prodigy": "/media/products/ALC/cutouts/arisanna-herbalist-prodigy.png",
  "Arisanna, Master Alchemist": "/media/products/ALC/cutouts/arisanna-master-alchemist.png",
  "Caretaker Drone": "/media/products/ALC/cutouts/caretaker-drone.png",
  "Diana, Deadly Duelist": "/media/products/ALC/cutouts/diana-deadly-duelist.png",
  "Diana, Keen Huntress": "/media/products/ALC/cutouts/diana-keen-huntress.png",
  "Tonoris, Lone Mercenary": "/media/products/ALC/cutouts/tonoris-lone-mercenary.png",
  "Tonoris, Might of Humanity": "/media/products/ALC/cutouts/tonoris-might-of-humanity.png",
  "Jin, Fate Defiant": "/media/products/AMB/cutouts/jin-fate-defiant.png",
  "Kongming, Wayward Maven": "/media/products/AMB/cutouts/kongming-wayward-maven.png",
  "Allen, Beast Beckoner": "/media/products/DOA/cutouts/allen-beast-beckoner.png",
  "Lorraine, Blademaster": "/media/products/DOA/cutouts/lorraine-blademaster.png",
  "Lorraine, Crux Knight": "/media/products/DOA/cutouts/lorraine-crux-knight.png",
  "Lorraine, Spirit Ruler": "/media/products/DOA/cutouts/lorraine-spirit-ruler.png",
  "Lorraine, Wandering Warrior": "/media/products/DOA/cutouts/lorraine-wandering-warrior.png",
  "Mordred, Flawless Blade": "/media/products/DOA/cutouts/mordred-flawless-blade.png",
  "Rai, Archmage": "/media/products/DOA/cutouts/rai-archmage.png",
  "Rai, Mana Weaver": "/media/products/DOA/cutouts/rai-mana-weaver.png",
  "Rai, Spellcrafter": "/media/products/DOA/cutouts/rai-spellcrafter.png",
  "Rai, Storm Seer": "/media/products/DOA/cutouts/rai-storm-seer.png",
  "Silvie, Earth's Tune": "/media/products/DOA/cutouts/silvie-earth-s-tune.png",
  "Silvie, Loved by All": "/media/products/DOA/cutouts/silvie-loved-by-all.png",
  "Silvie, Wilds Whisperer": "/media/products/DOA/cutouts/silvie-wilds-whisperer.png",
  "Silvie, With the Pack": "/media/products/DOA/cutouts/silvie-with-the-pack.png",
  "Spirit of Fire": "/media/products/DOA/cutouts/spirit-of-fire.png",
  "Spirit of Water": "/media/products/DOA/cutouts/spirit-of-water.png",
  "Spirit of Wind": "/media/products/DOA/cutouts/spirit-of-wind.png",
  "Tristan, Grim Stalker": "/media/products/DOA/cutouts/tristan-grim-stalker.png",
  "Zander, Always Watching": "/media/products/DOA/cutouts/zander-always-watching.png",
  "Zander, Blinding Steel": "/media/products/DOA/cutouts/zander-blinding-steel.png",
  "Zander, Corhazi's Chosen": "/media/products/DOA/cutouts/zander-corhazi-s-chosen.png",
  "Zander, Prepared Scout": "/media/products/DOA/cutouts/zander-prepared-scout.png",
  "Merlin, Kingslayer": "/media/products/FTC/cutouts/merlin-kingslayer.png",
  "Spirit of Serene Fire": "/media/products/FTC/cutouts/spirit-of-serene-fire.png",
  "Spirit of Serene Water": "/media/products/FTC/cutouts/spirit-of-serene-water.png",
  "Spirit of Serene Wind": "/media/products/FTC/cutouts/spirit-of-serene-wind.png",
  "Diao Chan, Dreaming Wish": "/media/products/HVN/cutouts/diao-chan-dreaming-wish.png",
  "Diao Chan, Enchantress": "/media/products/HVN/cutouts/diao-chan-enchantress.png",
  "Diao Chan, Idyll Corsage": "/media/products/HVN/cutouts/diao-chan-idyll-corsage.png",
  "Guo Jia, Blessed Scion": "/media/products/HVN/cutouts/guo-jia-blessed-scion.png",
  "Guo Jia, Chosen Disciple": "/media/products/HVN/cutouts/guo-jia-chosen-disciple.png",
  "Guo Jia, Heaven's Favored": "/media/products/HVN/cutouts/guo-jia-heaven-s-favored.png",
  "Kongming, Erudite Strategist": "/media/products/HVN/cutouts/kongming-erudite-strategist.png",
  "Convoking Slime": "/media/products/MRC/cutouts/convoking-slime.png",
  "Cordelia, Aurous Kaiser": "/media/products/MRC/cutouts/cordelia-aurous-kaiser.png",
  "Geldus, Terror of Dorumegia": "/media/products/MRC/cutouts/geldus-terror-of-dorumegia.png",
  "Tristan, Shadowdancer": "/media/products/MRC/cutouts/tristan-shadowdancer.png",
  "Tristan, Shadowreaver": "/media/products/MRC/cutouts/tristan-shadowreaver.png",
  "Twilight Slime": "/media/products/MRC/cutouts/twilight-slime.png",
  "Alice, Whim's Monarch": "/media/products/PTM/cutouts/alice-whim-s-monarch.png",
  "Merlin, Amethyst's Glow": "/media/products/PTM/cutouts/merlin-amethyst-s-glow.png",
  "Merlin, Brilliant Vestige": "/media/products/PTM/cutouts/merlin-brilliant-vestige.png",
  "Merlin, Memorite Vassal": "/media/products/PTM/cutouts/merlin-memorite-vassal.png",
};

/** Every cutout belonging to a base Champion signature (e.g. "Diao Chan" matches both "Diao Chan, Idyll Corsage" and "Diao Chan, Enchantress"), sorted by printed name. */
export function cutoutsForChampion(signature: string): { cardName: string; image: string }[] {
  const prefix = `${signature}, `;
  return Object.entries(CHARACTER_CUTOUTS)
    .filter(([cardName]) => cardName === signature || cardName.startsWith(prefix))
    .map(([cardName, image]) => ({ cardName, image }))
    .sort((a, b) => a.cardName.localeCompare(b.cardName));
}
