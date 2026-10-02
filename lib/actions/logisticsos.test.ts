import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { db } from '@/src/prisma/db';
import { createDeliveryJob, transitionDeliveryStatus, assignDelivery, LogisticsDomainError } from './logistics-domain';

describe('LogisticsOS Domain Foundation', () => {
    
    async function setupData() {
        const orgA = await db.orm.public.Organization.create({ name: 'Org A', type: 'LOGISTICS' });
        const orgB = await db.orm.public.Organization.create({ name: 'Org B', type: 'LOGISTICS' });
        
        const personA = await db.orm.public.Person.create({ firstName: 'Alice', lastName: 'A' });
        const personB = await db.orm.public.Person.create({ firstName: 'Bob', lastName: 'B' });
        
        const driverA = await db.orm.public.LogisticsDriverProfile.create({ personId: personA.id, providerId: orgA.id });
        const driverB = await db.orm.public.LogisticsDriverProfile.create({ personId: personB.id, providerId: orgB.id });
        
        return { orgA, orgB, driverA, driverB };
    }

    test('Provider isolation - Provider A job + Provider B driver = rejected', async () => {
        const { orgA, orgB, driverA, driverB } = await setupData();

        const job = await createDeliveryJob({
            providerId: orgA.id,
            sourceType: 'RETAIL_ORDER',
            sourceId: 'src-1',
            idempotencyKey: 'iso-key-1',
            dropoffAddress: '123 Main'
        });

        await assert.rejects(
            assignDelivery({
                deliveryJobId: job.id,
                driverProfileId: driverB.id,
                providerId: orgA.id
            }),
            { message: 'Provider isolation violation: Driver does not belong to provider' }
        );
    });

    test('Provider isolation - Provider A job + Provider A driver = allowed', async () => {
        const { orgA, driverA } = await setupData();

        const job = await createDeliveryJob({
            providerId: orgA.id,
            sourceType: 'RETAIL_ORDER',
            sourceId: 'src-2',
            idempotencyKey: 'iso-key-2',
            dropoffAddress: '123 Main'
        });

        const assignment = await assignDelivery({
            deliveryJobId: job.id,
            driverProfileId: driverA.id,
            providerId: orgA.id
        });

        assert.ok(assignment.id, 'Assignment should be created');
    });

    test('Assignment concurrency - Prevents one driver from taking multiple jobs', async () => {
        const { orgA, driverA } = await setupData();

        const job1 = await createDeliveryJob({
            providerId: orgA.id,
            sourceType: 'RETAIL_ORDER',
            sourceId: 'src-3',
            idempotencyKey: 'conc-key-1',
            dropoffAddress: '123 Main'
        });

        const job2 = await createDeliveryJob({
            providerId: orgA.id,
            sourceType: 'RETAIL_ORDER',
            sourceId: 'src-4',
            idempotencyKey: 'conc-key-2',
            dropoffAddress: '123 Main'
        });

        await assignDelivery({ deliveryJobId: job1.id, driverProfileId: driverA.id, providerId: orgA.id });

        await assert.rejects(
            assignDelivery({ deliveryJobId: job2.id, driverProfileId: driverA.id, providerId: orgA.id }),
            { message: 'Concurrency error: Driver already has an active assignment' }
        );
    });
    
    test('Assignment concurrency - Prevents one job from being taken by multiple drivers', async () => {
        const { orgA, driverA, driverB, orgB } = await setupData();
        const personC = await db.orm.public.Person.create({ firstName: 'Charlie', lastName: 'C' });
        const driverC = await db.orm.public.LogisticsDriverProfile.create({ personId: personC.id, providerId: orgA.id });

        const job = await createDeliveryJob({
            providerId: orgA.id,
            sourceType: 'RETAIL_ORDER',
            sourceId: 'src-5',
            idempotencyKey: 'conc-key-3',
            dropoffAddress: '123 Main'
        });

        await assignDelivery({ deliveryJobId: job.id, driverProfileId: driverA.id, providerId: orgA.id });

        await assert.rejects(
            assignDelivery({ deliveryJobId: job.id, driverProfileId: driverC.id, providerId: orgA.id }),
            { message: 'Concurrency error: Job already has an active assignment' }
        );
    });

    test('Idempotency - Provider A + key X and Provider B + key X do not collide', async () => {
        const { orgA, orgB } = await setupData();
        const idKey = 'test-idempotency-3';
        
        const jobA = await createDeliveryJob({
            providerId: orgA.id,
            sourceType: 'RETAIL_ORDER',
            sourceId: 'order-1',
            idempotencyKey: idKey,
            dropoffAddress: '123 Main St'
        });

        const jobB = await createDeliveryJob({
            providerId: orgB.id,
            sourceType: 'RETAIL_ORDER',
            sourceId: 'order-2',
            idempotencyKey: idKey,
            dropoffAddress: '456 Oak St'
        });

        assert.notStrictEqual(jobA.id, jobB.id, 'Should create separate jobs for different providers');
    });

    test('State transitions - invalid transitions are rejected', async () => {
        const { orgA } = await setupData();
        const job = await createDeliveryJob({
            providerId: orgA.id,
            sourceType: 'RETAIL_ORDER',
            sourceId: 'order-trans-2',
            idempotencyKey: 'trans-2',
            dropoffAddress: '123 Main St'
        });
        
        await assert.rejects(
            transitionDeliveryStatus(job.id, 'COMPLETED', orgA.id),
            { message: 'Invalid transition from REQUESTED to COMPLETED' }
        );
    });
});
