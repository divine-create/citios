import os
import re

actions_dir = 'app/actions'
lib_actions_dir = 'lib/actions'

def scan_files(directory):
    if not os.path.exists(directory): return
    for f in os.listdir(directory):
        if f.endswith('.ts'):
            path = os.path.join(directory, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                funcs = re.findall(r'export async function (\w+)', content)
                for func in funcs:
                    print(f"{path}: {func}")

scan_files(actions_dir)
scan_files(lib_actions_dir)

