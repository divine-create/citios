"""
Fix scripts/seed.ts and simulate.ts to use V1 Identity Model:
- User -> Person + Account (via PersonIdentifier for email lookup)
- OrganizationMember -> Membership + MembershipRole
- StaffProfile.memberId -> StaffData.membershipId (existing EduOS schema field)
- GigWorkerProfile.userId -> GigWorkerProfile.personId
- Task.requesterId -> Task.requesterPersonId
- Task.courierId -> Task.courierProfileId (needs gig profile id, not user id)
- Appointment.patientId -> patientDataId, doctorId -> staffMembershipId
- Prescription.patientId -> patientDataId
- Wallet.userId -> Wallet.personId
- PostLike.userId -> PostLike.personId
- Comment.userId -> Comment.personId
"""

import re

# -----------------------------------------------------------------------
# Helper: a reusable function to insert into seed.ts at the top
# -----------------------------------------------------------------------

HELPER = """\
// ---- V1 Identity helpers (used throughout this seed file) ----

/** Find a Person by email via PersonIdentifier, or create one. */
async function findOrCreatePerson(name: string, email: string) {
  const emailId = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: email.toLowerCase() }).all().first();
  if (emailId) {
    const p = await db.orm.public.Person.where({ id: emailId.personId }).all().first();
    if (p) return p;
  }
  const [firstName, ...lastNames] = name.split(' ');
  const person = await db.orm.public.Person.create({
    firstName: firstName || name,
    lastName: lastNames.join(' ') || '',
  });
  await db.orm.public.PersonIdentifier.create({ personId: person.id, type: 'EMAIL', normalizedValue: email.toLowerCase() });
  return person;
}

/** Find or create a Membership for a Person in an Org. */
async function findOrCreateMembership(personId: string, organizationId: string) {
  const existing = await db.orm.public.Membership.where({ personId, organizationId }).all().first();
  if (existing) return existing;
  return db.orm.public.Membership.create({ personId, organizationId });
}

/** Add a role to a Membership if it doesn't already have it. */
async function ensureMembershipRole(membershipId: string, role: string) {
  const existing = await db.orm.public.MembershipRole.where({ membershipId, role }).all().first();
  if (!existing) await db.orm.public.MembershipRole.create({ membershipId, role });
}
"""


def fix_seed(content: str) -> str:
    # 1. Inject helpers after the findOrCreateOrg function
    content = content.replace(
        "async function main() {\n  console.log('Seeding database...');",
        HELPER + "\nasync function main() {\n  console.log('Seeding database...');"
    )

    # 2. adminUser: User -> Person via findOrCreatePerson
    content = content.replace(
        "  let adminUser = await db.orm.public.User.where({ email: 'admin@cityconnect.local' }).all().first();\n"
        "  if (!adminUser) {\n"
        "    adminUser = await db.orm.public.User.create({\n"
        "      name: 'City Planner',\n"
        "      email: 'admin@cityconnect.local',\n"
        "    });\n"
        "  }",
        "  const adminUser = await findOrCreatePerson('City Planner', 'admin@cityconnect.local');"
    )

    # 3. teacherMember: OrganizationMember -> Membership + MembershipRole
    content = content.replace(
        "  let teacherMember = await db.orm.public.OrganizationMember\n"
        "    .where({ userId: adminUser.id, organizationId: school.id, role: 'TEACHER' })\n"
        "    .all()\n"
        "    .first();\n"
        "  if (!teacherMember) {\n"
        "    teacherMember = await db.orm.public.OrganizationMember.create({\n"
        "      userId: adminUser.id,\n"
        "      organizationId: school.id,\n"
        "      role: 'TEACHER',\n"
        "    });\n"
        "  }",
        "  const teacherMember = await findOrCreateMembership(adminUser.id, school.id);\n"
        "  await ensureMembershipRole(teacherMember.id, 'TEACHER');"
    )

    # 4. StaffProfile -> StaffData (the V1 replacement)
    #    StaffProfile.memberId -> StaffData.membershipId
    content = content.replace(
        "  let staffProfile = await db.orm.public.StaffProfile.where({ memberId: teacherMember.id }).all().first();\n"
        "  if (!staffProfile) {\n"
        "    staffProfile = await db.orm.public.StaffProfile.create({\n"
        "      organizationId: school.id,\n"
        "      memberId: teacherMember.id,",
        "  let staffProfile = await db.orm.public.StaffData.where({ membershipId: teacherMember.id }).all().first();\n"
        "  if (!staffProfile) {\n"
        "    staffProfile = await db.orm.public.StaffData.create({\n"
        "      membershipId: teacherMember.id,"
    )

    # 5. School staff seeds loop: User + OrganizationMember + StaffProfile -> Person + Membership + MembershipRole + StaffData
    old_school_staff_loop = (
        "  for (const staffSeed of schoolStaffSeeds) {\n"
        "    let staffUser = await db.orm.public.User.where({ email: staffSeed.email }).all().first();\n"
        "    if (!staffUser) {\n"
        "      staffUser = await db.orm.public.User.create({ name: staffSeed.name, email: staffSeed.email });\n"
        "    }\n"
        "    const existingMembership = await db.orm.public.OrganizationMember\n"
        "      .where({ userId: staffUser.id, organizationId: school.id })\n"
        "      .all()\n"
        "      .first();\n"
        "    if (!existingMembership) {\n"
        "      const member = await db.orm.public.OrganizationMember.create({\n"
        "        userId: staffUser.id,\n"
        "        organizationId: school.id,\n"
        "        role: staffSeed.role,\n"
        "      });\n"
        "      // Also create a staff profile for them\n"
        "      await db.orm.public.StaffProfile.create({\n"
        "        organizationId: school.id,\n"
        "        memberId: member.id,\n"
        "        employeeId: 'EMP-' + Math.floor(Math.random() * 10000),\n"
        "        jobTitle: staffSeed.name\n"
        "      });\n"
        "    }\n"
        "  }"
    )
    new_school_staff_loop = (
        "  for (const staffSeed of schoolStaffSeeds) {\n"
        "    const staffPerson = await findOrCreatePerson(staffSeed.name, staffSeed.email);\n"
        "    const staffMembership = await findOrCreateMembership(staffPerson.id, school.id);\n"
        "    await ensureMembershipRole(staffMembership.id, staffSeed.role);\n"
        "    const existingStaffData = await db.orm.public.StaffData.where({ membershipId: staffMembership.id }).all().first();\n"
        "    if (!existingStaffData) {\n"
        "      await db.orm.public.StaffData.create({\n"
        "        membershipId: staffMembership.id,\n"
        "        employeeId: 'EMP-' + Math.floor(Math.random() * 10000),\n"
        "      });\n"
        "    }\n"
        "  }"
    )
    content = content.replace(old_school_staff_loop, new_school_staff_loop)

    # 6. Parent seeds loop: User + StudentParent -> Person + FamilyLink
    old_parent_loop = (
        "  for (const parentSeed of parentSeeds) {\n"
        "    let parentUser = await db.orm.public.User.where({ email: parentSeed.email }).all().first();\n"
        "    if (!parentUser) {\n"
        "      parentUser = await db.orm.public.User.create({ name: parentSeed.name, email: parentSeed.email });\n"
        "    }"
    )
    new_parent_loop = (
        "  for (const parentSeed of parentSeeds) {\n"
        "    const parentUser = await findOrCreatePerson(parentSeed.name, parentSeed.email);"
    )
    content = content.replace(old_parent_loop, new_parent_loop)

    # 7. studentUser + guardianId -- the comment says "guardianId closest fit",
    #    but the V1 model uses FamilyLink. We can leave guard as a PersonId link.
    content = content.replace(
        "  let studentUser = await db.orm.public.User.where({ email: 'student@cityconnect.local' }).all().first();\n"
        "  if (!studentUser) {\n"
        "    studentUser = await db.orm.public.User.create({ name: 'Alex Johnson (Student)', email: 'student@cityconnect.local' });\n"
        "  }\n"
        "  if (!student1.guardianId) {\n"
        "    await db.orm.public.Student.where({ id: student1.id }).update({ guardianId: studentUser.id });\n"
        "  }",
        "  const studentUser = await findOrCreatePerson('Alex Johnson', 'student@cityconnect.local');\n"
        "  // Note: student self-portal access is via Relationship lookup by personId in V1"
    )

    # 8. registrar/counselor/principal User lookups (read-only lookups used elsewhere)
    for email, name, varName in [
        ('registrar@cityconnect.local', 'Sofia Alvarez', 'registrarUser'),
        ('counselor@cityconnect.local', 'Dr. James Okafor', 'counselorUser'),
        ('principal@cityconnect.local', 'Principal', 'principalUser'),
    ]:
        content = content.replace(
            f"  const {varName} = await db.orm.public.User.where({{ email: '{email}' }}).all().first();",
            f"  const {varName} = await db.orm.public.PersonIdentifier.where({{ type: 'EMAIL', normalizedValue: '{email}' }}).all().first().then(async (id) => id ? db.orm.public.Person.where({{ id: id.personId }}).all().first() : null);"
        )

    # 9. Healthcare: OrganizationMember doctor + wrong Appointment/Prescription fields
    content = content.replace(
        "    const doctor = await db.orm.public.OrganizationMember.create({\n"
        "      userId: adminUser.id,\n"
        "      organizationId: clinic.id,\n"
        "      role: 'DOCTOR',\n"
        "    });\n\n"
        "    await db.orm.public.Appointment.create({\n"
        "      date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000), // Tomorrow\n"
        "      reason: 'Annual Checkup',\n"
        "      status: 'SCHEDULED',\n"
        "      patientId: adminUser.id,\n"
        "      doctorId: doctor.id,\n"
        "      organizationId: clinic.id,\n"
        "    });\n\n"
        "    await db.orm.public.Prescription.create({\n"
        "      medication: 'Amoxicillin 500mg',\n"
        "      dosage: 'Take 1 pill every 8 hours',\n"
        "      instructions: 'Take with food.',\n"
        "      status: 'ISSUED',\n"
        "      patientId: adminUser.id,\n"
        "      organizationId: clinic.id,\n"
        "    });",
        "    const doctorMembership = await findOrCreateMembership(adminUser.id, clinic.id);\n"
        "    await ensureMembershipRole(doctorMembership.id, 'DOCTOR');\n\n"
        "    // Create PatientData for admin so they can be a patient\n"
        "    const patientRel = await db.orm.public.Relationship.where({ personId: adminUser.id, organizationId: clinic.id, type: 'CUSTOMER' }).all().first()\n"
        "      || await db.orm.public.Relationship.create({ personId: adminUser.id, organizationId: clinic.id, type: 'CUSTOMER' });\n"
        "    const patientData = await db.orm.public.PatientData.where({ relationshipId: patientRel.id }).all().first()\n"
        "      || await db.orm.public.PatientData.create({ relationshipId: patientRel.id });\n\n"
        "    await db.orm.public.Appointment.create({\n"
        "      date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000), // Tomorrow\n"
        "      reason: 'Annual Checkup',\n"
        "      status: 'SCHEDULED',\n"
        "      patientDataId: patientData.id,\n"
        "      staffMembershipId: doctorMembership.id,\n"
        "      organizationId: clinic.id,\n"
        "    });\n\n"
        "    await db.orm.public.Prescription.create({\n"
        "      medication: 'Amoxicillin 500mg',\n"
        "      dosage: 'Take 1 pill every 8 hours',\n"
        "      instructions: 'Take with food.',\n"
        "      status: 'ISSUED',\n"
        "      patientDataId: patientData.id,\n"
        "      organizationId: clinic.id,\n"
        "    });"
    )

    # 10. Logistics: GigWorkerProfile.userId -> personId, Task.requesterId -> requesterPersonId, courierId -> courierProfileId
    content = content.replace(
        "    await db.orm.public.GigWorkerProfile.where({ userId: adminUser.id }).all().first().then(async (existing) => {\n"
        "      if (!existing) {\n"
        "        await db.orm.public.GigWorkerProfile.create({\n"
        "          userId: adminUser.id, // Reusing admin as a worker for simplicity\n"
        "          vehicleType: 'CAR',\n"
        "          licensePlate: 'ABC-1234',\n"
        "          isOnline: true,\n"
        "          rating: 4.8,\n"
        "        });\n"
        "      }\n"
        "    });",
        "    let adminGigProfile = await db.orm.public.GigWorkerProfile.where({ personId: adminUser.id }).all().first();\n"
        "    if (!adminGigProfile) {\n"
        "      adminGigProfile = await db.orm.public.GigWorkerProfile.create({\n"
        "        personId: adminUser.id,\n"
        "        vehicleType: 'CAR',\n"
        "        licensePlate: 'ABC-1234',\n"
        "        isOnline: true,\n"
        "        rating: 4.8,\n"
        "      });\n"
        "    }"
    )

    content = content.replace(
        "      requesterId: adminUser.id,\n"
        "      organizationId: logisticsOrg.id,\n"
        "    });\n\n"
        "    const task2 = await db.orm.public.Task.create({\n"
        "      type: 'SERVICE_DISPATCH',\n"
        "      status: 'ACCEPTED',\n"
        "      pickupAddress: 'Not Applicable',\n"
        "      dropoffAddress: '456 Oak Lane',\n"
        "      price: 0.0, // TBD by quote\n"
        "      requesterId: adminUser.id,\n"
        "      courierId: adminUser.id, // Handled by this worker",
        "      requesterPersonId: adminUser.id,\n"
        "      organizationId: logisticsOrg.id,\n"
        "    });\n\n"
        "    const task2 = await db.orm.public.Task.create({\n"
        "      type: 'SERVICE_DISPATCH',\n"
        "      status: 'ACCEPTED',\n"
        "      pickupAddress: 'Not Applicable',\n"
        "      dropoffAddress: '456 Oak Lane',\n"
        "      price: 0.0, // TBD by quote\n"
        "      requesterPersonId: adminUser.id,\n"
        "      courierProfileId: adminGigProfile?.id, // Handled by this worker"
    )

    # 11. Retail staff seeds
    old_retail_staff = (
        "  for (const staffSeed of retailStaffSeeds) {\n"
        "    let staffUser = await db.orm.public.User.where({ email: staffSeed.email }).all().first();\n"
        "    if (!staffUser) {\n"
        "      staffUser = await db.orm.public.User.create({ name: staffSeed.name, email: staffSeed.email });\n"
        "    }\n"
        "    const existingMember = await db.orm.public.OrganizationMember.where({ userId: staffUser.id, organizationId: retail.id }).all().first();\n"
        "    if (!existingMember) {\n"
        "      await db.orm.public.OrganizationMember.create({ userId: staffUser.id, organizationId: retail.id, role: staffSeed.role });\n"
        "    }\n"
        "  }"
    )
    new_retail_staff = (
        "  for (const staffSeed of retailStaffSeeds) {\n"
        "    const staffPerson = await findOrCreatePerson(staffSeed.name, staffSeed.email);\n"
        "    const staffMembership = await findOrCreateMembership(staffPerson.id, retail.id);\n"
        "    await ensureMembershipRole(staffMembership.id, staffSeed.role);\n"
        "  }"
    )
    content = content.replace(old_retail_staff, new_retail_staff)

    # 12. demoUser + ensureOwnerMembership
    content = content.replace(
        "  let demoUser = await db.orm.public.User.where({ email: 'demo@cityconnect.local' }).all().first();\n"
        "  if (!demoUser) {\n"
        "    demoUser = await db.orm.public.User.create({\n"
        "      name: 'Demo Admin',\n"
        "      email: 'demo@cityconnect.local',\n"
        "    });\n"
        "  }\n\n"
        "  async function ensureOwnerMembership(organizationId: string) {\n"
        "    const existing = await db.orm.public.OrganizationMember.where({\n"
        "      userId: demoUser!.id,\n"
        "      organizationId,\n"
        "    }).all().first();\n"
        "    if (!existing) {\n"
        "      await db.orm.public.OrganizationMember.create({\n"
        "        userId: demoUser!.id,\n"
        "        organizationId,\n"
        "        role: 'OWNER',\n"
        "      });\n"
        "    }\n"
        "  }",
        "  const demoUser = await findOrCreatePerson('Demo Admin', 'demo@cityconnect.local');\n\n"
        "  async function ensureOwnerMembership(organizationId: string) {\n"
        "    const m = await findOrCreateMembership(demoUser.id, organizationId);\n"
        "    await ensureMembershipRole(m.id, 'OWNER');\n"
        "  }"
    )

    # 13. demoGigProfile: userId -> personId
    content = content.replace(
        "  const demoGigProfile = await db.orm.public.GigWorkerProfile.where({ userId: demoUser.id }).all().first();\n"
        "  if (!demoGigProfile) {\n"
        "    await db.orm.public.GigWorkerProfile.create({\n"
        "      userId: demoUser.id,\n"
        "      vehicleType: 'CAR',\n"
        "      licensePlate: 'DEMO-001',\n"
        "      isOnline: true,\n"
        "      rating: 5.0,\n"
        "    });\n"
        "  }",
        "  const demoGigProfile = await db.orm.public.GigWorkerProfile.where({ personId: demoUser.id }).all().first();\n"
        "  if (!demoGigProfile) {\n"
        "    await db.orm.public.GigWorkerProfile.create({\n"
        "      personId: demoUser.id,\n"
        "      vehicleType: 'CAR',\n"
        "      licensePlate: 'DEMO-001',\n"
        "      isOnline: true,\n"
        "      rating: 5.0,\n"
        "    });\n"
        "  }"
    )

    return content


def fix_simulate(content: str) -> str:
    # Replace entire User-based section with Person + PersonIdentifier
    content = content.replace(
        "    // 1. User Creation\n"
        "    console.log(\"\\n[1/5] Simulating User Onboarding...\");\n"
        "    const email = \"simulated.user@cityconnect.local\";\n"
        "    let user = await db.orm.public.User.where({ email }).all().first();\n"
        "    \n"
        "    if (!user) {\n"
        "        user = await db.orm.public.User.create({\n"
        "            email,\n"
        "            name: \"Simulated Tester\",\n"
        "        });\n"
        "        console.log(`✅ Created new user: ${user.name} (${user.email})`);\n"
        "    } else {\n"
        "        console.log(`✅ Found existing simulated user: ${user.name}`);\n"
        "    }",
        "    // 1. Person Creation (V1 Identity Model)\n"
        "    console.log(\"\\n[1/5] Simulating User Onboarding...\");\n"
        "    const email = \"simulated.user@cityconnect.local\";\n"
        "    let person;\n"
        "    const existingId = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: email.toLowerCase() }).all().first();\n"
        "    if (existingId) {\n"
        "        person = await db.orm.public.Person.where({ id: existingId.personId }).all().first();\n"
        "        console.log(`✅ Found existing simulated person: ${person?.firstName}`);\n"
        "    } else {\n"
        "        person = await db.orm.public.Person.create({ firstName: 'Simulated', lastName: 'Tester' });\n"
        "        await db.orm.public.PersonIdentifier.create({ personId: person!.id, type: 'EMAIL', normalizedValue: email.toLowerCase() });\n"
        "        console.log(`✅ Created new person: ${person?.firstName} (${email})`);\n"
        "    }"
    )
    # Wallet
    content = content.replace(
        "    // Initialize Wallet (simulating profile.ts logic)\n"
        "    let wallet = await db.orm.public.Wallet.where({ userId: user.id }).all().first();\n"
        "    if (!wallet) {\n"
        "        wallet = await db.orm.public.Wallet.create({\n"
        "            userId: user.id,\n"
        "            balance: 0,\n"
        "            type: 'RESIDENT'\n"
        "        });\n"
        "        console.log(`✅ Initialized CityWallet for user. Balance: ${wallet.balance}`);\n"
        "    } else {\n"
        "        console.log(`✅ CityWallet already exists. Balance: ${wallet.balance}`);\n"
        "    }",
        "    // Initialize Wallet\n"
        "    let wallet = await db.orm.public.Wallet.where({ personId: person!.id }).all().first();\n"
        "    if (!wallet) {\n"
        "        wallet = await db.orm.public.Wallet.create({\n"
        "            personId: person!.id,\n"
        "            balance: 0,\n"
        "            currency: 'USD',\n"
        "        });\n"
        "        console.log(`✅ Initialized CityWallet for person. Balance: ${wallet.balance}`);\n"
        "    } else {\n"
        "        console.log(`✅ CityWallet already exists. Balance: ${wallet.balance}`);\n"
        "    }"
    )
    # PostLike userId -> personId
    content = content.replace(
        "    const like = await db.orm.public.PostLike.create({\n"
        "        postId: post.id,\n"
        "        userId: user.id\n"
        "    });",
        "    const like = await db.orm.public.PostLike.create({\n"
        "        postId: post.id,\n"
        "        personId: person!.id\n"
        "    });"
    )
    # Comment userId -> personId
    content = content.replace(
        "    const comment = await db.orm.public.Comment.create({\n"
        "        postId: post.id,\n"
        "        userId: user.id,\n"
        "        content: \"Wow, CityConnect is working flawlessly! Excited for the launch.\"\n"
        "    });",
        "    const comment = await db.orm.public.Comment.create({\n"
        "        postId: post.id,\n"
        "        personId: person!.id,\n"
        "        content: \"Wow, CityConnect is working flawlessly! Excited for the launch.\"\n"
        "    });"
    )
    return content


with open('scripts/seed.ts', 'r', encoding='utf-8') as f:
    seed = f.read()
seed = fix_seed(seed)
with open('scripts/seed.ts', 'w', encoding='utf-8') as f:
    f.write(seed)

with open('simulate.ts', 'r', encoding='utf-8') as f:
    sim = f.read()
sim = fix_simulate(sim)
with open('simulate.ts', 'w', encoding='utf-8') as f:
    f.write(sim)

print("Done")
