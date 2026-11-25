interface TriviaSource {
  label: string;
  url: string;
}

interface CardTriviaEntry {
  text: string;
  sources: readonly TriviaSource[];
}

const sanguo = {
  label: "Grand Archive lore",
  url: "https://www.gatcg.com/article/mortal-ambition-sanguo",
};
const igniteFate = {
  label: "Grand Archive lore",
  url: "https://www.gatcg.com/article/kongming-i-ignite-fate",
};

function novelChapter(chapter: number): TriviaSource {
  return {
    label: `Three Kingdoms ch. ${chapter}`,
    url: `https://anthony.sogang.ac.kr/ThreeKingdoms/bc${String(chapter).padStart(3, "0")}.htm`,
  };
}

const peachGarden = {
  text: "In Romance of the Three Kingdoms, Liu Bei, Guan Yu, and Zhang Fei swear brotherhood in a peach garden. In Sanguo, they swear sisterhood beneath cherry blossoms, an oath echoed by Oath of the Sakura.",
  sources: [novelChapter(1), sanguo],
};
const kongming = {
  text: "Kongming is the courtesy name of Zhuge Liang, the strategist who lays out a plan for three rival powers in Romance of the Three Kingdoms. Grand Archive casts Kongming as a mage who comes to Sanguo from another world.",
  sources: [
    novelChapter(38),
    { label: "Zhuge Liang biography", url: "https://ctext.org/text.pl?if=en&node=603498" },
    igniteFate,
  ],
};
const guoJia = {
  text: "Guo Jia serves as Cao Cao’s adviser in Romance of the Three Kingdoms. In Grand Archive, she is Kongming’s older sister and the Zhidian Sect’s favored candidate to fulfill its prophecy.",
  sources: [novelChapter(33), igniteFate],
};
const diaoChan = {
  text: "In Romance of the Three Kingdoms, Diao Chan helps Wang Yun drive a wedge between Dong Zhuo and Lü Bu. Wang Yun promises her to Lü Bu before offering her to Dong Zhuo.",
  sources: [novelChapter(8)],
};
const guandu = {
  text: "In Romance of the Three Kingdoms, Cao Cao defeats Yuan Shao at Guandu after striking his grain depot. In Sanguo, the two have been rivals since childhood.",
  sources: [novelChapter(30), sanguo],
};

export const cardTrivia: Readonly<Partial<Record<string, CardTriviaEntry>>> = {
  "cao-cao-aspirant-of-chaos": guandu,
  "diao-chan-dreaming-wish": diaoChan,
  "diao-chan-enchantress": diaoChan,
  "diao-chan-idyll-corsage": diaoChan,
  "guan-yu-prime-exemplar": peachGarden,
  "guo-jia-blessed-scion": guoJia,
  "guo-jia-chosen-disciple": guoJia,
  "guo-jia-heavens-favored": guoJia,
  "kongming-ascetic-vice": kongming,
  "kongming-erudite-strategist": kongming,
  "kongming-fel-eidolon": kongming,
  "kongming-wayward-maven": kongming,
  "liu-bei-oathkeeper": peachGarden,
  "lu-bu-indomitable-titan": {
    text: "At Hulao Pass in Romance of the Three Kingdoms, Zhang Fei takes on Lü Bu first, then Guan Yu and Liu Bei join the fight. All three sworn brothers fight him together before he withdraws.",
    sources: [novelChapter(5)],
  },
  "oath-of-the-sakura": peachGarden,
  "sun-quan-sealbearer": {
    text: "The novel has Sun Quan’s father, Sun Jian, discover the Imperial Seal in a palace well. In Sanguo, his father passes him the seal, and Sun Quan learns what leaving the throne empty could do to his world.",
    sources: [novelChapter(6), sanguo],
  },
  "yuan-shao-crown-general": guandu,
  "zhang-fei-spirited-steel": peachGarden,
  "zhang-jiao-way-of-peace": {
    text: "The novel’s Zhang Jiao receives a book called the Way of Peace, treats the sick, and leads the Yellow Turban uprising. Grand Archive gives its healer the Luopan and reimagines her rebels as the Golden Sashes.",
    sources: [novelChapter(1), sanguo],
  },
};
