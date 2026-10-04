import { draftThemes, type ThemeDefinition } from './draftThemes.js';
import type { Requirement } from './cardRequirements.js';

const named = (section: Requirement['section'], ...names: string[]): Requirement => ({ section, minimum: 1, names });
const tribe = (subtype: string): Requirement => ({ section: 'main', minimum: 3, type: 'ALLY', subtypes: [subtype] });
const champion = (prefix: string): Requirement => ({ section: 'material', minimum: 1, type: 'CHAMPION', prefix });
const generators = { ...draftThemes.find(t => t.id === 'draft-memorite-payoff')!.paths[0][0] };
const music = { ...draftThemes.find(t => t.id === 'draft-resonator')!.paths[0][1] };
const definition = (id: string, name: string, ...conditions: Requirement[]): ThemeDefinition => ({ id, name, kind: 'theme', paths: [conditions] });

/** Review candidates, not automatic publication decisions or executable combos. */
export const themeRefinements: readonly ThemeDefinition[] = [
    definition('memorite-blade', 'Memorite Blade payment', generators, named('material', 'Shardforged Blade')),
    definition('memorite-facet', 'Memorite Facet weapon package', generators, named('main', 'Facet Together'), { section: 'identity', minimum: 1, type: 'WEAPON' }),
    definition('memorite-anthem', 'Memorite Anthem package', generators, named('main', 'Crystallized Anthem'), named('material', 'Merlin, Memorite Vassal')),
    definition('resonator-fanclub', 'Resonator Fanclub music', tribe('RESONATOR'), music, named('main', 'Fanclub Leader')),
    definition('resonator-forese', 'Resonator Forese music', tribe('RESONATOR'), music, named('main', 'Forese, Fervid Cantor'), named('main', 'Current Groover', 'Fanclub Leader', 'Musical Curator', 'Performance Enthusiast', 'Tribute Singer')),
    definition('resonator-module', 'Resonator Module music', tribe('RESONATOR'), music, named('material', 'ResonanTech Module')),
    definition('specter-templar', 'Specter Templar package', tribe('SPECTER'), named('main', 'Incinerated Templar'), named('main', ...["Bill, Chimney Sweep", "Black Ice Spellweaver", "Crossroads Specter", "Drifting Abysshell", "Emberwrath Witch", "Evercurrent Raider", "Flamebound Draug", "Ghastly Slime", "Haunting Apparition", "Jubjub Bird, Mimsy Ghast", "Lawsur, the Carpenter", "Liminal Guide", "Lingering Banshee", "Misty Whispertail", "Mourning Veilbound", "Nether Dodobird", "Night Barker", "Rosewinged Hollow", "Shackled Theurgist", "Sunken Battle Priest", "Treacle, Drowned Mouse", "Unyielding Wraithguard", "Veiled Oracle", "Vengeful Paramour"]), { section: 'material', minimum: 1, type: 'CHAMPION', subtypes: ['CLERIC', 'WARRIOR'] }),
    definition('specter-lawsur', 'Specter Lawsur combat', tribe('SPECTER'), named('main', 'Lawsur, the Carpenter')),
    definition('specter-ticket', 'Specter Ticket graveyard support', tribe('SPECTER'), named('material', 'Ticket to the Afterlife')),
    definition('specter-distort', 'Alice Distort Specters', tribe('SPECTER'), named('main', 'Distort Reality'), champion('Alice,')),
    definition('specter-phantasmagoria', 'Alice Phantasmagoria Specters', tribe('SPECTER'), named('material', 'Alice, Distorted Queen')),
    definition('discorp-tower', 'DisCorp Tower Automaton package', { section: 'main', minimum: 3, names: ["Biding Endroid", "Cellforger Droid", "Cellwarden Droid", "Delivery Droid", "Gray Lupindroid", "Haze Droid", "Hydrocask Droid", "Incinerator Felindroid", "Overcharged Droid", "Production Crawldroid", "Shieldroid", "Sinon, Babelia's Companion", "Sturdy Droid", "Trained Birdroid", "Unbroken Droid", "Virgil, Altered Future"] }, named('main', 'Tower of Dis')),
    definition('wolf-refinement', 'Wolves recheck', tribe('WOLF')),
    definition('discorp-officer', 'DisCorp Officer package', tribe('DISCORP'), named('main', 'Acheron Express Officer'), { section: 'material', minimum: 1, type: 'CHAMPION', subtypes: ['RANGER'] }),
];
