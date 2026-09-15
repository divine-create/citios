import os
import re

def search_files(directory):
    pattern = re.compile(r'db\.orm\.public\.(User|Student(?![a-zA-Z])|StaffProfile|OrganizationMember|OrgCustomer|RetailCustomer|ServiceStaff|Wallet)', re.IGNORECASE)
    matches = set()
    for root, dirs, files in os.walk(directory):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in ['.next', 'node_modules', 'migrations', 'scratch', 'docs', '.git']]
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                if file.endswith('.d.ts'):
                    continue
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        for line in f:
                            if pattern.search(line):
                                matches.add(path)
                                break
                except Exception:
                    pass
    for match in matches:
        print(match)

search_files('.')
