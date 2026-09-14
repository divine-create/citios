#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/94e1150cb7b8af08e3c94529335eb2d08e1281e487a9671a234c3762eae1943d/contract';
import startContract from '../../snapshots/94e1150cb7b8af08e3c94529335eb2d08e1281e487a9671a234c3762eae1943d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a18b6536785d71e78f12893fd74ef37ebba5bb9eb19200b9e8983f9216cdbad6/contract';
import endContract from '../../snapshots/a18b6536785d71e78f12893fd74ef37ebba5bb9eb19200b9e8983f9216cdbad6/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'outlet',
        column: col('isActive', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
