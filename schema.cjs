"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var schema_exports = {};
__export(schema_exports, {
  builder: () => builder,
  permissions: () => permissions,
  schema: () => schema
});
module.exports = __toCommonJS(schema_exports);
var import_zero = require("@rocicorp/zero");
const vineyardTable = (0, import_zero.table)("vineyard").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  name: (0, import_zero.string)(),
  location: (0, import_zero.string)(),
  varieties: (0, import_zero.json)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
const blockTable = (0, import_zero.table)("block").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  name: (0, import_zero.string)(),
  location: (0, import_zero.string)(),
  size_acres: (0, import_zero.number)(),
  soil_type: (0, import_zero.string)(),
  notes: (0, import_zero.string)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
const vineTable = (0, import_zero.table)("vine").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  block: (0, import_zero.string)(),
  sequence_number: (0, import_zero.number)(),
  variety: (0, import_zero.string)(),
  planting_date: (0, import_zero.number)(),
  health: (0, import_zero.string)(),
  notes: (0, import_zero.string)(),
  qr_generated: (0, import_zero.number)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
const vintageTable = (0, import_zero.table)("vintage").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  vineyard_id: (0, import_zero.string)(),
  vintage_year: (0, import_zero.number)(),
  variety: (0, import_zero.string)(),
  block_ids: (0, import_zero.json)(),
  current_stage: (0, import_zero.string)(),
  harvest_date: (0, import_zero.number)(),
  harvest_weight_lbs: (0, import_zero.number)().optional(),
  harvest_volume_gallons: (0, import_zero.number)().optional(),
  grape_source: (0, import_zero.string)(),
  supplier_name: (0, import_zero.string)().optional(),
  notes: (0, import_zero.string)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
const wineTable = (0, import_zero.table)("wine").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  vintage_id: (0, import_zero.string)(),
  vineyard_id: (0, import_zero.string)(),
  name: (0, import_zero.string)(),
  wine_type: (0, import_zero.string)(),
  volume_gallons: (0, import_zero.number)(),
  current_volume_gallons: (0, import_zero.number)(),
  current_stage: (0, import_zero.string)(),
  status: (0, import_zero.string)(),
  last_tasting_notes: (0, import_zero.string)(),
  blend_components: (0, import_zero.json)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
const stageHistoryTable = (0, import_zero.table)("stage_history").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  entity_type: (0, import_zero.string)(),
  entity_id: (0, import_zero.string)(),
  stage: (0, import_zero.string)(),
  started_at: (0, import_zero.number)(),
  completed_at: (0, import_zero.number)().optional(),
  skipped: (0, import_zero.boolean)(),
  notes: (0, import_zero.string)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
const taskTemplateTable = (0, import_zero.table)("task_template").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  vineyard_id: (0, import_zero.string)(),
  stage: (0, import_zero.string)(),
  entity_type: (0, import_zero.string)(),
  wine_type: (0, import_zero.string)(),
  name: (0, import_zero.string)(),
  description: (0, import_zero.string)(),
  frequency: (0, import_zero.string)(),
  frequency_count: (0, import_zero.number)(),
  frequency_unit: (0, import_zero.string)(),
  default_enabled: (0, import_zero.boolean)(),
  sort_order: (0, import_zero.number)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
const taskTable = (0, import_zero.table)("task").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  task_template_id: (0, import_zero.string)(),
  entity_type: (0, import_zero.string)(),
  entity_id: (0, import_zero.string)(),
  stage: (0, import_zero.string)(),
  name: (0, import_zero.string)(),
  description: (0, import_zero.string)(),
  due_date: (0, import_zero.number)(),
  completed_at: (0, import_zero.number)(),
  completed_by: (0, import_zero.string)(),
  notes: (0, import_zero.string)(),
  skipped: (0, import_zero.boolean)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
const measurementTable = (0, import_zero.table)("measurement").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  entity_type: (0, import_zero.string)(),
  entity_id: (0, import_zero.string)(),
  date: (0, import_zero.number)(),
  stage: (0, import_zero.string)(),
  ph: (0, import_zero.number)().optional(),
  ta: (0, import_zero.number)().optional(),
  brix: (0, import_zero.number)().optional(),
  temperature: (0, import_zero.number)().optional(),
  tasting_notes: (0, import_zero.string)(),
  notes: (0, import_zero.string)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
const measurementRangeTable = (0, import_zero.table)("measurement_range").columns({
  id: (0, import_zero.string)(),
  wine_type: (0, import_zero.string)(),
  measurement_type: (0, import_zero.string)(),
  min_value: (0, import_zero.number)(),
  max_value: (0, import_zero.number)(),
  ideal_min: (0, import_zero.number)(),
  ideal_max: (0, import_zero.number)(),
  low_warning: (0, import_zero.string)(),
  high_warning: (0, import_zero.string)(),
  created_at: (0, import_zero.number)()
}).primaryKey("id");
const schema = (0, import_zero.createSchema)({
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
    measurementRangeTable
  ]
});
const builder = (0, import_zero.createBuilder)(schema);
const permissions = (0, import_zero.definePermissions)(
  schema,
  () => {
    return {
      vineyard: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
        }
      },
      block: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
        }
      },
      vine: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
        }
      },
      vintage: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
        }
      },
      wine: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
        }
      },
      stage_history: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
        }
      },
      task_template: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
        }
      },
      task: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
        }
      },
      measurement: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
        }
      },
      measurement_range: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: [],
          update: {
            preMutation: [],
            postMutation: []
          },
          delete: []
        }
      }
    };
  }
);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  builder,
  permissions,
  schema
});
