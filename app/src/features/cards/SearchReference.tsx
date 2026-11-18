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
        <p className="mt-2">Plain words search both names and rules text, including reverse faces. Each word must match. Use double quotes to keep a phrase together. Fields and text values ignore capitalization.</p>
        <Fields rows={textFields} /><p className="mt-3">Prefix a quoted name with <code>!</code> to require the whole name. <code>name:</code> matches part of a name.</p><Examples items={examples.text} />
      </Panel>
      <Panel id="facets" className="scroll-mt-24"><h2 className="text-xl font-semibold">Card characteristics</h2>
        <p className="mt-2">Write a field, a colon and its value. Characteristics match complete values; quote values containing spaces. Use the visual filters to discover the values in the catalog.</p>
        <Fields rows={facetFields} /><Examples items={examples.facets} />
      </Panel>
      <Panel id="printing" className="scroll-mt-24"><h2 className="text-xl font-semibold">Sets, rarity &amp; artists</h2>
        <p className="mt-2"><code>set:</code> searches a product family; <code>edition:</code> restricts an exact printing set. Set, edition, rarity and artist restrictions must all match the same printing. A card cannot use one printing for its set and another for its artist.</p>
        <p className="mt-3">Rarity uses numeric codes, not names or comparisons:</p><dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">{Object.entries(RARITY_LABELS).map(([code, label]) => <div className="flex gap-3" key={code}><dt className="font-mono">{code}</dt><dd>{label}</dd></div>)}</dl>
        <Examples items={examples.printing} />
      </Panel>
      <Panel id="numeric" className="scroll-mt-24"><h2 className="text-xl font-semibold">Costs &amp; stats</h2><Fields rows={numericFields} />
        <p className="mt-3">Use <code>:</code> or <code>=</code> for equality, <code>!=</code> for inequality, and <code>&lt; &lt;= &gt; &gt;=</code> for ranges. Write the operator and number together, such as <code>power&gt;=2</code>. Integers and decimals are accepted.</p>
        <p className="mt-3">Comparisons use the main card’s printed stats. A missing or variable value does not match any numeric comparison, including <code>!=</code>. Negating the comparison includes those nonmatches. A printed zero is a real value.</p><Examples items={examples.numeric} />
      </Panel>
      <Panel id="boolean" className="scroll-mt-24"><h2 className="text-xl font-semibold">Combining searches</h2>
        <p className="mt-2">Use <code>AND</code> for both conditions, <code>OR</code> for either, and parentheses to group conditions. The words are case-insensitive. <code>NOT</code> binds first, then <code>AND</code>, then <code>OR</code>. Spaces normally mean AND.</p>
        <p className="mt-3">Adjacent choices for the same characteristic retain the picker’s any-of behavior: <code>type:ally type:action</code> matches either. Use explicit AND when you need both. Repeated name, rules-text and numeric conditions must all match.</p><Examples items={examples.boolean} />
      </Panel>
      <Panel id="exclude" className="scroll-mt-24"><h2 className="text-xl font-semibold">Excluding cards</h2>
        <p className="mt-2">Prefix a condition with <code>-</code>, or use <code>NOT</code>. Negate a group with <code>NOT (…)</code> or <code>-(…)</code>. Excluding a characteristic rejects cards containing that value even if they also have an included value.</p><Examples items={examples.exclude} />
      </Panel>
      <Panel id="tags" className="scroll-mt-24"><h2 className="text-xl font-semibold">Community tags</h2>
        <p className="mt-2">Use <code>tag:</code> in Browse Cards and tag tools. Tags describe community-labeled art or gameplay features. Tag predicates match cards; an individual tag gallery also restricts the printings it displays. Compact pickers, Card Stats and the deck editor do not load tag data and reject this field.</p><Examples items={examples.tags} />
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
