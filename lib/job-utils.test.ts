import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOB_CATEGORIES, parseJobDescription, formatJobTypeLabel } from './job-utils';

test('JOB_CATEGORIES includes All and all 8 Calabar industry categories', () => {
  assert.deepEqual(JOB_CATEGORIES, [
    'All',
    'Banking & Finance',
    'Sales & Marketing',
    'Engineering & Manufacturing',
    'Healthcare & Pharma',
    'Hospitality & Food',
    'Tech & Media',
    'Logistics & Agro',
    'Government & NGO',
  ]);
});

test('parseJobDescription extracts summary, bulleted requirements, applyUrl, and sourceName', () => {
  const raw = [
    'Lead regional sales strategy across Calabar and Cross River State.',
    '',
    'Requirements & Qualifications:',
    '- B.Sc / HND in Marketing or Business Admin.',
    '- 5+ years regional sales management experience.',
    '',
    'APPLY_URL: https://www.myjobmag.com/job/area-sales-manager-lumos-4',
  ].join('\n');

  const parsed = parseJobDescription(raw);
  assert.equal(parsed.summary, 'Lead regional sales strategy across Calabar and Cross River State.');
  assert.deepEqual(parsed.requirements, [
    'B.Sc / HND in Marketing or Business Admin.',
    '5+ years regional sales management experience.',
  ]);
  assert.equal(parsed.applyUrl, 'https://www.myjobmag.com/job/area-sales-manager-lumos-4');
  assert.equal(parsed.sourceName, 'MyJobMag');
});

test('formatJobTypeLabel formats job types cleanly', () => {
  assert.equal(formatJobTypeLabel('FULL_TIME'), 'Full Time');
  assert.equal(formatJobTypeLabel('HYBRID'), 'Hybrid');
  assert.equal(formatJobTypeLabel('TRAINEE'), 'Trainee');
});
