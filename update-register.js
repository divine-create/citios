import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// 1. Update registerRestaurantOS to create a default Location
code = code.replace(
  /await db\.orm\.public\.RestaurantSettings\.create\(\{[\s\S]*?organizationId: org\.id,[\s\S]*?serviceStyle: input\.serviceStyle,[\s\S]*?\}\);/,
  `await db.orm.public.RestaurantSettings.create({
      organizationId: org.id,
      serviceStyle: input.serviceStyle,
    });

    const location = await db.orm.public.Location.create({
      organizationId: org.id,
      name: 'Main Branch',
      address: input.address ?? null,
      citySlug: city.slug,
      isHQ: true,
    });

    await db.orm.public.MembershipLocation.create({
      membershipId: membership.id,
      locationId: location.id,
    });`
);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
