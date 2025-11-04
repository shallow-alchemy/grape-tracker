import { createSchema, table, string, number, ANYONE_CAN, definePermissions } from '@rocicorp/zero';

const exampleTable = table('example')
  .columns({
    id: string(),
    name: string(),
    createdAt: number(),
  })
  .primaryKey('id');

export const schema = createSchema({
  tables: [exampleTable],
});

export type Schema = typeof schema;

export const permissions = definePermissions<Schema, { sub: string }>(
  schema,
  () => ({
    example: {
      row: {
        insert: ANYONE_CAN,
        update: { preMutation: ANYONE_CAN },
        delete: ANYONE_CAN,
      },
    },
  })
);

export default { schema, permissions };
