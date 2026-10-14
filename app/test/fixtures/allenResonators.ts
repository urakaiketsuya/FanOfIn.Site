// Public example supplied by the user, read from the deck page on 2026-10-13.
export const allenResonators = {
 main: [
  ["Fluffy Shopkeep", 2], ["Forese, Fervid Cantor", 4], ["Musical Curator", 4],
  ["Performance Enthusiast", 2], ["Song of Nurturing", 2], ["Steady Verse", 3],
  ["ZENA, Echo Weaver", 2], ["Attune with the Winds", 4], ["Avatar of Byakko", 2],
  ["Breath's Coloratura", 4], ["Calming Breeze", 2], ["Fanclub Leader", 4],
  ["Music Aficionado", 4], ["Rondo of the Wind", 4], ["Sinfonia of Hope", 3],
  ["Tribute Singer", 4], ["Veiling Breeze", 4], ["Wuthering Sforzando", 2], ["Zephyr", 4],
 ].map(([name, quantity]) => ({ name: name as string, quantity: quantity as number })),
 material: ["Allen, Beast Beckoner", "Backup Charger", "Clockwork Musicbox", "Fabled Emerald Fatestone", "Fabled Ruby Fatestone", "Fire Resonance Bauble", "Grand Crusader's Ring", "Guo Jia, Chosen Disciple", "Spirit of Wind", "Viridian Protective Trinket", "Water Resonance Bauble", "Wind Resonance Bauble"].map(name => ({name, quantity: 1})),
};
