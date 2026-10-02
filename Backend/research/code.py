from pathlib import Path

IGNORE_DIRS = {'__pycache__', '.venv', 'venv', '.git', 'migrations'}
IGNORE_FILES = {'RESEARCH_CODE_SNAPSHOT.md', 'dump_research.py', '__init__.py'}
OUTPUT_FILE = 'RESEARCH_CODE_SNAPSHOT.md'

def generate_snapshot():
    root = Path('.')
    lines = ["# Codebase Snapshot: Research Module\n"]
    
    files = [
        p for p in sorted(root.rglob('*.py'))
        if not any(d in p.parts for d in IGNORE_DIRS) and p.name not in IGNORE_FILES
    ]
    
    lines.append("## File Structure\n")
    for f in files:
        lines.append(f"- `{f.as_posix()}`")
    lines.append("\n---\n")
    
    lines.append("## Source Code\n")
    for f in files:
        content = f.read_text(encoding='utf-8').strip()
        if content:
            lines.append(f"### `{f.as_posix()}`")
            lines.append(f"```python\n{content}\n```\n")
            
    Path(OUTPUT_FILE).write_text('\n'.join(lines), encoding='utf-8')
    print(f"Snapshot berhasil dibuat: {OUTPUT_FILE} ({len(files)} files)")

if __name__ == '__main__':
    generate_snapshot()