import { Link } from "react-router-dom";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Panel from "../../components/ui/Panel";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { RARITY_LABELS } from "./rarities";
import { searchReferenceExamples as examples, searchReferenceUrl, type SearchReferenceExample } from "./searchReferenceData";

const linkClass = "inline-flex min-h-12 items-center rounded px-2 text-ctp-blue underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue";
const sections = [
  ['text', 'Names & rules text'], ['facets', 'Card characteristics'], ['printing', 'Sets, rarity & artists'],
  ['numeric', 'Costs & stats'], ['boolean', 'Combining searches'], ['exclude', 'Excluding cards'],
  ['tags', 'Tags'], ['views', 'Search views'], ['limits', 'Syntax & limits'],
];
const textFields = [['name:', 'n:', 'Card name; substring matching.'], ['effect:', 'o:, oracle:, text:', 'Rules text; substring matching.'], ['artist:', 'a:', 'Illustrator credit on a printing.']];
const facetFields = [['class:', '—', 'Class, such as warrior or mage.'], ['type:', 't:', 'Card type, such as ally or action.'], ['subtype:', '—', 'Subtype, such as harmony or melody.'], ['element:', '—', 'Element code, such as fire, water, wind or norm.'], ['set:', 's:, e:', 'Set family, including related printing sets.'], ['edition:', '—', 'Exact printing-set code.'], ['rarity:', 'r:', 'Numeric rarity code.'], ['tag:', '—', 'Community tag, where tag data is available.']];
const numericFields = [['memory', 'mem, cost_memory', 'Printed memory cost'], ['reserve', 'res, cost_reserve', 'Printed reserve cost'], ['power', 'pow', 'Printed power'], ['life', 'hp', 'Printed life'], ['level', 'lv', 'Printed level'], ['durability', 'dur', 'Printed durability']];

function Fields({ rows }: { rows: string[][] }) {
  return <dl className="mt-3 divide-y divide-ctp-surface1">{rows.map(([field, aliases, meaning]) => <div key={field} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
    <dt className="font-mono font-semibold text-ctp-blue">{field}</dt><dd className="min-w-0"><p>{meaning}</p>{aliases !== '—' && <p className="mt-1 break-words text-sm text-ctp-subtext1">Aliases: <code>{aliases}</code></p>}</dd>
  </div>)}</dl>;
}
function Examples({ items }: { items: SearchReferenceExample[] }) {
  return <ul className="mt-4 space-y-2">{items.map(({ query, description }) => <li key={query} className="rounded-lg bg-ctp-base p-3">
    <Link to={searchReferenceUrl(query)} className={`${linkClass} max-w-full`} aria-label={`Search: ${query}`}><code className="break-words [overflow-wrap:anywhere]">{query}</code></Link>
    <p className="mt-1 text-sm text-ctp-subtext1">{description}</p>
  </li>)}</ul>;
}

export default function SearchReference() {
  useDocumentTitle('GA search reference', 'Grand Archive card search syntax: fields, aliases, Boolean expressions, costs and numeric comparisons.', '/cards/search-reference');
  return <PageLayout width="wide">
    <PageHeader title="GA search reference" description="Find Grand Archive cards by name, rules text, characteristics and printed stats. Select any example to try it in Browse Cards." actions={<Link className={linkClass} to="/cards">Browse cards →</Link>} />
    <nav aria-label="Search reference sections" className="mb-6 flex flex-wrap gap-x-3 gap-y-1">{sections.map(([id, title]) => <a key={id} href={`#${id}`} className={linkClass}>{title}</a>)}</nav>
    <div className="space-y-5 text-sm leading-6 sm:text-base">
      <Panel id="text" className="scroll-mt-24"><h2 className="text-xl font-semibold">Names &amp; rules text</h2>
        <p className="mt-2">You can start a search with words you remember from a card’s name or rules text. Search checks both sides of a card, and each word you enter must appear somewhere in its name or text. Put double quotes around several words to search for that phrase. You can use uppercase or lowercase letters.</p>
        <Fields rows={textFields} /><p className="mt-3">Use <code>name:</code> or <code>n:</code> when you want to search only card names. To find a phrase in the rules text, use <code>effect:</code> or its shorter alias <code>o:</code>. If you already know the full card name, put <code>!</code> before the quoted name to find that exact card.</p><Examples items={examples.text} />
      </Panel>
      <Panel id="facets" className="scroll-mt-24"><h2 className="text-xl font-semibold">Card characteristics</h2>
        <p className="mt-2">You can find cards of a particular class with <code>class:</code>, card type with <code>type:</code> or <code>t:</code>, and subtype with <code>subtype:</code>. Use <code>element:</code> to search for an element, such as fire, water or wind; <code>element:norm</code> finds Normal cards. These keywords match whole values, so use <code>class:warrior</code> rather than part of the class name. Put quotes around values containing spaces. The filter menus show the available choices.</p>
        <Fields rows={facetFields} /><Examples items={examples.facets} />
      </Panel>
      <Panel id="printing" className="scroll-mt-24"><h2 className="text-xl font-semibold">Sets, rarity &amp; artists</h2>
        <p className="mt-2">Find cards printed in a set family with <code>set:</code>, <code>s:</code> or <code>e:</code>. For example, <code>set:doa</code> includes the related Dawn of Ashes printing sets. Use <code>edition:</code> with a printing-set code when you want one specific release.</p>
        <p className="mt-3">You can find cards illustrated by a particular artist with <code>artist:</code> or <code>a:</code>. All the printing conditions in your search must be met by the same printing. For example, combining a set and an artist finds cards that have that artist’s credit in that set.</p>
        <p className="mt-3">Use <code>rarity:</code> or <code>r:</code> followed by one of the codes below to find a particular rarity. Rarity names and comparisons such as <code>rarity&gt;3</code> are not supported:</p><dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">{Object.entries(RARITY_LABELS).map(([code, label]) => <div className="flex gap-3" key={code}><dt className="font-mono">{code}</dt><dd>{label}</dd></div>)}</dl>
        <Examples items={examples.printing} />
      </Panel>
      <Panel id="numeric" className="scroll-mt-24"><h2 className="text-xl font-semibold">Costs &amp; stats</h2>
        <p className="mt-2">You can search for a card’s printed memory or reserve cost with <code>memory</code> and <code>reserve</code>. Use <code>power</code>, <code>life</code>, <code>level</code> or <code>durability</code> to find cards with a particular stat. Each keyword also has the shorter forms listed below.</p><Fields rows={numericFields} />
        <p className="mt-3">Follow the keyword with <code>:</code> or <code>=</code> to find an exact value. You can use <code>&gt;</code> and <code>&lt;</code> for values above or below a number, or <code>&gt;=</code> and <code>&lt;=</code> to include that number too. For example, <code>power&gt;=2</code> finds cards with at least 2 power. Use <code>!=</code> for a value other than the number you give. Keep the keyword, comparison and number together; whole numbers and decimals are accepted.</p>
        <p className="mt-3">These searches use the main card’s printed stats. A printed zero counts as a value, but a missing or variable stat does not match a numeric comparison—even <code>!=</code>. To include cards without a numeric value, you can exclude a comparison instead: <code>-power&gt;=3</code> also finds cards with no printed power.</p><Examples items={examples.numeric} />
      </Panel>
      <Panel id="boolean" className="scroll-mt-24"><h2 className="text-xl font-semibold">Combining searches</h2>
        <p className="mt-2">You can narrow a search by adding more conditions. For example, <code>type:ally element:fire</code> finds cards that are both allies and Fire. Writing <code>AND</code> between the conditions has the same effect. Use <code>OR</code> when either condition should match.</p>
        <p className="mt-3">Put conditions in parentheses to combine them as a group. For example, <code>(name:lorraine OR name:silvie) level:1</code> finds level 1 cards for either name. Without parentheses, <code>NOT</code> is applied first, then <code>AND</code>, then <code>OR</code>. These three words work in either uppercase or lowercase.</p>
        <p className="mt-3">There is one shortcut for characteristic filters: <code>type:ally type:action</code> finds either type, just like choosing both in the filter menu. Write <code>AND</code> explicitly if the card must have both values. Repeated name, rules-text and numeric conditions always require every condition to match.</p><Examples items={examples.boolean} />
      </Panel>
      <Panel id="exclude" className="scroll-mt-24"><h2 className="text-xl font-semibold">Excluding cards</h2>
        <p className="mt-2">You can remove cards from your results by putting <code>-</code> before a condition. For example, <code>type:ally -subtype:harmony</code> finds allies that do not have the Harmony subtype. A card with Harmony is excluded even if it also has another subtype you searched for. You can also write <code>NOT</code> before a condition, or exclude a whole group with <code>NOT (…)</code> or <code>-(…)</code>.</p><Examples items={examples.exclude} />
      </Panel>
      <Panel id="tags" className="scroll-mt-24"><h2 className="text-xl font-semibold">Community tags</h2>
        <p className="mt-2">You can search community descriptions of card art and gameplay features with <code>tag:</code> in Browse Cards and the tag tools. For example, <code>tag:forest</code> finds cards labeled Forest. A tag search matches the card; a tag gallery also limits which of its printings you see. Tags are not available in compact card pickers, Card Stats or the deck editor, so those views show an error if you use this keyword.</p><Examples items={examples.tags} />
      </Panel>
      <Panel id="views" className="scroll-mt-24"><h2 className="text-xl font-semibold">Where searches apply</h2>
        <ul className="mt-3 list-disc space-y-3 pl-5">
          <li><strong>Browse Cards, Card Stats and deck editing:</strong> apply with Search or Enter. Invalid drafts keep the last applied results. Picker controls still apply to the full expression.</li>
          <li><strong>Deck editing:</strong> destination, available elements, ownership, cost controls and result sorting remain active. Searching never adds or removes cards; select results and use the add action.</li>
          <li><strong>Compact card pickers, profiles, collection, binder and analysis pools:</strong> results update as you type. Invalid queries show an error and no matches; existing selections stay intact. Searches stay within that view’s eligible cards.</li>
          <li><strong>Artist and tag galleries:</strong> printing restrictions apply to each displayed printing. Spoilers also retain their broad plain-text search for class, type and element words.</li>
          <li><strong>Missing catalog records:</strong> names can still match. Unknown stats, rules text and printing data cannot satisfy a condition, even through NOT. A known name branch can still satisfy OR.</li>
          <li><strong>Deck-content filters:</strong> use the offered characteristic fields; choose named cards separately. Deck titles, players, artists, tag names, strategy and package searches use their own text search. Specialized analytics filters are separate.</li>
        </ul>
      </Panel>
      <Panel id="limits" className="scroll-mt-24"><h2 className="text-xl font-semibold">Syntax &amp; limits</h2>
        <p className="mt-2">Close all quotes and parentheses. Separate conditions with spaces. Quote literal punctuation and reserved words such as <code>"OR"</code>. Inside a quoted value, escape a quote as <code>{'\\"'}</code> and a backslash as <code>{'\\\\'}</code>.</p>
        <p className="mt-3">Unknown fields, missing values, unfinished comparisons and conflicting flat include/exclude choices show an error. Queries allow up to 512 Boolean tokens and 64 nested groups.</p>
        <p className="mt-3">This GA adaptation does not support every Scryfall feature. Regex, wildcards, field-to-field numeric comparisons, generic <code>cost:</code>, <code>is:</code>/<code>has:</code>, prices, dates, formats and sorting directives are not query fields. Speed, sorting and other view-specific options remain visual controls.</p>
        <p className="mt-3 text-sm text-ctp-subtext1">Syntax structure inspired by the <a className={linkClass} href="https://scryfall.com/docs/syntax" target="_blank" rel="noreferrer">Scryfall search reference ↗<span className="sr-only"> (opens in a new tab)</span></a>. The fields and behavior documented here apply to Fan of Insight.</p>
      </Panel>
    </div>
  </PageLayout>;
}
