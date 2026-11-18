// User-supplied acceptance deck; not a fabricated engine fixture.
const lines=(text:string)=>text.split('\n').map(line=>({quantity:Number(line.split(' ')[0]),name:line.slice(line.indexOf(' ')+1)}));
export const casellaWind={
material:lines(`1 Spirit of Wind
1 Casella, Volant Songstress
1 Casella, Wistful Refrain
1 Casella, Sky's Cantatrice
1 Backup Charger
1 Lost Providence
1 Sapiential Codex
1 Tariff Ring
1 Purifying Thurible
1 Sonic Boom, Thunder's Echo
1 Storm Tyrant's Eye
1 Tome of Sacred Lightning`),
song:lines(`1 Aiss Yustera
1 Chromatic
1 Skyward Requiem
1 Let My Thunder Be Heard`),
main:lines(`2 Battlefield Benediction
4 ChannelTech Charm S
3 Dungeon Guide
4 Fluffy Shopkeep
3 Nascent Barrier
2 Turbo Charge
3 Aella, Zephyr's Hand
3 Aesan Protector
4 Casella's Indomitable Hymn
4 Casella's Poise
3 Fairy Whispers
4 Reclaim
3 StrideTech W
3 Three Visits
4 Windmill Engineer
2 Final Refrain
3 Harness Lightning
2 Reversal's Polarity
4 Stormblade Squire`),
sideboard:lines(`1 Safeguard Amulet
1 Battlefield Benediction
3 Unyielding Wraithguard
2 Veiling Breeze`)};
