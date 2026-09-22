"""Build an offline source+evidence ZIP; installed dependencies stay outside it."""
import hashlib, json, pathlib, zipfile
root = pathlib.Path(__file__).resolve().parent.parent
files = set(json.loads((root/'smoke/source-hashes.json').read_text()))
files.update(['.gitignore', 'AGENTS.md', 'CONTINUAR.md'])
for folder in ('smoke', 'baseline-stage1'):
    files.update(p.relative_to(root).as_posix() for p in (root/folder).rglob('*')
                 if p.is_file() and '__pycache__' not in p.parts)
dest = root/'deliverables'
dest.mkdir(exist_ok=True)
target = dest/'bpmn-stage1-portable.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in sorted(files): z.write(root/name, name)
(dest/'bpmn-stage1-portable.sha256').write_text(hashlib.sha256(target.read_bytes()).hexdigest()+'  '+target.name+'\n')
print(f'{target.name}: {len(files)} files, {target.stat().st_size} bytes')
