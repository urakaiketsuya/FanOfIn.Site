"""Extract literal curated definitions without executing Fractal application code."""
import ast, hashlib, json, pathlib, re, subprocess, sys
source = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/Users/avery/Documents/fractal-of-insight-master')
file = source / 'fractal/archetypes.py'
raw = file.read_bytes()
variables, definitions = {}, []
for statement in ast.parse(raw).body:
    call = statement.value if isinstance(statement, (ast.Expr, ast.Assign)) else None
    if not isinstance(call, ast.Call): continue
    parent = None
    if isinstance(call.func, ast.Name) and call.func.id == 'add_archetype': pass
    elif isinstance(call.func, ast.Attribute) and call.func.attr == 'add_subtype':
        parent = variables[call.func.value.id]
    else: continue
    def literal(node):
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add): return literal(node.left) + literal(node.right)
        if isinstance(node, ast.Attribute) and node.attr == 'require':
            return next(d['rule']['anyCards'] for d in definitions if d['id'] == variables[node.value.id])
        return ast.literal_eval(node)
    args = [literal(a) for a in call.args]
    kw = {k.arg: literal(k.value) for k in call.keywords}
    name = args[0]
    ident = (parent + '--' if parent else 'fractal-') + re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    rule = dict(anyCards=args[1], allCards=[], excludeCards=kw.get('exclude_cards', []), comboGroups=kw.get('require_combos', []), element=kw.get('require_element'), typeCounts=kw.get('require_types', {}))
    definitions.append(dict(id=ident, name=name, parentId=parent, rule=rule, sourceLine=statement.lineno, reviewStatus='unreviewed'))
    if isinstance(statement, ast.Assign): variables[statement.targets[0].id] = ident
try: revision = subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True,stderr=subprocess.DEVNULL).strip()
except subprocess.CalledProcessError: revision = None
out = pathlib.Path(__file__).resolve().parents[2]/'data/reference/fractal-archetypes.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(dict(source=dict(name='Fractal of Insight',url='https://fractalofin.site/deck/',file='fractal/archetypes.py',revision=revision,sha256=hashlib.sha256(raw).hexdigest()),definitions=definitions),indent=2)+'\n')
print(f'Imported {len(definitions)} definitions into {out}')
