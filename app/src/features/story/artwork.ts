const archiveArt = "https://content.gatcg.com/uploads";
const articleArt = "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media";

export const arcArtwork: Partial<Record<string, string>> = {
  homeworld: `${archiveArt}/The_Homeword_Title_Image_41a2274d3d.jpg`,
  cambria: `${archiveArt}/Camelot_d9dd651551.jpg`,
  azoth: `${articleArt}/Exalted_Dorumegian_Throne_1000x500_5bd3f5552d.jpg`,
  sanguo: `${articleArt}/Keep_Cover_c9a4478916.jpg`,
  underland: `${articleArt}/The_Looking_Glass_7d8168b0eb.png`,
  "radiant-origins": `${articleArt}/rdo_cover_75ffc00fd4.jpg`,
  asphodel: `${articleArt}/Tower_of_Dis_3054e6b48e.png`,
};

export const articleArtwork: Partial<Record<string, { src: string; caption: string }>> = {
  "the-homeworld": {
    src: `${archiveArt}/Hallway_bluepirint_78f17fff09.png`,
    caption: "Blueprint of a Grand Archive hallway",
  },
  "silvie-i-an-accidental-tumble": {
    src: `${archiveArt}/Avalon_be2fe06439.jpg`,
    caption: "Avalon",
  },
  "rai-i-a-fiery-welcome": {
    src: `${archiveArt}/Varuck_fb869a9aa8.jpg`,
    caption: "Varuck",
  },
  "interlude-regaling-regalia": {
    src: `${articleArt}/Interlude_Regaling_Regalia_Cover_afdb38b1ba.jpg`,
    caption: "Regaling Regalia · official cover",
  },
};
