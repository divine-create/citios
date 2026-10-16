import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchMyResidentTasks,
  fetchResidentTaskDetail,
  cancelResidentTask,
} from '@/app/actions/service';

test('Resident Tasks & Appointments Tracking Suite', async (t) => {
  await t.test('1. fetchMyResidentTasks safely handles anonymous/unauthenticated callers', async () => {
    const res = await fetchMyResidentTasks();
    assert.equal(res.success, false, 'Anonymous caller should not succeed');
    assert.equal(res.requiresAuth, true, 'Should flag requiresAuth: true');
    assert.ok(Array.isArray(res.tasks), 'Tasks should be an array');
    assert.equal(res.tasks.length, 0, 'Tasks should be empty for anonymous user');
  });

  await t.test('2. fetchResidentTaskDetail rejects anonymous callers safely', async () => {
    const res = await fetchResidentTaskDetail('non-existent-task-id');
    assert.equal(res.success, false, 'Anonymous call should fail');
    assert.equal(res.requiresAuth, true, 'Should flag requiresAuth: true');
    assert.equal(res.task, null, 'Task should be null');
  });

  await t.test('3. cancelResidentTask rejects anonymous callers safely', async () => {
    const res = await cancelResidentTask('any-task-id', 'Resident requested cancellation');
    assert.equal(res.success, false, 'Anonymous call should fail');
    assert.equal(res.requiresAuth, true, 'Should flag requiresAuth: true');
  });
});
