"""Read-only corpus inventory and baseline evidence; stdlib only."""
import hashlib, json, pathlib, platform, re, xml.etree.ElementTree as ET
home = pathlib.Path(__file__).resolve().parent.parent
repo = home
base = home / 'baseline-stage1'
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
inventory = []
for folder in sorted((repo / 'apps/tfm-lab/prompts/experiments').iterdir()):
    if not folder.is_dir(): continue
    names = {p.name for p in folder.iterdir() if p.is_file()}
    result = None
    if 'result.json' in names:
        try: result = json.loads((folder / 'result.json').read_text(encoding='utf-8-sig'))['metadata']['status']
        except Exception as e: result = 'unreadable: ' + str(e)
    inventory.append(dict(id=folder.name, has_input=bool({'raw_output.txt','output.dsl'} & names),
      has_normalized='normalized_dsl.txt' in names,
      has_bpmn='diagram.bpmn' in names,
      complete_artifacts={'diagram.bpmn','diagram.svg','diagram.png','result.json'} <= names,
      status=result, files=sorted(names)))
(base / 'corpus-inventory.json').write_text(json.dumps(inventory, indent=2), encoding='utf-8')
summary = dict(directories=len(inventory), with_input=sum(x['has_input'] for x in inventory),
 complete_artifacts=sum(x['complete_artifacts'] for x in inventory),
 without_input=sum(not x['has_input'] for x in inventory),
 with_normalized=sum(x['has_normalized'] for x in inventory),
 with_bpmn=sum(x['has_bpmn'] for x in inventory), statuses={})
for item in inventory:
    status = str(item['status']); summary['statuses'][status] = summary['statuses'].get(status, 0) + 1
coverage = {}
for folder in sorted((base / 'rendered').iterdir()):
    if not folder.is_dir() or not (folder / 'diagram.bpmn').exists(): continue
    root = ET.parse(folder / 'diagram.bpmn').getroot()
    tags = {}
    for el in root.iter():
        tag = el.tag.split('}')[-1]; tags[tag] = tags.get(tag, 0) + 1
    coverage[folder.name] = tags
orig = base / 'original/EXP-FIXTURE-BASELINE-LOCAL-NONE-R01'
adapt = base / 'rendered/s17-document-approval'
parity = {name: {'original': sha(orig / name), 'wrapper': sha(adapt / name),
  'equal': (orig / name).read_bytes() == (adapt / name).read_bytes()}
  for name in ('diagram.bpmn','diagram.svg','diagram.png')}
def canonical_markers(text):
    ids = re.findall(r'<marker id="([^"]+)"', text)
    for i, marker in enumerate(ids): text = text.replace(marker, f'MARKER_{i}')
    return text
parity['svg_marker_ids_normalized_equal'] = canonical_markers((orig/'diagram.svg').read_text()) == canonical_markers((adapt/'diagram.svg').read_text())
engines = {}
for pkg in (repo/'node_modules/.pnpm').glob('*/node_modules/*/package.json'):
    data = json.loads(pkg.read_text(encoding='utf-8'))
    if data.get('engines', {}).get('node'): engines[data['name'] + '@' + data['version']] = data['engines']['node']
fonts = {p.name: sha(p) for p in pathlib.Path('C:/Windows/Fonts').glob('arial*.ttf')}
report = dict(inventory=summary, coverage=coverage, first_case_byte_parity=parity,
  python=platform.python_version(), node='24.12.0', pnpm='11.19.0',
  prompt_v5_sha256=sha(repo / 'apps/company-web/prompts/system/internal_bpmn_dsl_system_prompt_v5.md'),
  handoff_sha256=sha(repo / 'apps/company-web/src/ui/screens/Handoff.tsx'),
  lock_sha256=sha(repo / 'pnpm-lock.yaml'), node_dependency_engines=engines, windows_arial_hashes=fonts,
  work_web='PENDING: no Work execution environment available',
  delegation={'local_schema': 'gpt-5.6-luna / high is advertised; not invoked',
    'work_web': 'PENDING: target tool schema and actual selection unverified', 'generation_calls': 0})
(base / 'audit.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'inventory': summary, 'parity': parity}, indent=2))
