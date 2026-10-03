import re

def modify_prisma():
    with open('src/prisma/contract.prisma', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Modify DeliveryJob
    # 1. Remove @unique from idempotencyKey
    content = content.replace('idempotencyKey  String?      @unique', 'idempotencyKey  String?')
    
    # 2. Add composite unique constraint to DeliveryJob and activeAssignment
    # Find the end of DeliveryJob model
    job_end = content.find('}', content.find('model DeliveryJob {'))
    job_constraints = """
  // Ensure provider-scoped idempotency
  @@unique([providerId, idempotencyKey])
"""
    content = content[:job_end] + job_constraints + content[job_end:]
    
    # Modify DeliveryAssignment
    # Find the end of DeliveryAssignment model
    assignment_end = content.find('}', content.find('model DeliveryAssignment {'))
    assignment_constraints = """
  // NOTE: Prisma schema lacks native partial indexes for active statuses.
  // The invariant "one active assignment per delivery/driver/vehicle" 
  // MUST be enforced via transactional read-then-write in application logic.
"""
    # Replace the old constraint
    content = content.replace('@@unique([deliveryJobId, driverProfileId, status])', assignment_constraints)

    with open('src/prisma/contract.prisma', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Updated contract.prisma")

if __name__ == "__main__":
    modify_prisma()
