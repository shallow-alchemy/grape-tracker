"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = exports.schema = void 0;
var zero_1 = require("@rocicorp/zero");
var vineyardTable = (0, zero_1.table)('vineyard')
    .columns({
    id: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    location: (0, zero_1.string)(),
    varieties: (0, zero_1.json)(),
    createdAt: (0, zero_1.number)(),
    updatedAt: (0, zero_1.number)(),
})
    .primaryKey('id');
var blockTable = (0, zero_1.table)('block')
    .columns({
    id: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    location: (0, zero_1.string)(),
    sizeAcres: (0, zero_1.number)(),
    soilType: (0, zero_1.string)(),
    notes: (0, zero_1.string)(),
    createdAt: (0, zero_1.number)(),
    updatedAt: (0, zero_1.number)(),
})
    .primaryKey('id');
var vineTable = (0, zero_1.table)('vine')
    .columns({
    id: (0, zero_1.string)(),
    block: (0, zero_1.string)(),
    sequenceNumber: (0, zero_1.number)(),
    variety: (0, zero_1.string)(),
    plantingDate: (0, zero_1.number)(),
    health: (0, zero_1.string)(),
    notes: (0, zero_1.string)(),
    qrGenerated: (0, zero_1.number)(),
    createdAt: (0, zero_1.number)(),
    updatedAt: (0, zero_1.number)(),
})
    .primaryKey('id');
var vintageTable = (0, zero_1.table)('vintage')
    .columns({
    id: (0, zero_1.string)(),
    vineyardId: (0, zero_1.string)(),
    vintageYear: (0, zero_1.number)(),
    variety: (0, zero_1.string)(),
    blockIds: (0, zero_1.json)(),
    currentStage: (0, zero_1.string)(),
    harvestDate: (0, zero_1.number)(),
    harvestWeightLbs: (0, zero_1.number)(),
    harvestVolumeGallons: (0, zero_1.number)(),
    brixAtHarvest: (0, zero_1.number)(),
    notes: (0, zero_1.string)(),
    createdAt: (0, zero_1.number)(),
    updatedAt: (0, zero_1.number)(),
})
    .primaryKey('id');
var wineTable = (0, zero_1.table)('wine')
    .columns({
    id: (0, zero_1.string)(),
    vintageId: (0, zero_1.string)(),
    vineyardId: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    wineType: (0, zero_1.string)(),
    volumeGallons: (0, zero_1.number)(),
    currentVolumeGallons: (0, zero_1.number)(),
    currentStage: (0, zero_1.string)(),
    status: (0, zero_1.string)(),
    lastTastingNotes: (0, zero_1.string)(),
    createdAt: (0, zero_1.number)(),
    updatedAt: (0, zero_1.number)(),
})
    .primaryKey('id');
var stageHistoryTable = (0, zero_1.table)('stageHistory')
    .columns({
    id: (0, zero_1.string)(),
    entityType: (0, zero_1.string)(),
    entityId: (0, zero_1.string)(),
    stage: (0, zero_1.string)(),
    startedAt: (0, zero_1.number)(),
    completedAt: (0, zero_1.number)(),
    skipped: (0, zero_1.number)(),
    notes: (0, zero_1.string)(),
    createdAt: (0, zero_1.number)(),
    updatedAt: (0, zero_1.number)(),
})
    .primaryKey('id');
var taskTemplateTable = (0, zero_1.table)('taskTemplate')
    .columns({
    id: (0, zero_1.string)(),
    vineyardId: (0, zero_1.string)(),
    stage: (0, zero_1.string)(),
    entityType: (0, zero_1.string)(),
    wineType: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    description: (0, zero_1.string)(),
    frequency: (0, zero_1.string)(),
    frequencyCount: (0, zero_1.number)(),
    frequencyUnit: (0, zero_1.string)(),
    defaultEnabled: (0, zero_1.number)(),
    sortOrder: (0, zero_1.number)(),
    createdAt: (0, zero_1.number)(),
    updatedAt: (0, zero_1.number)(),
})
    .primaryKey('id');
var taskTable = (0, zero_1.table)('task')
    .columns({
    id: (0, zero_1.string)(),
    taskTemplateId: (0, zero_1.string)(),
    entityType: (0, zero_1.string)(),
    entityId: (0, zero_1.string)(),
    stage: (0, zero_1.string)(),
    name: (0, zero_1.string)(),
    description: (0, zero_1.string)(),
    dueDate: (0, zero_1.number)(),
    completedAt: (0, zero_1.number)(),
    completedBy: (0, zero_1.string)(),
    notes: (0, zero_1.string)(),
    skipped: (0, zero_1.number)(),
    createdAt: (0, zero_1.number)(),
    updatedAt: (0, zero_1.number)(),
})
    .primaryKey('id');
var measurementTable = (0, zero_1.table)('measurement')
    .columns({
    id: (0, zero_1.string)(),
    entityType: (0, zero_1.string)(),
    entityId: (0, zero_1.string)(),
    date: (0, zero_1.number)(),
    stage: (0, zero_1.string)(),
    ph: (0, zero_1.number)(),
    ta: (0, zero_1.number)(),
    brix: (0, zero_1.number)(),
    temperature: (0, zero_1.number)(),
    tastingNotes: (0, zero_1.string)(),
    notes: (0, zero_1.string)(),
    createdAt: (0, zero_1.number)(),
    updatedAt: (0, zero_1.number)(),
})
    .primaryKey('id');
var measurementRangeTable = (0, zero_1.table)('measurementRange')
    .columns({
    id: (0, zero_1.string)(),
    wineType: (0, zero_1.string)(),
    measurementType: (0, zero_1.string)(),
    minValue: (0, zero_1.number)(),
    maxValue: (0, zero_1.number)(),
    idealMin: (0, zero_1.number)(),
    idealMax: (0, zero_1.number)(),
    lowWarning: (0, zero_1.string)(),
    highWarning: (0, zero_1.string)(),
    createdAt: (0, zero_1.number)(),
})
    .primaryKey('id');
exports.schema = (0, zero_1.createSchema)({
    tables: [
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
exports.permissions = (0, zero_1.definePermissions)(exports.schema, function () { return ({
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
    stageHistory: {
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
    taskTemplate: {
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
    measurementRange: {
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
}); });
