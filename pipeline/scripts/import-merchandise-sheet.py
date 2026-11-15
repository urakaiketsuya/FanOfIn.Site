"""Import the reviewed workbook layout; run from the repository root with an XLSX path."""
import zipfile,xml.etree.ElementTree as E,json,collections
from pathlib import Path
import sys
if len(sys.argv) != 2:
 raise SystemExit("Usage: python3 pipeline/scripts/import-merchandise-sheet.py source.xlsx")
z=zipfile.ZipFile(sys.argv[1])
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'};ss=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]; sheets=list(E.fromstring(z.read('xl/workbook.xml')).find('s:sheets',n));out=[]
expected_sheets = {2: 'Promotional', 3: 'Artist', 4: 'Organized Play', 5: 'DOA-FTC', 7: 'ALC-MRC', 8: 'AMB-HVN', 9: 'DTR-PTM', 10: 'RDO', 11: 'PRD-', 12: 'GA Merch'}
for index, name in expected_sheets.items():
 if len(sheets) < index or sheets[index - 1].get('name') != name or sheets[index - 1].get('state') == 'hidden':
  raise SystemExit(f"Workbook layout changed at sheet {index}; review the import mapping before refreshing.")

def read(i):
 root=E.fromstring(z.read(f'xl/worksheets/sheet{i}.xml')); cells={c.get('r'):ss[int(c.find('s:v',n).text)].strip() for c in root.findall('.//s:c',n) if c.get('t')=='s' and c.find('s:v',n) is not None};rels={r.get('Id'):r.get('Target') for r in E.fromstring(z.read(f'xl/worksheets/_rels/sheet{i}.xml.rels'))}; links={h.get('ref'):rels[h.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')] for h in root.findall('.//s:hyperlink',n)};return cells,links
def add(i,cell,category,detail='',photo=''):
 name=cells.get(cell,'')
 if not name:return
 out.append(dict(id=f'sheet-{i}-{cell.lower()}',name=name,category=category,detail=detail,photoUrl=photo,sourceSheet=sheets[i-1].get('name'),sourceCell=cell))
for i in [2,3,4,5,7,8,9,10,11]:
 cells,links=read(i)
 cols=['A','F'] if i==3 else ['A','D','G','J','M']
 for col in cols:
  for row in range(5 if i==4 else 4,100):
   cell=f'{col}{row}';name=cells.get(cell,'')
   if not name or name in ['Name','Image','Link']:continue
   if i==3: detail=' · '.join(filter(None,[cells.get(f'{chr(ord(col)+1)}{row}'),cells.get(f'{chr(ord(col)+2)}{row}')]))
   elif i==4:detail=cells.get(f'{col}3','')
   else:detail=sheets[i-1].get('name')
   add(i,cell,'Artist playmats' if i==3 else 'Playmats',detail,links.get(f'{chr(ord(col)+(3 if i==3 else 1))}{row}',''))
 # Promotional D3 and G3 are entries beside the A3 header.
 if i==2:
  for col in ['D','G']:add(i,col+'3','Playmats','Promotional',links.get(chr(ord(col)+1)+'3',''))
cells,links=read(12)
for col,start,end,category,meta in [('B',13,27,'Deckboxes',False),('F',13,21,'Double deckboxes',False),('I',13,28,'Compact deckboxes',False),('L',13,15,'Lightweight deckboxes',False),('L',19,21,'Plastic deckboxes',False),('B',38,79,'Sleeves',True),('B',85,98,'Standees',False),('B',109,126,'Clothing',False),('B',133,140,'Merchandise sets',False),('B',150,159,'Event entry items',True),('B',168,188,'Jumbo cards',False),('B',194,202,'Art blocks',True),('B',208,213,'Figures and plushies',False),('B',218,243,'Accessories',True)]:
 for row in range(start,end+1):add(12,f'{col}{row}',category,cells.get(f'C{row}','') if meta else '')
Path('app/src/features/merchandise/catalog.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(len(out),collections.Counter(x['category'] for x in out))
