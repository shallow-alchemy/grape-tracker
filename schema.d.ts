export declare const schema: {
    tables: {
        readonly vineyard: {
            name: "vineyard";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly name: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly location: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly varieties: {
                    type: "json";
                    optional: false;
                    customType: import("@rocicorp/zero").ReadonlyJSONValue;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly updated_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
        readonly block: {
            name: "block";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly name: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly location: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly size_acres: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly soil_type: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly notes: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly updated_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
        readonly vine: {
            name: "vine";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly block: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly sequence_number: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly variety: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly planting_date: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly health: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly notes: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly qr_generated: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly updated_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
        readonly vintage: {
            name: "vintage";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly vineyard_id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly vintage_year: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly variety: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly block_ids: {
                    type: "json";
                    optional: false;
                    customType: import("@rocicorp/zero").ReadonlyJSONValue;
                };
                readonly current_stage: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly harvest_date: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly harvest_weight_lbs: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly harvest_volume_gallons: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly brix_at_harvest: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly notes: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly updated_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
        readonly wine: {
            name: "wine";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly vintage_id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly vineyard_id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly name: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly wine_type: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly volume_gallons: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly current_volume_gallons: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly current_stage: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly status: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly last_tasting_notes: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly updated_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
        readonly stage_history: {
            name: "stage_history";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly entity_type: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly entity_id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly stage: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly started_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly completed_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly skipped: {
                    type: "boolean";
                    optional: false;
                    customType: boolean;
                };
                readonly notes: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly updated_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
        readonly task_template: {
            name: "task_template";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly vineyard_id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly stage: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly entity_type: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly wine_type: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly name: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly description: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly frequency: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly frequency_count: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly frequency_unit: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly default_enabled: {
                    type: "boolean";
                    optional: false;
                    customType: boolean;
                };
                readonly sort_order: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly updated_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
        readonly task: {
            name: "task";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly task_template_id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly entity_type: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly entity_id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly stage: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly name: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly description: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly due_date: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly completed_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly completed_by: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly notes: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly skipped: {
                    type: "boolean";
                    optional: false;
                    customType: boolean;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly updated_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
        readonly measurement: {
            name: "measurement";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly entity_type: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly entity_id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly date: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly stage: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly ph: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly ta: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly brix: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly temperature: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly tasting_notes: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly notes: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly updated_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
        readonly measurement_range: {
            name: "measurement_range";
            columns: {
                readonly id: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly wine_type: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly measurement_type: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly min_value: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly max_value: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly ideal_min: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly ideal_max: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
                readonly low_warning: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly high_warning: {
                    type: "string";
                    optional: false;
                    customType: string;
                };
                readonly created_at: {
                    type: "number";
                    optional: false;
                    customType: number;
                };
            };
            primaryKey: readonly [string, ...string[]];
        } & {
            primaryKey: ["id"];
        };
    };
    relationships: {
        readonly [x: string]: Record<string, import("@rocicorp/zero/out/zero-types/src/schema").Relationship>;
    };
    enableLegacyQueries: boolean;
    enableLegacyMutators: boolean;
};
export type Schema = typeof schema;
export declare const permissions: Promise<{
    [x: string]: unknown;
    tables: Record<string, {
        row?: {
            select?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
            insert?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
            update?: {
                preMutation?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
                postMutation?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
            } | undefined;
            delete?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
        } | undefined;
        cell?: Record<string, {
            select?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
            insert?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
            update?: {
                preMutation?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
                postMutation?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
            } | undefined;
            delete?: ["allow", import("@rocicorp/zero").Condition][] | undefined;
        }> | undefined;
    }>;
}>;
