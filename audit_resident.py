import os
import re
import json

app_dir = 'app/(resident)'
findings = []

for root, _, files in os.walk(app_dir):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                
                # Check for mock data
                mocks = re.findall(r'(const \w+\s*:\s*any\[\]\s*=\s*\[\]|const \w+\s*=\s*\[\{.*?\}\])', content, re.DOTALL)
                has_db = 'db.' in content or 'await get' in content or 'import {' in content and 'actions' in content
                
                if len(mocks) > 0:
                    findings.append({'file': path, 'status': 'Contains Mock Data / Hardcoded array'})
                elif not has_db:
                    findings.append({'file': path, 'status': 'No data fetching (Static?)'})
                else:
                    findings.append({'file': path, 'status': 'Likely connected to backend'})

for f in findings:
    print(f"{f['file']} -> {f['status']}")
