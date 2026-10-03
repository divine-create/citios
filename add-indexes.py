import re
import sys

def main():
    file_path = 'src/prisma/contract.prisma'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    def add_index(model_name, index_lines):
        nonlocal content
        pattern = re.compile(rf'(model {model_name} {{[\s\S]*?)(\n}})', re.MULTILINE)
        match = pattern.search(content)
        if match:
            existing = match.group(1)
            # Avoid adding if already there
            to_add = []
            for line in index_lines:
                if line not in existing:
                    to_add.append(line)
            if to_add:
                new_block = existing + '\n' + '\n'.join([f'  {x}' for x in to_add]) + match.group(2)
                content = content.replace(match.group(0), new_block)

    add_index('DeliveryJob', [
        '@@index([providerId])',
        '@@index([sourceType, sourceId])',
        '@@index([status])',
        '@@index([providerId, status])',
        '@@index([createdAt])'
    ])
    add_index('DeliveryDispatch', [
        '@@index([deliveryJobId])',
        '@@index([providerId])',
        '@@index([status])',
        '@@index([createdAt])'
    ])
    add_index('DeliveryAssignment', [
        '@@index([deliveryJobId])',
        '@@index([driverProfileId])',
        '@@index([vehicleId])',
        '@@index([status])'
    ])
    add_index('DeliveryTrackingEvent', [
        '@@index([deliveryJobId])',
        '@@index([providerId])',
        '@@index([driverProfileId])',
        '@@index([recordedAt])'
    ])
    add_index('LogisticsSettlement', [
        '@@index([providerId])',
        '@@index([status])',
        '@@index([providerId, status])',
        '@@index([createdAt])'
    ])
    add_index('ProofOfDelivery', [
        '@@index([providerId])'
    ])
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()
