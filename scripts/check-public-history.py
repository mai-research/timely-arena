"""Reject private graph and agent-session files anywhere in a publishable ref."""
import subprocess
import sys
from pathlib import PurePosixPath

PRIVATE_GRAPH_BLOB = 'fbeb87a3ddcb3fcfbd678896cbdfecf46328bd26'
BLOCKED_DIRS = {'.entire', '.claude', '.codex', '.pi'}


def check(ref):
    if ref.startswith(('refs/entire/', 'refs/heads/entire/', 'entire/', 'refs/codex/', 'refs/stash')):
        return [f'{ref}: private bookkeeping ref']
    result = subprocess.run(['git', 'rev-list', '--objects', ref], capture_output=True, text=True)
    if result.returncode:
        return [f'{ref}: cannot inspect history']
    failures = []
    for entry in result.stdout.splitlines():
        oid, _, name = entry.partition(' ')
        path = PurePosixPath(name)
        if (oid == PRIVATE_GRAPH_BLOB or BLOCKED_DIRS.intersection(path.parts)
                or path.name == 'aki-v2.json' or path.name.startswith('.env')
                or path.name in {'full.jsonl', 'transcript.jsonl'}):
            failures.append(f'{ref}: prohibited history object {oid[:12]} {name}')
    return failures


if __name__ == '__main__':
    refs = sys.argv[1:] or ['HEAD']
    failures = [message for ref in refs for message in check(ref)]
    if failures:
        print('\n'.join(failures), file=sys.stderr)
        sys.exit(1)
    print('Public-history check passed: ' + ', '.join(refs))
