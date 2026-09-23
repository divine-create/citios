import os
import re

directories = ['app', 'components', 'lib']
fake_data = []

for d in directories:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    
                    # Mock arrays or hardcoded objects
                    if re.search(r'(const \w+\s*:\s*any\[\]\s*=\s*\[\]|const \w+\s*=\s*\[\{.*?\}\])', content, re.DOTALL):
                        fake_data.append(path)
                    elif 'TODO' in content or 'Mock' in content or 'mock' in content:
                        fake_data.append(path)

for f in set(fake_data):
    print(f)
