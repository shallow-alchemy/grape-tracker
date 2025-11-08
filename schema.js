import { createSchema, table, string, number, ANYONE_CAN, definePermissions } from '@rocicorp/zero';

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
  tables: [vineTable],
});

export const permissions = definePermissions(
  schema,
  () => ({
    vine: {
      row: {
        insert: ANYONE_CAN,
        update: { preMutation: ANYONE_CAN },
        delete: ANYONE_CAN,
      },
    },
  })
);
