import re

def modify_prisma():
    with open('src/prisma/contract.prisma', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add @@unique([id, providerId]) to LogisticsFleet
    fleet_end = content.find('}', content.find('model LogisticsFleet {'))
    fleet_constraints = """
  // Structural provider isolation for fleets
  @@unique([id, providerId])
"""
    content = content[:fleet_end] + fleet_constraints + content[fleet_end:]

    # Modify LogisticsVehicle's fleet relation
    old_relation = 'fleet           LogisticsFleet? @relation(fields: [fleetId], references: [id])'
    new_relation = 'fleet           LogisticsFleet? @relation(fields: [fleetId, providerId], references: [id, providerId])'
    content = content.replace(old_relation, new_relation)

    with open('src/prisma/contract.prisma', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    modify_prisma()
