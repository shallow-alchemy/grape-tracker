import { createSchema, table, string, number, ANYONE_CAN, definePermissions } from '@rocicorp/zero';

const blockTable = table('block')
  .columns({
    id: string(),
    name: string(),
    location: string(),
    sizeAcres: number(),
    soilType: string(),
    notes: string(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const vineTable = table('vine')
  .columns({
    id: string(),
    block: string(),
    sequenceNumber: number(),
    variety: string(),
    plantingDate: number(),
    health: string(),
    notes: string(),
    qrGenerated: number(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

export const schema = createSchema({
  tables: [blockTable, vineTable],
});

export type Schema = typeof schema;

export const permissions = definePermissions<{ sub: string }, Schema>(
  schema,
  () => ({
    block: {
      row: {
        select: ANYONE_CAN,
        insert: ANYONE_CAN,
        update: { preMutation: ANYONE_CAN },
        delete: ANYONE_CAN,
      },
    },
    vine: {
      row: {
        select: ANYONE_CAN,
        insert: ANYONE_CAN,
        update: { preMutation: ANYONE_CAN },
        delete: ANYONE_CAN,
      },
    },
  })
);
