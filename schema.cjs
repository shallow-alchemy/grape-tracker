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

// schema.ts
var schema_exports = {};
__export(schema_exports, {
  builder: () => builder,
  permissions: () => permissions,
  schema: () => schema
});
module.exports = __toCommonJS(schema_exports);
var import_zero = require("@rocicorp/zero");
var userTable = (0, import_zero.table)("user").columns({
  id: (0, import_zero.string)(),
  // Clerk ID as primary key
  email: (0, import_zero.string)(),
  display_name: (0, import_zero.string)(),
  vineyard_id: (0, import_zero.string)().optional(),
  role: (0, import_zero.string)(),
  // 'owner' | 'member'
  onboarding_completed: (0, import_zero.boolean)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var vineyardTable = (0, import_zero.table)("vineyard").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  name: (0, import_zero.string)(),
  location: (0, import_zero.string)(),
  varieties: (0, import_zero.json)(),
  available_labor_hours: (0, import_zero.number)().optional(),
  // Weekly hours available for vineyard work
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var blockTable = (0, import_zero.table)("block").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  name: (0, import_zero.string)(),
  location: (0, import_zero.string)(),
  size_acres: (0, import_zero.number)(),
  soil_type: (0, import_zero.string)(),
  notes: (0, import_zero.string)(),
  training_method: (0, import_zero.string)().optional(),
  training_method_other: (0, import_zero.string)().optional(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var vineTable = (0, import_zero.table)("vine").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  block: (0, import_zero.string)(),
  sequence_number: (0, import_zero.number)(),
  variety: (0, import_zero.string)(),
  planting_date: (0, import_zero.number)(),
  health: (0, import_zero.string)(),
  notes: (0, import_zero.string)(),
  qr_generated: (0, import_zero.number)(),
  training_method: (0, import_zero.string)().optional(),
  training_method_other: (0, import_zero.string)().optional(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var pruningLogTable = (0, import_zero.table)("pruning_log").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  vine_id: (0, import_zero.string)(),
  date: (0, import_zero.number)(),
  pruning_type: (0, import_zero.string)(),
  spurs_left: (0, import_zero.number)().optional(),
  canes_before: (0, import_zero.number)().optional(),
  canes_after: (0, import_zero.number)().optional(),
  notes: (0, import_zero.string)(),
  photo_id: (0, import_zero.string)().optional(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var vintageTable = (0, import_zero.table)("vintage").columns({
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
var wineTable = (0, import_zero.table)("wine").columns({
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
var stageHistoryTable = (0, import_zero.table)("stage_history").columns({
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
var taskTemplateTable = (0, import_zero.table)("task_template").columns({
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
  is_archived: (0, import_zero.boolean)(),
  sort_order: (0, import_zero.number)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var taskTable = (0, import_zero.table)("task").columns({
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
var measurementTable = (0, import_zero.table)("measurement").columns({
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
var measurementRangeTable = (0, import_zero.table)("measurement_range").columns({
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
var seasonalTaskTable = (0, import_zero.table)("seasonal_task").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  week_start: (0, import_zero.number)(),
  // Monday of the week (timestamp)
  season: (0, import_zero.string)(),
  // e.g., "Post-Harvest/Early Dormant"
  priority: (0, import_zero.number)(),
  // 1, 2, 3, etc.
  task_name: (0, import_zero.string)(),
  timing: (0, import_zero.string)(),
  // e.g., "Immediately", "This week"
  details: (0, import_zero.string)(),
  completed_at: (0, import_zero.number)().optional(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var measurementAnalysisTable = (0, import_zero.table)("measurement_analysis").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  measurement_id: (0, import_zero.string)(),
  // FK to measurement table
  summary: (0, import_zero.string)(),
  metrics: (0, import_zero.json)(),
  // Array of { name, value, status, analysis }
  projections: (0, import_zero.string)().optional(),
  recommendations: (0, import_zero.json)(),
  // Array of strings
  created_at: (0, import_zero.number)()
}).primaryKey("id");
var stageTable = (0, import_zero.table)("stage").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  // '' = global default, user_id = user-specific
  entity_type: (0, import_zero.string)(),
  // 'wine' or 'vintage'
  value: (0, import_zero.string)(),
  // Stage identifier (e.g., 'crush')
  label: (0, import_zero.string)(),
  // Display name (e.g., 'Crush')
  description: (0, import_zero.string)(),
  sort_order: (0, import_zero.number)(),
  is_archived: (0, import_zero.boolean)(),
  is_default: (0, import_zero.boolean)(),
  // TRUE = came from system defaults
  applicability: (0, import_zero.json)(),
  // Wine type applicability: {"red": "required", ...}
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var supplyTemplateTable = (0, import_zero.table)("supply_template").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  task_template_id: (0, import_zero.string)(),
  name: (0, import_zero.string)(),
  quantity_formula: (0, import_zero.string)().optional(),
  // e.g., "1 per 30 lbs grapes"
  quantity_fixed: (0, import_zero.number)(),
  // Fallback quantity (default: 1)
  lead_time_days: (0, import_zero.number)(),
  // Days before task to surface (default: 7)
  notes: (0, import_zero.string)(),
  is_archived: (0, import_zero.boolean)(),
  sort_order: (0, import_zero.number)(),
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var supplyInstanceTable = (0, import_zero.table)("supply_instance").columns({
  id: (0, import_zero.string)(),
  user_id: (0, import_zero.string)(),
  supply_template_id: (0, import_zero.string)(),
  task_id: (0, import_zero.string)(),
  entity_type: (0, import_zero.string)(),
  // 'wine' or 'vintage'
  entity_id: (0, import_zero.string)(),
  calculated_quantity: (0, import_zero.number)().optional(),
  verified_at: (0, import_zero.number)().optional(),
  // When user confirmed they have it
  verified_by: (0, import_zero.string)().optional(),
  // User who verified
  created_at: (0, import_zero.number)(),
  updated_at: (0, import_zero.number)()
}).primaryKey("id");
var schema = (0, import_zero.createSchema)({
  tables: [
    userTable,
    vineyardTable,
    blockTable,
    vineTable,
    pruningLogTable,
    vintageTable,
    wineTable,
    stageHistoryTable,
    stageTable,
    taskTemplateTable,
    taskTable,
    measurementTable,
    measurementRangeTable,
    seasonalTaskTable,
    measurementAnalysisTable,
    supplyTemplateTable,
    supplyInstanceTable
  ]
});
var builder = (0, import_zero.createBuilder)(schema);
var permissions = (0, import_zero.definePermissions)(
  schema,
  () => {
    return {
      user: {
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
      pruning_log: {
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
      stage: {
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
      },
      seasonal_task: {
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
      measurement_analysis: {
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
      supply_template: {
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
      supply_instance: {
        row: {
          select: import_zero.ANYONE_CAN,
          insert: import_zero.ANYONE_CAN,
          update: {
            preMutation: import_zero.ANYONE_CAN,
            postMutation: import_zero.ANYONE_CAN
          },
          delete: import_zero.ANYONE_CAN
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
