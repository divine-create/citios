import os, re

def replace_in_files(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                
                content = re.sub(r'\bstudentId\b', 'studentDataId', content)
                content = re.sub(r'\bcustomerId\b', 'customerDataId', content)
                
                if content != original:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)

replace_in_files('app')
replace_in_files('components')
print('Global UI ID replacements complete')
