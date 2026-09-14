#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/94e1150cb7b8af08e3c94529335eb2d08e1281e487a9671a234c3762eae1943d/contract';
import endContract from '../../snapshots/94e1150cb7b8af08e3c94529335eb2d08e1281e487a9671a234c3762eae1943d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a09228b262ff3d1d70ce1dc7283d2d8017e415fa5e792f611b8866c03c72a9d1/contract';
import startContract from '../../snapshots/a09228b262ff3d1d70ce1dc7283d2d8017e415fa5e792f611b8866c03c72a9d1/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'organizationMember',
        constraint: 'organizationMember_role_check_59467d3b',
      }),
      this.createTable({
        schema: 'public',
        table: 'assignment',
        columns: [
          col('category', 'text', {
            notNull: true,
            default: lit('Homework'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('courseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('dueDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxScore', 'float8', {
            notNull: true,
            default: lit(100),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('weight', 'float8', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/float8@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'behaviorLog',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('studentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'behaviorLog_type_check_4c01a1e5',
            "\"type\" IN ('DEMERIT', 'COMMENDATION', 'REFERRAL')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'grade',
        columns: [
          col('assignmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('score', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('studentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'grade',
        constraint: 'grade_assignmentId_studentId_key',
        columns: ['assignmentId', 'studentId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'organizationMember',
        constraint: 'organizationMember_role_check_916e36c9',
        expression:
          "\"role\" IN ('OWNER', 'MANAGER', 'STAFF', 'TEACHER', 'DOCTOR', 'ADMIN', 'FINANCE', 'REGISTRAR', 'COUNSELOR')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'assignment',
        index: 'assignment_courseId_idx_12f72d2a',
        columns: ['courseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'behaviorLog',
        index: 'behaviorLog_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'behaviorLog',
        index: 'behaviorLog_studentId_idx_bf255322',
        columns: ['studentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'grade',
        index: 'grade_assignmentId_idx_8cfb4ac4',
        columns: ['assignmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'grade',
        index: 'grade_studentId_idx_bf255322',
        columns: ['studentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'assignment',
        foreignKey: {
          name: 'assignment_courseId_fkey',
          columns: ['courseId'],
          references: { schema: 'public', table: 'course', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'behaviorLog',
        foreignKey: {
          name: 'behaviorLog_studentId_fkey',
          columns: ['studentId'],
          references: { schema: 'public', table: 'student', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'behaviorLog',
        foreignKey: {
          name: 'behaviorLog_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'grade',
        foreignKey: {
          name: 'grade_assignmentId_fkey',
          columns: ['assignmentId'],
          references: { schema: 'public', table: 'assignment', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'grade',
        foreignKey: {
          name: 'grade_studentId_fkey',
          columns: ['studentId'],
          references: { schema: 'public', table: 'student', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
