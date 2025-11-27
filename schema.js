"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = exports.builder = exports.schema = void 0;
const zero_1 = require("@rocicorp/zero");
const userTable = (0, zero_1.table)('user')
    .columns({
    id: (0, zero_1.string)(), // Clerk ID as primary key
    email: (0, zero_1.string)(),
    display_name: (0, zero_1.string)(),
    vineyard_id: (0, zero_1.string)().optional(),
    role: (0, zero_1.string)(), // 'owner' | 'member'
    onboarding_completed: (0, zero_1.boolean)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const vineyardTable = (0, zero_1.table)('vineyard')
    .columns({
    id: (0, zero_1.string)(),
    user_id: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    location: (0, zero_1.string)(),
    varieties: (0, zero_1.json)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const blockTable = (0, zero_1.table)('block')
    .columns({
    id: (0, zero_1.string)(),
    user_id: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    location: (0, zero_1.string)(),
    size_acres: (0, zero_1.number)(),
    soil_type: (0, zero_1.string)(),
    notes: (0, zero_1.string)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const vineTable = (0, zero_1.table)('vine')
    .columns({
    id: (0, zero_1.string)(),
    user_id: (0, zero_1.string)(),
    block: (0, zero_1.string)(),
    sequence_number: (0, zero_1.number)(),
    variety: (0, zero_1.string)(),
    planting_date: (0, zero_1.number)(),
    health: (0, zero_1.string)(),
    notes: (0, zero_1.string)(),
    qr_generated: (0, zero_1.number)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const vintageTable = (0, zero_1.table)('vintage')
    .columns({
    id: (0, zero_1.string)(),
    user_id: (0, zero_1.string)(),
    vineyard_id: (0, zero_1.string)(),
    vintage_year: (0, zero_1.number)(),
    variety: (0, zero_1.string)(),
    block_ids: (0, zero_1.json)(),
    current_stage: (0, zero_1.string)(),
    harvest_date: (0, zero_1.number)(),
    harvest_weight_lbs: (0, zero_1.number)().optional(),
    harvest_volume_gallons: (0, zero_1.number)().optional(),
    grape_source: (0, zero_1.string)(),
    supplier_name: (0, zero_1.string)().optional(),
    notes: (0, zero_1.string)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const wineTable = (0, zero_1.table)('wine')
    .columns({
    id: (0, zero_1.string)(),
    user_id: (0, zero_1.string)(),
    vintage_id: (0, zero_1.string)(),
    vineyard_id: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    wine_type: (0, zero_1.string)(),
    volume_gallons: (0, zero_1.number)(),
    current_volume_gallons: (0, zero_1.number)(),
    current_stage: (0, zero_1.string)(),
    status: (0, zero_1.string)(),
    last_tasting_notes: (0, zero_1.string)(),
    blend_components: (0, zero_1.json)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const stageHistoryTable = (0, zero_1.table)('stage_history')
    .columns({
    id: (0, zero_1.string)(),
    user_id: (0, zero_1.string)(),
    entity_type: (0, zero_1.string)(),
    entity_id: (0, zero_1.string)(),
    stage: (0, zero_1.string)(),
    started_at: (0, zero_1.number)(),
    completed_at: (0, zero_1.number)().optional(),
    skipped: (0, zero_1.boolean)(),
    notes: (0, zero_1.string)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const taskTemplateTable = (0, zero_1.table)('task_template')
    .columns({
    id: (0, zero_1.string)(),
    user_id: (0, zero_1.string)(),
    vineyard_id: (0, zero_1.string)(),
    stage: (0, zero_1.string)(),
    entity_type: (0, zero_1.string)(),
    wine_type: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    description: (0, zero_1.string)(),
    frequency: (0, zero_1.string)(),
    frequency_count: (0, zero_1.number)(),
    frequency_unit: (0, zero_1.string)(),
    default_enabled: (0, zero_1.boolean)(),
    sort_order: (0, zero_1.number)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const taskTable = (0, zero_1.table)('task')
    .columns({
    id: (0, zero_1.string)(),
    user_id: (0, zero_1.string)(),
    task_template_id: (0, zero_1.string)(),
    entity_type: (0, zero_1.string)(),
    entity_id: (0, zero_1.string)(),
    stage: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    description: (0, zero_1.string)(),
    due_date: (0, zero_1.number)(),
    completed_at: (0, zero_1.number)(),
    completed_by: (0, zero_1.string)(),
    notes: (0, zero_1.string)(),
    skipped: (0, zero_1.boolean)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const measurementTable = (0, zero_1.table)('measurement')
    .columns({
    id: (0, zero_1.string)(),
    user_id: (0, zero_1.string)(),
    entity_type: (0, zero_1.string)(),
    entity_id: (0, zero_1.string)(),
    date: (0, zero_1.number)(),
    stage: (0, zero_1.string)(),
    ph: (0, zero_1.number)().optional(),
    ta: (0, zero_1.number)().optional(),
    brix: (0, zero_1.number)().optional(),
    temperature: (0, zero_1.number)().optional(),
    tasting_notes: (0, zero_1.string)(),
    notes: (0, zero_1.string)(),
    created_at: (0, zero_1.number)(),
    updated_at: (0, zero_1.number)(),
})
    .primaryKey('id');
const measurementRangeTable = (0, zero_1.table)('measurement_range')
    .columns({
    id: (0, zero_1.string)(),
    wine_type: (0, zero_1.string)(),
    measurement_type: (0, zero_1.string)(),
    min_value: (0, zero_1.number)(),
    max_value: (0, zero_1.number)(),
    ideal_min: (0, zero_1.number)(),
    ideal_max: (0, zero_1.number)(),
    low_warning: (0, zero_1.string)(),
    high_warning: (0, zero_1.string)(),
    created_at: (0, zero_1.number)(),
})
    .primaryKey('id');
exports.schema = (0, zero_1.createSchema)({
    tables: [
        userTable,
        vineyardTable,
        blockTable,
        vineTable,
        vintageTable,
        wineTable,
        stageHistoryTable,
        taskTemplateTable,
        taskTable,
        measurementTable,
        measurementRangeTable,
    ],
});
// Builder for synced queries
exports.builder = (0, zero_1.createBuilder)(exports.schema);
// NOTE: Temporary ANYONE_CAN permissions until synced queries are fully deployed
// This allows zero-cache to start but provides NO multi-user isolation
// TODO: Replace with synced queries (see zero-queries/src/queries.ts)
exports.permissions = (0, zero_1.definePermissions)(exports.schema, () => {
    return {
        user: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        vineyard: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        block: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        vine: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        vintage: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        wine: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        stage_history: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        task_template: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        task: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        measurement: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: zero_1.ANYONE_CAN,
                update: {
                    preMutation: zero_1.ANYONE_CAN,
                    postMutation: zero_1.ANYONE_CAN,
                },
                delete: zero_1.ANYONE_CAN,
            },
        },
        measurement_range: {
            row: {
                select: zero_1.ANYONE_CAN,
                insert: [],
                update: {
                    preMutation: [],
                    postMutation: [],
                },
                delete: [],
            },
        },
    };
});
