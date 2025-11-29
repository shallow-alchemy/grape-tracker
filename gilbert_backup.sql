--
-- PostgreSQL database dump
--

\restrict aXoTfdORbQgE4UohYaQZgxZJktlaF7yfksi51eeZiAnP0yR5nvi3ahDV7FbuXqU

-- Dumped from database version 15.15 (Homebrew)
-- Dumped by pg_dump version 15.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: zero; Type: SCHEMA; Schema: -; Owner: mattpardini
--

CREATE SCHEMA zero;


ALTER SCHEMA zero OWNER TO mattpardini;

--
-- Name: zero_0; Type: SCHEMA; Schema: -; Owner: mattpardini
--

CREATE SCHEMA zero_0;


ALTER SCHEMA zero_0 OWNER TO mattpardini;

--
-- Name: zero_0/cdc; Type: SCHEMA; Schema: -; Owner: mattpardini
--

CREATE SCHEMA "zero_0/cdc";


ALTER SCHEMA "zero_0/cdc" OWNER TO mattpardini;

--
-- Name: zero_0/cvr; Type: SCHEMA; Schema: -; Owner: mattpardini
--

CREATE SCHEMA "zero_0/cvr";


ALTER SCHEMA "zero_0/cvr" OWNER TO mattpardini;

--
-- Name: pruning_type; Type: TYPE; Schema: public; Owner: mattpardini
--

CREATE TYPE public.pruning_type AS ENUM (
    'dormant',
    'summer',
    'corrective',
    'training'
);


ALTER TYPE public.pruning_type OWNER TO mattpardini;

--
-- Name: training_method; Type: TYPE; Schema: public; Owner: mattpardini
--

CREATE TYPE public.training_method AS ENUM (
    'HEAD_TRAINING',
    'BILATERAL_CORDON',
    'VERTICAL_CORDON',
    'FOUR_ARM_KNIFFEN',
    'GENEVA_DOUBLE_CURTAIN',
    'UMBRELLA_KNIFFEN',
    'CANE_PRUNED',
    'VSP',
    'SCOTT_HENRY',
    'LYRE',
    'OTHER'
);


ALTER TYPE public.training_method OWNER TO mattpardini;

--
-- Name: set_permissions_hash(); Type: FUNCTION; Schema: zero; Owner: mattpardini
--

CREATE FUNCTION zero.set_permissions_hash() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
      NEW.hash = md5(NEW.permissions::text);
      RETURN NEW;
  END;
  $$;


ALTER FUNCTION zero.set_permissions_hash() OWNER TO mattpardini;

--
-- Name: emit_alter_publication(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.emit_alter_publication() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM "zero_0".emit_ddl_end('ALTER PUBLICATION');
END
$$;


ALTER FUNCTION zero_0.emit_alter_publication() OWNER TO mattpardini;

--
-- Name: emit_alter_schema(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.emit_alter_schema() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM "zero_0".emit_ddl_end('ALTER SCHEMA');
END
$$;


ALTER FUNCTION zero_0.emit_alter_schema() OWNER TO mattpardini;

--
-- Name: emit_alter_table(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.emit_alter_table() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM "zero_0".emit_ddl_end('ALTER TABLE');
END
$$;


ALTER FUNCTION zero_0.emit_alter_table() OWNER TO mattpardini;

--
-- Name: emit_create_index(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.emit_create_index() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM "zero_0".emit_ddl_end('CREATE INDEX');
END
$$;


ALTER FUNCTION zero_0.emit_create_index() OWNER TO mattpardini;

--
-- Name: emit_create_table(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.emit_create_table() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM "zero_0".emit_ddl_end('CREATE TABLE');
END
$$;


ALTER FUNCTION zero_0.emit_create_table() OWNER TO mattpardini;

--
-- Name: emit_ddl_end(text); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.emit_ddl_end(tag text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  publications TEXT[];
  cmd RECORD;
  relevant RECORD;
  deprecated RECORD;
  schema_specs TEXT;
  message TEXT;
  event TEXT;
BEGIN
  publications := ARRAY['_zero_public_0','_zero_metadata_0'];

  SELECT objid, object_type, object_identity 
    FROM pg_event_trigger_ddl_commands() 
    WHERE object_type IN (
      'table',
      'table column',
      'index',
      'publication relation',
      'publication namespace',
      'schema')
    LIMIT 1 INTO cmd;

  -- Filter DDL updates that are not relevant to the shard (i.e. publications) when possible.

  IF cmd.object_type = 'table' OR cmd.object_type = 'table column' THEN
    SELECT ns.nspname AS "schema", c.relname AS "name" FROM pg_class AS c
      JOIN pg_namespace AS ns ON c.relnamespace = ns.oid
      JOIN pg_publication_tables AS pb ON pb.schemaname = ns.nspname AND pb.tablename = c.relname
      WHERE c.oid = cmd.objid AND pb.pubname = ANY (publications)
      INTO relevant;
    IF relevant IS NULL THEN
      PERFORM "zero_0".notice_ignore(cmd.object_identity);
      RETURN;
    END IF;

    cmd.object_type := 'table';  -- normalize the 'table column' target to 'table'

  ELSIF cmd.object_type = 'index' THEN
    SELECT ns.nspname AS "schema", c.relname AS "name" FROM pg_class AS c
      JOIN pg_namespace AS ns ON c.relnamespace = ns.oid
      JOIN pg_indexes as ind ON ind.schemaname = ns.nspname AND ind.indexname = c.relname
      JOIN pg_publication_tables AS pb ON pb.schemaname = ns.nspname AND pb.tablename = ind.tablename
      WHERE c.oid = cmd.objid AND pb.pubname = ANY (publications)
      INTO relevant;
    IF relevant IS NULL THEN
      PERFORM "zero_0".notice_ignore(cmd.object_identity);
      RETURN;
    END IF;

  ELSIF cmd.object_type = 'publication relation' THEN
    SELECT pb.pubname FROM pg_publication_rel AS rel
      JOIN pg_publication AS pb ON pb.oid = rel.prpubid
      WHERE rel.oid = cmd.objid AND pb.pubname = ANY (publications) 
      INTO relevant;
    IF relevant IS NULL THEN
      PERFORM "zero_0".notice_ignore(cmd.object_identity);
      RETURN;
    END IF;

  ELSIF cmd.object_type = 'publication namespace' THEN
    SELECT pb.pubname FROM pg_publication_namespace AS ns
      JOIN pg_publication AS pb ON pb.oid = ns.pnpubid
      WHERE ns.oid = cmd.objid AND pb.pubname = ANY (publications) 
      INTO relevant;
    IF relevant IS NULL THEN
      PERFORM "zero_0".notice_ignore(cmd.object_identity);
      RETURN;
    END IF;

  ELSIF cmd.object_type = 'schema' THEN
    SELECT ns.nspname AS "schema", c.relname AS "name" FROM pg_class AS c
      JOIN pg_namespace AS ns ON c.relnamespace = ns.oid
      JOIN pg_publication_tables AS pb ON pb.schemaname = ns.nspname AND pb.tablename = c.relname
      WHERE ns.oid = cmd.objid AND pb.pubname = ANY (publications)
      INTO relevant;
    IF relevant IS NULL THEN
      PERFORM "zero_0".notice_ignore(cmd.object_identity);
      RETURN;
    END IF;

  ELSIF tag LIKE 'CREATE %' THEN
    PERFORM "zero_0".notice_ignore('noop ' || tag);
    RETURN;
  END IF;

  -- Construct and emit the DdlUpdateEvent message.

  -- TODO: Remove backwards-compatibility fields after a few releases.
  SELECT 'deprecated' as "schema", 'deprecated' as "name" INTO deprecated;

  SELECT json_build_object(
    'tag', tag,
    'table', deprecated,
    'index', deprecated
  ) INTO event;
  
  SELECT "zero_0".schema_specs() INTO schema_specs;

  SELECT json_build_object(
    'type', 'ddlUpdate',
    'version', 1,
    'schema', schema_specs::json,
    'event', event::json,
    'context', "zero_0".get_trigger_context()
  ) INTO message;

  PERFORM pg_logical_emit_message(true, 'zero/0', message);
END
$$;


ALTER FUNCTION zero_0.emit_ddl_end(tag text) OWNER TO mattpardini;

--
-- Name: emit_ddl_start(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.emit_ddl_start() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  schema_specs TEXT;
  message TEXT;
BEGIN
  SELECT "zero_0".schema_specs() INTO schema_specs;

  SELECT json_build_object(
    'type', 'ddlStart',
    'version', 1,
    'schema', schema_specs::json,
    'context', "zero_0".get_trigger_context()
  ) INTO message;

  PERFORM pg_logical_emit_message(true, 'zero/0', message);
END
$$;


ALTER FUNCTION zero_0.emit_ddl_start() OWNER TO mattpardini;

--
-- Name: emit_drop_index(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.emit_drop_index() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM "zero_0".emit_ddl_end('DROP INDEX');
END
$$;


ALTER FUNCTION zero_0.emit_drop_index() OWNER TO mattpardini;

--
-- Name: emit_drop_table(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.emit_drop_table() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM "zero_0".emit_ddl_end('DROP TABLE');
END
$$;


ALTER FUNCTION zero_0.emit_drop_table() OWNER TO mattpardini;

--
-- Name: get_trigger_context(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.get_trigger_context() RETURNS record
    LANGUAGE plpgsql
    AS $$
DECLARE
  result record;
BEGIN
  SELECT current_query() AS "query" into result;
  RETURN result;
END
$$;


ALTER FUNCTION zero_0.get_trigger_context() OWNER TO mattpardini;

--
-- Name: notice_ignore(text); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.notice_ignore(object_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE NOTICE 'zero(%) ignoring %', '0', object_id;
END
$$;


ALTER FUNCTION zero_0.notice_ignore(object_id text) OWNER TO mattpardini;

--
-- Name: schema_specs(); Type: FUNCTION; Schema: zero_0; Owner: mattpardini
--

CREATE FUNCTION zero_0.schema_specs() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  tables record;
  indexes record;
BEGIN
  
WITH published_columns AS (SELECT 
  pc.oid::int8 AS "oid",
  nspname AS "schema", 
  pc.relname AS "name", 
  pc.relreplident AS "replicaIdentity",
  attnum AS "pos", 
  attname AS "col", 
  pt.typname AS "type", 
  atttypid::int8 AS "typeOID", 
  pt.typtype,
  elem_pt.typtype AS "elemTyptype",
  NULLIF(atttypmod, -1) AS "maxLen", 
  attndims "arrayDims", 
  attnotnull AS "notNull",
  pg_get_expr(pd.adbin, pd.adrelid) as "dflt",
  NULLIF(ARRAY_POSITION(conkey, attnum), -1) AS "keyPos", 
  pb.rowfilter as "rowFilter",
  pb.pubname as "publication"
FROM pg_attribute
JOIN pg_class pc ON pc.oid = attrelid
JOIN pg_namespace pns ON pns.oid = relnamespace
JOIN pg_type pt ON atttypid = pt.oid
LEFT JOIN pg_type elem_pt ON elem_pt.oid = pt.typelem
JOIN pg_publication_tables as pb ON 
  pb.schemaname = nspname AND 
  pb.tablename = pc.relname AND
  attname = ANY(pb.attnames)
LEFT JOIN pg_constraint pk ON pk.contype = 'p' AND pk.connamespace = relnamespace AND pk.conrelid = attrelid
LEFT JOIN pg_attrdef pd ON pd.adrelid = attrelid AND pd.adnum = attnum
WHERE pb.pubname IN ('_zero_public_0','_zero_metadata_0') AND attgenerated = ''
ORDER BY nspname, pc.relname),

tables AS (SELECT json_build_object(
  'oid', "oid",
  'schema', "schema", 
  'name', "name", 
  'replicaIdentity', "replicaIdentity",
  'columns', json_object_agg(
    DISTINCT
    col,
    jsonb_build_object(
      'pos', "pos",
      'dataType', CASE WHEN "arrayDims" = 0 
                       THEN "type" 
                       ELSE substring("type" from 2) || repeat('[]', "arrayDims") END,
      'pgTypeClass', "typtype",
      'elemPgTypeClass', "elemTyptype",
      'typeOID', "typeOID",
      -- https://stackoverflow.com/a/52376230
      'characterMaximumLength', CASE WHEN "typeOID" = 1043 OR "typeOID" = 1042 
                                     THEN "maxLen" - 4 
                                     ELSE "maxLen" END,
      'notNull', "notNull",
      'dflt', "dflt"
    )
  ),
  'primaryKey', ARRAY( SELECT json_object_keys(
    json_strip_nulls(
      json_object_agg(
        DISTINCT "col", "keyPos" ORDER BY "keyPos"
      )
    )
  )),
  'publications', json_object_agg(
    DISTINCT 
    "publication", 
    jsonb_build_object('rowFilter', "rowFilter")
  )
) AS "table" FROM published_columns GROUP BY "schema", "name", "oid", "replicaIdentity")

SELECT COALESCE(json_agg("table"), '[]'::json) as "tables" FROM tables
   INTO tables;
  
  WITH indexed_columns AS (SELECT
      pg_indexes.schemaname as "schema",
      pg_indexes.tablename as "tableName",
      pg_indexes.indexname as "name",
      index_column.name as "col",
      CASE WHEN pg_index.indoption[index_column.pos-1] & 1 = 1 THEN 'DESC' ELSE 'ASC' END as "dir",
      pg_index.indisunique as "unique",
      pg_index.indisreplident as "isReplicaIdentity",
      pg_index.indimmediate as "isImmediate"
    FROM pg_indexes
    JOIN pg_namespace ON pg_indexes.schemaname = pg_namespace.nspname
    JOIN pg_class pc ON
      pc.relname = pg_indexes.indexname
      AND pc.relnamespace = pg_namespace.oid
    JOIN pg_publication_tables as pb ON 
      pb.schemaname = pg_indexes.schemaname AND 
      pb.tablename = pg_indexes.tablename
    JOIN pg_index ON pg_index.indexrelid = pc.oid
    JOIN LATERAL (
      SELECT array_agg(attname) as attnames, array_agg(attgenerated != '') as generated FROM pg_attribute
        WHERE attrelid = pg_index.indrelid
          AND attnum = ANY( (pg_index.indkey::smallint[] )[:pg_index.indnkeyatts - 1] )
    ) as indexed ON true
    JOIN LATERAL (
      SELECT pg_attribute.attname as name, col.index_pos as pos
        FROM UNNEST( (pg_index.indkey::smallint[])[:pg_index.indnkeyatts - 1] ) 
          WITH ORDINALITY as col(table_pos, index_pos)
        JOIN pg_attribute ON attrelid = pg_index.indrelid AND attnum = col.table_pos
    ) AS index_column ON true
    LEFT JOIN pg_constraint ON pg_constraint.conindid = pc.oid
    WHERE pb.pubname IN ('_zero_public_0','_zero_metadata_0')
      AND pg_index.indexprs IS NULL
      AND pg_index.indpred IS NULL
      AND (pg_constraint.contype IS NULL OR pg_constraint.contype IN ('p', 'u'))
      AND indexed.attnames <@ pb.attnames
      AND false = ALL(indexed.generated)
    ORDER BY
      pg_indexes.schemaname,
      pg_indexes.tablename,
      pg_indexes.indexname,
      index_column.pos ASC),
  
    indexes AS (SELECT json_build_object(
      'schema', "schema",
      'tableName', "tableName",
      'name', "name",
      'unique', "unique",
      'isReplicaIdentity', "isReplicaIdentity",
      'isImmediate', "isImmediate",
      'columns', json_object_agg("col", "dir")
    ) AS index FROM indexed_columns 
      GROUP BY "schema", "tableName", "name", "unique", "isReplicaIdentity", "isImmediate")

    SELECT COALESCE(json_agg("index"), '[]'::json) as "indexes" FROM indexes
   INTO indexes;
  RETURN json_build_object(
    'tables', tables.tables,
    'indexes', indexes.indexes
  );
END
$$;


ALTER FUNCTION zero_0.schema_specs() OWNER TO mattpardini;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _sqlx_migrations; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public._sqlx_migrations (
    version bigint NOT NULL,
    description text NOT NULL,
    installed_on timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    checksum bytea NOT NULL,
    execution_time bigint NOT NULL
);


ALTER TABLE public._sqlx_migrations OWNER TO mattpardini;

--
-- Name: alert_settings; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.alert_settings (
    vineyard_id text NOT NULL,
    alert_type text NOT NULL,
    settings jsonb NOT NULL,
    updated_at bigint NOT NULL
);


ALTER TABLE public.alert_settings OWNER TO mattpardini;

--
-- Name: block; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.block (
    id text NOT NULL,
    name text NOT NULL,
    location text,
    size_acres numeric,
    soil_type text,
    notes text,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    user_id character varying(255) DEFAULT ''::character varying NOT NULL,
    training_method public.training_method,
    training_method_other character varying(500)
);


ALTER TABLE public.block OWNER TO mattpardini;

--
-- Name: measurement; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.measurement (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    date bigint NOT NULL,
    stage text NOT NULL,
    ph real,
    ta real,
    brix real,
    temperature real,
    tasting_notes text,
    notes text,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    user_id character varying(255) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE public.measurement OWNER TO mattpardini;

--
-- Name: TABLE measurement; Type: COMMENT; Schema: public; Owner: mattpardini
--

COMMENT ON TABLE public.measurement IS 'Tracks all measurements (brix, pH, TA, temperature) for vintages and wines at different stages. Use stage=harvest for initial harvest measurements.';


--
-- Name: measurement_range; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.measurement_range (
    id text NOT NULL,
    wine_type text NOT NULL,
    measurement_type text NOT NULL,
    min_value real,
    max_value real,
    ideal_min real,
    ideal_max real,
    low_warning text,
    high_warning text,
    created_at bigint NOT NULL
);


ALTER TABLE public.measurement_range OWNER TO mattpardini;

--
-- Name: pruning_log; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.pruning_log (
    id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    vine_id character varying(36) NOT NULL,
    date bigint NOT NULL,
    pruning_type public.pruning_type NOT NULL,
    spurs_left integer,
    canes_before integer,
    canes_after integer,
    notes text DEFAULT ''::text NOT NULL,
    photo_id character varying(36),
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL
);


ALTER TABLE public.pruning_log OWNER TO mattpardini;

--
-- Name: stage_history; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.stage_history (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    stage text NOT NULL,
    started_at bigint NOT NULL,
    completed_at bigint,
    skipped boolean DEFAULT false,
    notes text,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    user_id character varying(255) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE public.stage_history OWNER TO mattpardini;

--
-- Name: task; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.task (
    id text NOT NULL,
    task_template_id text,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    stage text NOT NULL,
    name text NOT NULL,
    description text,
    due_date bigint,
    completed_at bigint,
    completed_by text,
    notes text,
    skipped boolean DEFAULT false,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    user_id character varying(255) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE public.task OWNER TO mattpardini;

--
-- Name: task_template; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.task_template (
    id text NOT NULL,
    vineyard_id text NOT NULL,
    stage text NOT NULL,
    entity_type text NOT NULL,
    wine_type text,
    name text NOT NULL,
    description text,
    frequency text,
    frequency_count integer,
    frequency_unit text,
    default_enabled boolean DEFAULT true,
    sort_order integer,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    user_id character varying(255) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE public.task_template OWNER TO mattpardini;

--
-- Name: user; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public."user" (
    id text NOT NULL,
    email text NOT NULL,
    display_name text NOT NULL,
    vineyard_id text,
    role text DEFAULT 'owner'::text NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL
);


ALTER TABLE public."user" OWNER TO mattpardini;

--
-- Name: vine; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.vine (
    id text NOT NULL,
    block text NOT NULL,
    sequence_number integer NOT NULL,
    variety text NOT NULL,
    planting_date bigint NOT NULL,
    health text NOT NULL,
    notes text NOT NULL,
    qr_generated bigint NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    user_id character varying(255) DEFAULT ''::character varying NOT NULL,
    training_method public.training_method,
    training_method_other character varying(500)
);


ALTER TABLE public.vine OWNER TO mattpardini;

--
-- Name: vineyard; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.vineyard (
    id text NOT NULL,
    name text NOT NULL,
    location text,
    varieties text[],
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    user_id character varying(255) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE public.vineyard OWNER TO mattpardini;

--
-- Name: vintage; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.vintage (
    id text NOT NULL,
    vineyard_id text NOT NULL,
    vintage_year integer NOT NULL,
    variety text NOT NULL,
    block_ids text[],
    current_stage text NOT NULL,
    harvest_date bigint,
    harvest_weight_lbs real,
    harvest_volume_gallons real,
    notes text,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    grape_source text DEFAULT 'own_vineyard'::text,
    supplier_name text,
    user_id character varying(255) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE public.vintage OWNER TO mattpardini;

--
-- Name: COLUMN vintage.grape_source; Type: COMMENT; Schema: public; Owner: mattpardini
--

COMMENT ON COLUMN public.vintage.grape_source IS 'Source of grapes: own_vineyard or purchased';


--
-- Name: COLUMN vintage.supplier_name; Type: COMMENT; Schema: public; Owner: mattpardini
--

COMMENT ON COLUMN public.vintage.supplier_name IS 'Supplier name for purchased grapes (nullable)';


--
-- Name: wine; Type: TABLE; Schema: public; Owner: mattpardini
--

CREATE TABLE public.wine (
    id text NOT NULL,
    vintage_id text NOT NULL,
    vineyard_id text NOT NULL,
    name text NOT NULL,
    wine_type text NOT NULL,
    volume_gallons real,
    current_volume_gallons real,
    current_stage text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    last_tasting_notes text,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    blend_components jsonb,
    user_id character varying(255) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE public.wine OWNER TO mattpardini;

--
-- Name: COLUMN wine.blend_components; Type: COMMENT; Schema: public; Owner: mattpardini
--

COMMENT ON COLUMN public.wine.blend_components IS 'Array of blend components for multi-vintage wines: [{vintage_id: string, percentage: number}]. Null for single-vintage wines.';


--
-- Name: permissions; Type: TABLE; Schema: zero; Owner: mattpardini
--

CREATE TABLE zero.permissions (
    permissions jsonb,
    hash text,
    lock boolean DEFAULT true NOT NULL,
    CONSTRAINT permissions_lock_check CHECK (lock)
);


ALTER TABLE zero.permissions OWNER TO mattpardini;

--
-- Name: schemaVersions; Type: TABLE; Schema: zero; Owner: mattpardini
--

CREATE TABLE zero."schemaVersions" (
    "minSupportedVersion" integer,
    "maxSupportedVersion" integer,
    lock boolean DEFAULT true NOT NULL,
    CONSTRAINT "schemaVersions_lock_check" CHECK (lock)
);


ALTER TABLE zero."schemaVersions" OWNER TO mattpardini;

--
-- Name: clients; Type: TABLE; Schema: zero_0; Owner: mattpardini
--

CREATE TABLE zero_0.clients (
    "clientGroupID" text NOT NULL,
    "clientID" text NOT NULL,
    "lastMutationID" bigint NOT NULL,
    "userID" text
);


ALTER TABLE zero_0.clients OWNER TO mattpardini;

--
-- Name: mutations; Type: TABLE; Schema: zero_0; Owner: mattpardini
--

CREATE TABLE zero_0.mutations (
    "clientGroupID" text NOT NULL,
    "clientID" text NOT NULL,
    "mutationID" bigint NOT NULL,
    result json NOT NULL
);


ALTER TABLE zero_0.mutations OWNER TO mattpardini;

--
-- Name: replicas; Type: TABLE; Schema: zero_0; Owner: mattpardini
--

CREATE TABLE zero_0.replicas (
    slot text NOT NULL,
    version text NOT NULL,
    "initialSchema" json NOT NULL
);


ALTER TABLE zero_0.replicas OWNER TO mattpardini;

--
-- Name: shardConfig; Type: TABLE; Schema: zero_0; Owner: mattpardini
--

CREATE TABLE zero_0."shardConfig" (
    publications text[] NOT NULL,
    "ddlDetection" boolean NOT NULL,
    lock boolean DEFAULT true NOT NULL,
    CONSTRAINT "shardConfig_lock_check" CHECK (lock)
);


ALTER TABLE zero_0."shardConfig" OWNER TO mattpardini;

--
-- Name: versionHistory; Type: TABLE; Schema: zero_0; Owner: mattpardini
--

CREATE TABLE zero_0."versionHistory" (
    "dataVersion" integer NOT NULL,
    "schemaVersion" integer NOT NULL,
    "minSafeVersion" integer NOT NULL,
    lock character(1) DEFAULT 'v'::bpchar NOT NULL,
    CONSTRAINT ck_schema_meta_lock CHECK ((lock = 'v'::bpchar))
);


ALTER TABLE zero_0."versionHistory" OWNER TO mattpardini;

--
-- Name: changeLog; Type: TABLE; Schema: zero_0/cdc; Owner: mattpardini
--

CREATE TABLE "zero_0/cdc"."changeLog" (
    watermark text NOT NULL,
    pos bigint NOT NULL,
    change json NOT NULL,
    precommit text
);


ALTER TABLE "zero_0/cdc"."changeLog" OWNER TO mattpardini;

--
-- Name: replicationConfig; Type: TABLE; Schema: zero_0/cdc; Owner: mattpardini
--

CREATE TABLE "zero_0/cdc"."replicationConfig" (
    "replicaVersion" text NOT NULL,
    publications text[] NOT NULL,
    "resetRequired" boolean,
    lock integer DEFAULT 1 NOT NULL,
    CONSTRAINT "replicationConfig_lock_check" CHECK ((lock = 1))
);


ALTER TABLE "zero_0/cdc"."replicationConfig" OWNER TO mattpardini;

--
-- Name: replicationState; Type: TABLE; Schema: zero_0/cdc; Owner: mattpardini
--

CREATE TABLE "zero_0/cdc"."replicationState" (
    "lastWatermark" text NOT NULL,
    owner text,
    "ownerAddress" text,
    lock integer DEFAULT 1 NOT NULL,
    CONSTRAINT "replicationState_lock_check" CHECK ((lock = 1))
);


ALTER TABLE "zero_0/cdc"."replicationState" OWNER TO mattpardini;

--
-- Name: versionHistory; Type: TABLE; Schema: zero_0/cdc; Owner: mattpardini
--

CREATE TABLE "zero_0/cdc"."versionHistory" (
    "dataVersion" integer NOT NULL,
    "schemaVersion" integer NOT NULL,
    "minSafeVersion" integer NOT NULL,
    lock character(1) DEFAULT 'v'::bpchar NOT NULL,
    CONSTRAINT ck_schema_meta_lock CHECK ((lock = 'v'::bpchar))
);


ALTER TABLE "zero_0/cdc"."versionHistory" OWNER TO mattpardini;

--
-- Name: clients; Type: TABLE; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE TABLE "zero_0/cvr".clients (
    "clientGroupID" text NOT NULL,
    "clientID" text NOT NULL
);


ALTER TABLE "zero_0/cvr".clients OWNER TO mattpardini;

--
-- Name: desires; Type: TABLE; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE TABLE "zero_0/cvr".desires (
    "clientGroupID" text NOT NULL,
    "clientID" text NOT NULL,
    "queryHash" text NOT NULL,
    "patchVersion" text NOT NULL,
    deleted boolean,
    ttl interval,
    "inactivatedAt" timestamp with time zone
);


ALTER TABLE "zero_0/cvr".desires OWNER TO mattpardini;

--
-- Name: instances; Type: TABLE; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE TABLE "zero_0/cvr".instances (
    "clientGroupID" text NOT NULL,
    version text NOT NULL,
    "lastActive" timestamp with time zone NOT NULL,
    "ttlClock" double precision NOT NULL,
    "replicaVersion" text,
    owner text,
    "grantedAt" timestamp with time zone,
    "clientSchema" jsonb
);


ALTER TABLE "zero_0/cvr".instances OWNER TO mattpardini;

--
-- Name: queries; Type: TABLE; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE TABLE "zero_0/cvr".queries (
    "clientGroupID" text NOT NULL,
    "queryHash" text NOT NULL,
    "clientAST" jsonb,
    "queryName" text,
    "queryArgs" json,
    "patchVersion" text,
    "transformationHash" text,
    "transformationVersion" text,
    internal boolean,
    deleted boolean
);


ALTER TABLE "zero_0/cvr".queries OWNER TO mattpardini;

--
-- Name: rows; Type: TABLE; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE TABLE "zero_0/cvr".rows (
    "clientGroupID" text NOT NULL,
    schema text NOT NULL,
    "table" text NOT NULL,
    "rowKey" jsonb NOT NULL,
    "rowVersion" text NOT NULL,
    "patchVersion" text NOT NULL,
    "refCounts" jsonb
);


ALTER TABLE "zero_0/cvr".rows OWNER TO mattpardini;

--
-- Name: rowsVersion; Type: TABLE; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE TABLE "zero_0/cvr"."rowsVersion" (
    "clientGroupID" text NOT NULL,
    version text NOT NULL
);


ALTER TABLE "zero_0/cvr"."rowsVersion" OWNER TO mattpardini;

--
-- Name: versionHistory; Type: TABLE; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE TABLE "zero_0/cvr"."versionHistory" (
    "dataVersion" integer NOT NULL,
    "schemaVersion" integer NOT NULL,
    "minSafeVersion" integer NOT NULL,
    lock character(1) DEFAULT 'v'::bpchar NOT NULL,
    CONSTRAINT ck_schema_meta_lock CHECK ((lock = 'v'::bpchar))
);


ALTER TABLE "zero_0/cvr"."versionHistory" OWNER TO mattpardini;

--
-- Data for Name: _sqlx_migrations; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public._sqlx_migrations (version, description, installed_on, success, checksum, execution_time) FROM stdin;
20251110000001	initial schema	2025-11-20 19:37:15.576456-07	t	\\xd8086b0402661e2bd652b5a0a16fb88f6bf53e35d8f6769d3c34f6e1516dce384ba0760634a2cb0b696fe29221921733	6758083
20251111000003	insert default vineyard	2025-11-20 19:37:15.583671-07	t	\\x42d400afe74aa8798bb61d632b923b3804e1c15af85688d60f7b2660afeaf0b7702b9130d35ec6a26b6a2266dfb13309	1197250
20251112000001	create alert settings	2025-11-20 19:37:15.584986-07	t	\\x6e74a4bbc53ba7a092e8950f6aff09b1f3e81cadebc473f3a0ae1b57fcfb10b6c8229fed058b791586ea0bfe60441522	1974042
20251113000001	create winery tables	2025-11-20 19:37:15.587087-07	t	\\x2a81a229d57494a46f47e7b5bb886efc19dc1c4544446969691f3089302b63a3b806a1bfd6087cdfe4954da358fde591	10974583
20251113000002	seed winery reference data	2025-11-20 19:37:15.598233-07	t	\\xe7c591ca2ded0aa81963142265586b80885a35551d0deee5a76b9ac8bbf976fa6930d357d9815a126287985f845a5952	1429542
20251114000001	rename columns to snake case	2025-11-20 19:37:15.599771-07	t	\\x84418d4a62062851b65a79e8d5f577ec9dde250d391627318a61c4de66b92e849c62e7c7af3ca66b435cb688744dd8ba	564541
20251115000001	add grape source to vintage	2025-11-20 19:37:15.60044-07	t	\\x615de0fcaec5ce1cdeabf6326bf89108109f97be082cf71cae5e68ff253c0a287308cf29003147fd6384a5237ab5c7d7	815792
20251115000002	move brix to measurements	2025-11-20 19:37:15.601369-07	t	\\xbb0e379e45ab8f3feefb3b2226d534ff5ee66ad235a7ab36233cf7e488130cb406ad073ad648825fdf0d69119a53b6d1	536458
20251116000001	add blend components to wine	2025-11-20 19:37:15.601995-07	t	\\x29e42a4bdce3fdca7cfa403641a35fe2fe0c8422265ac80cc42fc0992c45f89b1bf85232757bdd2bfaf929cc4e3e1052	308041
20251118000001	add user id columns	2025-11-20 19:37:15.602401-07	t	\\xe36a4115534144c91ee94bd54407355b9d64a663e338d295f3e5b6469e0cb4ddc55ebad818029d4f26f9316546c1efbd	2211625
20251126000001	create user table	2025-11-29 06:41:11.525426-07	t	\\x01638d312f7354d2396925694dabeaf9ff011e0f0648da8fcbe64a52e06397b8dd22a7a073586c58904e7e9b8693ccdc	44909542
20251127000001	fix task template fk	2025-11-29 06:41:11.570599-07	t	\\x5dd5c46608503edc58edf5c57215fe7c169ad34e6c349a0749baa3625e59c52d76d46b70ae3335675872ea8a459d3a9f	22886500
20251129000001	add training pruning	2025-11-29 06:41:11.593618-07	t	\\x91efe3dd96d1b4fe74594f0120e9f9e935fa433820d3f4ca06c6e2657cee642ed1d14a02ab5086381af2c7d222c3a0bb	139945333
20251129000002	add training method to block	2025-11-29 10:40:51.991405-07	t	\\xcc4b12425bee6024787d71242941bc07a876139abc8aecaaebbe260f17dd562b46d9284f93a17d2576caa00deb6e3c42	134582375
\.


--
-- Data for Name: alert_settings; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.alert_settings (vineyard_id, alert_type, settings, updated_at) FROM stdin;
default	weather	{"fog": {"daysOut": 7, "enabled": false}, "rain": {"daysOut": 7, "enabled": false}, "snow": {"daysOut": 7, "enabled": true}, "frost": {"daysOut": 3, "enabled": false}, "temperature": {"daysOut": 7, "enabled": true, "lowThreshold": 28, "highThreshold": 95}, "thunderstorm": {"daysOut": 7, "enabled": false}}	1764434749418
\.


--
-- Data for Name: block; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.block (id, name, location, size_acres, soil_type, notes, created_at, updated_at, user_id, training_method, training_method_other) FROM stdin;
YO MOM	YO MOM		0			1764219503878	1764219503878	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
BLAH BLAH BOO	BLAH BLAH BOO		0			1764263347266	1764263347266	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
AB	TERRACE L		0			1764269726349	1764440660613	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
\.


--
-- Data for Name: measurement; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.measurement (id, entity_type, entity_id, date, stage, ph, ta, brix, temperature, tasting_notes, notes, created_at, updated_at, user_id) FROM stdin;
2025-pinot-harvest-measurement-1764274276883	vintage	2025-pinot	1764201600000	harvest	3.25	7.6	22	\N			1764274276883	1764274276883	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
\.


--
-- Data for Name: measurement_range; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.measurement_range (id, wine_type, measurement_type, min_value, max_value, ideal_min, ideal_max, low_warning, high_warning, created_at) FROM stdin;
ph_red	red	ph	3.2	3.8	3.4	3.5	Risk of bacterial growth. Consider MLF or monitoring closely	Consider tartaric acid addition to lower pH	1763692635598
ph_white	white	ph	2.9	3.6	3.1	3.3	May be too tart. Consider deacidification	Consider tartaric acid addition	1763692635598
ph_rose	rosé	ph	3	3.5	3.2	3.3	May be too tart. Monitor taste	Consider tartaric acid addition	1763692635598
ph_dessert	dessert	ph	3.3	3.7	3.4	3.6	Risk of instability	Consider acid addition	1763692635598
ph_sparkling	sparkling	ph	2.9	3.3	3	3.2	May affect secondary fermentation	Consider acid adjustment	1763692635598
ta_red	red	ta	5	9	6	8	Consider acid addition (tartaric or citric)	Consider deacidification or cold stabilization	1763692635598
ta_white	white	ta	6	10	7	9	Consider acid addition	Consider deacidification	1763692635598
ta_rose	rosé	ta	5.5	9.5	6.5	8.5	Consider acid addition	Consider deacidification	1763692635598
ta_dessert	dessert	ta	6	9	6.5	8	May lack structure	May be too tart for style	1763692635598
ta_sparkling	sparkling	ta	7	11	8	10	May lack freshness	Good for sparkling, monitor taste	1763692635598
brix_red	red	brix	20	28	22	26	Low sugar. Consider chaptalization or longer hang time next year	Very high sugar. May produce high alcohol wine	1763692635598
brix_white	white	brix	18	26	20	24	Low sugar. Consider chaptalization	High sugar. Monitor fermentation carefully	1763692635598
brix_rose	rosé	brix	18	24	19	22	May produce light wine	Monitor to avoid high alcohol	1763692635598
brix_dessert	dessert	brix	24	35	26	32	Too low for dessert style	Excellent for dessert wine	1763692635598
brix_sparkling	sparkling	brix	17	22	18	20	May lack body	Too high, may be too alcoholic	1763692635598
\.


--
-- Data for Name: pruning_log; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.pruning_log (id, user_id, vine_id, date, pruning_type, spurs_left, canes_before, canes_after, notes, photo_id, created_at, updated_at) FROM stdin;
7f2e0eea-1ce8-46dc-b8f2-b8bc5e800eda	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	463eea8f-3a3d-42a5-9982-c377928ca021	1764374400000	summer	3	1	2	test test test	\N	1764425554386	1764425554386
13803215-cdc0-4566-a1ba-6a77c83ede8f	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	463eea8f-3a3d-42a5-9982-c377928ca021	1764374400000	corrective	12	55	25	renidhr rtndhir 	\N	1764425569413	1764425569413
59fa8aaf-9f63-41b6-97d3-70ce4f13d9be	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	463eea8f-3a3d-42a5-9982-c377928ca021	1762387200000	corrective	6	6	6	11/6	\N	1764425592589	1764425592589
80f1064f-4ad7-4ee2-b7c8-2067507fa71e	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	463eea8f-3a3d-42a5-9982-c377928ca021	1764442800000	corrective	5	2	3	more	\N	1764427215452	1764427215452
f28f1ee4-b64b-4bea-9ed0-67dcb2cddb77	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	9f2776bd-70d4-4e24-bf2b-ce7d4d0ad464	1764442800000	summer	1	1	1	something	\N	1764427237703	1764427237703
39cf3660-f22a-4bde-8018-1ac73761b14a	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	9f2776bd-70d4-4e24-bf2b-ce7d4d0ad464	1764356400000	corrective	3	5	2	some stuff	\N	1764427258222	1764427258222
a635f2b0-e0ee-4646-a8a4-ec6adfa7cc33	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	9f2776bd-70d4-4e24-bf2b-ce7d4d0ad464	1764442800000	corrective	3	8	5	more and more 	\N	1764427311470	1764427311470
0e7dcd0a-948a-4aa1-acdc-f29ec860aab8	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	9f2776bd-70d4-4e24-bf2b-ce7d4d0ad464	1764442800000	training	5	3	3	other more things updated	\N	1764427291342	1764427331620
\.


--
-- Data for Name: stage_history; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.stage_history (id, entity_type, entity_id, stage, started_at, completed_at, skipped, notes, created_at, updated_at, user_id) FROM stdin;
2025-pinot-harvested-1764274276883	vintage	2025-pinot	harvested	1764274276883	\N	f		1764274276883	1764274276883	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
54199732-420d-47bc-9a85-7b2911b76988	wine	579e7c78-a3b7-4632-8a97-5125582b115b	crush	1764274322089	1764274335796	f		1764274322089	1764274335836	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
33cbf3cb-220b-427c-9f4d-7a839677518a	wine	579e7c78-a3b7-4632-8a97-5125582b115b	primary_fermentation	1764274335796	\N	f		1764274335796	1764274335796	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
2025-raisin-harvested-1764219541348	vintage	2025-raisin	harvested	1764219541348	\N	f		1764219541348	1764219541348	user_35OE5HRokyZRuyqGeVqV48BlnIc
790ae5d9-e8e0-4c6f-b6a6-205802ba37ce	wine	d71922c8-7031-4251-a40a-4a2a1a338b98	primary_fermentation	1764219570548	\N	f		1764219570548	1764219570548	user_35OE5HRokyZRuyqGeVqV48BlnIc
2025-a-green-grape-harvested-1764263413714	vintage	2025-a-green-grape	harvested	1764263413714	\N	f		1764263413714	1764263413714	user_35OE5HRokyZRuyqGeVqV48BlnIc
80396e88-7f23-4f10-a22d-9c12a1b4f7a5	wine	7f36ff0a-85db-4a37-85ce-cd5e0314c6c4	crush	1764263428167	\N	f		1764263428167	1764263428167	user_35OE5HRokyZRuyqGeVqV48BlnIc
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.task (id, task_template_id, entity_type, entity_id, stage, name, description, due_date, completed_at, completed_by, notes, skipped, created_at, updated_at, user_id) FROM stdin;
0f9f3639-397a-4dcc-a5c4-1191a5974345	tt_primary_red_1	wine	579e7c78-a3b7-4632-8a97-5125582b115b	primary_fermentation	Inoculate with yeast	Add selected yeast strain to must	1764274335796	1764394532373			f	1764274335796	1764394532414	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
9344d8bb-9906-4b18-8587-b3ac1a5a8b80	tt_primary_red_3	wine	579e7c78-a3b7-4632-8a97-5125582b115b	primary_fermentation	Monitor temperature	Check fermentation temperature stays in range	1764360735796	1764394533298			f	1764274335796	1764394533318	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
b6608997-0a00-4104-9577-afb3e23de3dc	tt_primary_red_4	wine	579e7c78-a3b7-4632-8a97-5125582b115b	primary_fermentation	Measure pH/TA/Brix	Take chemistry measurements	1764360735796	1764394533673			f	1764274335796	1764394533696	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
f0627fba-1ba4-46d4-995f-8ae71dcbfc07	tt_primary_red_2	wine	579e7c78-a3b7-4632-8a97-5125582b115b	primary_fermentation	Punch down cap	Push cap down into must to extract color and tannins	1764360735796	1764394534064			f	1764274335796	1764394534085	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
\.


--
-- Data for Name: task_template; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.task_template (id, vineyard_id, stage, entity_type, wine_type, name, description, frequency, frequency_count, frequency_unit, default_enabled, sort_order, created_at, updated_at, user_id) FROM stdin;
tt_bud_break_1	default	bud_break	vintage	\N	Inspect vines for frost damage	Check for any frost damage on new buds	weekly	1	weeks	t	1	1764271434185	1764423671571	
tt_bud_break_2	default	bud_break	vintage	\N	Apply sulfur spray	Preventative fungicide application	once	\N	\N	t	2	1764271434185	1764423671571	
tt_flowering_1	default	flowering	vintage	\N	Monitor weather for frost	Check forecast daily for frost risk	daily	1	days	t	1	1764271434185	1764423671571	
tt_flowering_2	default	flowering	vintage	\N	Inspect for pests	Check for mites, beetles, and other pests	weekly	1	weeks	t	2	1764271434185	1764423671571	
tt_fruiting_1	default	fruiting	vintage	\N	Thin clusters if needed	Remove excess clusters for better fruit quality	once	\N	\N	t	1	1764271434185	1764423671571	
tt_fruiting_2	default	fruiting	vintage	\N	Monitor for disease	Check for powdery mildew, downy mildew	weekly	1	weeks	t	2	1764271434185	1764423671571	
tt_veraison_1	default	veraison	vintage	\N	Net vines against birds	Install bird netting to protect ripening fruit	once	\N	\N	t	1	1764271434185	1764423671571	
tt_veraison_2	default	veraison	vintage	\N	Monitor ripeness	Check color change and berry development	weekly	1	weeks	t	2	1764271434185	1764423671571	
tt_pre_harvest_1	default	pre_harvest	vintage	\N	Measure brix	Test sugar levels in grapes	twice_weekly	2	weeks	t	1	1764271434185	1764423671571	
tt_pre_harvest_2	default	pre_harvest	vintage	\N	Taste grapes	Sample grapes for flavor development	twice_weekly	2	weeks	t	2	1764271434185	1764423671571	
tt_pre_harvest_3	default	pre_harvest	vintage	\N	Prepare harvest equipment	Clean and ready bins, crusher, press	once	\N	\N	t	3	1764271434185	1764423671571	
tt_harvest_1	default	harvest	vintage	\N	Pick grapes	Harvest grapes at optimal ripeness	once	\N	\N	t	1	1764271434185	1764423671571	
tt_harvest_2	default	harvest	vintage	\N	Weigh harvest	Record total weight of harvested grapes	once	\N	\N	t	2	1764271434185	1764423671571	
tt_harvest_3	default	harvest	vintage	\N	Take final brix measurement	Measure sugar content of harvested grapes	once	\N	\N	t	3	1764271434185	1764423671571	
tt_crush_1	default	crush	wine	\N	Crush and destem grapes	Process grapes through crusher/destemmer	once	\N	\N	t	1	1764271434186	1764423671571	
tt_crush_2	default	crush	wine	\N	Add SO2	Sulfite addition for preservation	once	\N	\N	t	2	1764271434186	1764423671571	
tt_crush_3	default	crush	wine	\N	Take initial measurements	Measure pH, TA, and brix of must	once	\N	\N	t	3	1764271434186	1764423671571	
tt_primary_red_1	default	primary_fermentation	wine	red	Inoculate with yeast	Add selected yeast strain to must	once	\N	\N	t	1	1764271434186	1764423671571	
tt_primary_red_2	default	primary_fermentation	wine	red	Punch down cap	Push cap down into must to extract color and tannins	twice_daily	2	days	t	2	1764271434186	1764423671571	
tt_primary_red_3	default	primary_fermentation	wine	red	Monitor temperature	Check fermentation temperature stays in range	twice_daily	2	days	t	3	1764271434186	1764423671571	
tt_primary_red_4	default	primary_fermentation	wine	red	Measure pH/TA/Brix	Take chemistry measurements	daily	1	days	t	4	1764271434186	1764423671571	
tt_primary_white_1	default	primary_fermentation	wine	white	Inoculate with yeast	Add selected yeast strain to juice	once	\N	\N	t	1	1764271434186	1764423671571	
tt_primary_white_2	default	primary_fermentation	wine	white	Monitor temperature	Keep fermentation cool (55-65°F)	daily	1	days	t	2	1764271434186	1764423671571	
tt_primary_white_3	default	primary_fermentation	wine	white	Measure pH/TA/Brix	Take chemistry measurements	daily	1	days	t	3	1764271434186	1764423671571	
tt_primary_rose_1	default	primary_fermentation	wine	rosé	Inoculate with yeast	Add selected yeast strain	once	\N	\N	t	1	1764271434186	1764423671571	
tt_primary_rose_2	default	primary_fermentation	wine	rosé	Monitor temperature	Keep fermentation cool (60-70°F)	daily	1	days	t	2	1764271434186	1764423671571	
tt_primary_rose_3	default	primary_fermentation	wine	rosé	Measure pH/TA/Brix	Take chemistry measurements	daily	1	days	t	3	1764271434186	1764423671571	
tt_secondary_red_1	default	secondary_fermentation	wine	red	Inoculate with ML bacteria	Add malolactic bacteria culture	once	\N	\N	t	1	1764271434186	1764423671571	
tt_secondary_red_2	default	secondary_fermentation	wine	red	Monitor MLF progress	Test for malic acid conversion	weekly	1	weeks	t	2	1764271434186	1764423671571	
tt_secondary_rose_1	default	secondary_fermentation	wine	rosé	Inoculate with ML bacteria	Add malolactic bacteria culture	once	\N	\N	t	1	1764271434186	1764423671571	
tt_racking_1	default	racking	wine	\N	Rack wine off lees	Transfer wine to clean vessel, leaving sediment	once	\N	\N	t	1	1764271434186	1764423671571	
tt_racking_2	default	racking	wine	\N	Measure volume	Record current volume after racking	once	\N	\N	t	2	1764271434186	1764423671571	
tt_racking_3	default	racking	wine	\N	Add SO2	Sulfite addition for preservation	once	\N	\N	t	3	1764271434186	1764423671571	
tt_racking_4	default	racking	wine	\N	Take measurements	Measure pH and TA	once	\N	\N	t	4	1764271434186	1764423671571	
tt_oaking_red_1	default	oaking	wine	red	Transfer to oak barrel	Move wine into oak barrel for aging	once	\N	\N	t	1	1764271434186	1764423671571	
tt_oaking_red_2	default	oaking	wine	red	Top up barrel	Add wine to keep barrel full and prevent oxidation	monthly	1	months	t	2	1764271434186	1764423671571	
tt_oaking_red_3	default	oaking	wine	red	Taste and evaluate	Sample wine to monitor oak integration	monthly	1	months	t	3	1764271434186	1764423671571	
tt_aging_1	default	aging	wine	\N	Monitor storage conditions	Check temperature and humidity	weekly	1	weeks	t	1	1764271434186	1764423671571	
tt_aging_2	default	aging	wine	\N	Taste and take notes	Evaluate wine development	monthly	1	months	t	2	1764271434186	1764423671571	
tt_bottling_1	default	bottling	wine	\N	Sanitize bottles and equipment	Clean and sanitize all bottling equipment	once	\N	\N	t	1	1764271434186	1764423671571	
tt_bottling_2	default	bottling	wine	\N	Final SO2 adjustment	Adjust sulfite levels before bottling	once	\N	\N	t	2	1764271434186	1764423671571	
tt_bottling_3	default	bottling	wine	\N	Bottle wine	Fill and cork bottles	once	\N	\N	t	3	1764271434186	1764423671571	
tt_bottling_4	default	bottling	wine	\N	Label bottles	Apply labels to finished bottles	once	\N	\N	t	4	1764271434186	1764423671571	
tt_bottling_5	default	bottling	wine	\N	Record final bottle count	Count and record total bottles produced	once	\N	\N	t	5	1764271434186	1764423671571	
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public."user" (id, email, display_name, vineyard_id, role, onboarding_completed, created_at, updated_at) FROM stdin;
user_34zvb6YsnjkI4IFo9qDJyUXGQfK	pardini.matthew@gmail.com	Matthew P	35b4e8bc-cbfb-448d-bb9e-a43ca4e35589	owner	t	1764214656165	1764214656165
user_35OE5HRokyZRuyqGeVqV48BlnIc	matthew.pardini@anglepoint.com	Matt Pardini	e5c02909-b57e-4521-ad51-8c6fead2d94a	owner	t	1764219470732	1764219470732
\.


--
-- Data for Name: vine; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.vine (id, block, sequence_number, variety, planting_date, health, notes, qr_generated, created_at, updated_at, user_id, training_method, training_method_other) FROM stdin;
463eea8f-3a3d-42a5-9982-c377928ca021	AB	10	CAB FRANC	1655251200000	GOOD		0	1764270150111	1764439659183	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	HEAD_TRAINING	\N
4eda86cf-aaf5-4e7c-9664-bc5a94fe3de7	AB	2	CAB FRANC	1764201600000	GOOD		0	1764270150111	1764439659205	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
5c3a4732-bc09-4901-aa54-f70823d5e7ec	AB	7	CAB FRANC	1764201600000	GOOD		0	1764270150111	1764439659215	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
98295f0d-4317-4fb9-b0b9-21d817a6974e	AB	3	CAB FRANC	1764201600000	GOOD		0	1764270150111	1764439659223	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
9f2776bd-70d4-4e24-bf2b-ce7d4d0ad464	AB	8	CAB FRANC	1764201600000	GOOD		0	1764270150111	1764439659232	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	HEAD_TRAINING	\N
b8fe40b5-7833-4b0d-9014-c2ded9959864	AB	9	CAB FRANC	1764201600000	GOOD		0	1764270150111	1764439659239	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
cb8ab73e-ada6-4816-861b-0c1b768ca8c1	AB	4	CAB FRANC	1764201600000	GOOD		0	1764270150111	1764439659246	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
db064127-e9da-43a8-9ceb-93297b028505	AB	5	CAB FRANC	1764201600000	GOOD		0	1764270150111	1764439659252	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
fe20b6dd-6e46-4ef6-a5fa-a73d453641cf	AB	1	CAB FRANC	1764201600000	GOOD		0	1764270150111	1764439659259	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
ffb8a0c3-588a-40a0-9a69-96097cfa900e	AB	6	CAB FRANC	1764201600000	GOOD		0	1764270150111	1764439659265	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
df1fbaeb-2f61-49aa-a2f6-ca837aed5946	AB	11	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
aba05f6d-ad19-493f-890a-458082563dd6	AB	12	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
d746b050-13af-4e3e-a956-989c9b5b4256	AB	13	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
265f42b6-38ef-414f-b8ab-ee8b1ecefa77	AB	14	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
028e179d-3cfd-4b33-bd3d-5d429de96989	AB	15	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6792080d-a921-4f33-860a-a86de02c566d	AB	16	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
d74fd4c5-42e1-4a38-a17d-2fdbb330f5fa	AB	17	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
cb93f719-6f93-41f2-93c8-587cdded165a	AB	18	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
25d28f05-a541-4e4e-adb6-e2f2bcbcd280	AB	19	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
983499dd-793d-40ae-b7ba-69c5b4e79e7c	AB	20	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
8d19e073-88ad-4d26-9f41-10ec3db02e82	AB	21	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
2fee47fe-e154-4b93-9773-b863bead54b1	AB	22	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
1b8e4186-fe92-4462-b2d8-613dfbfa35ba	AB	23	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
c179406c-ed2c-47f7-b4cd-d19b80310f5f	AB	24	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
3f748ffb-fa51-436b-b826-76c22f4555ec	AB	25	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
866cbb44-4032-4536-98bb-442aeffc0003	AB	26	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
97944117-5c2d-4cf3-a5a5-eab8179601e6	AB	27	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
7c726a27-0472-43fc-b19c-9c45a0485e47	AB	28	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
33b5ee3c-8c71-4f26-a276-940a8eb27679	AB	29	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
8248f6ff-50d9-4117-a787-46966eda9cf7	AB	30	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6f84ab7e-c90d-4ad1-bf8b-8c2e87bea86b	AB	31	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6cd2ed45-1c67-4933-a6a6-fbc5db603407	AB	32	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
46916dc5-629f-4187-a756-7062699cb9de	AB	33	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
493ec648-8daa-4658-8d0a-9247b67df304	AB	34	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
91de66fd-9b21-4126-b64a-6c0a226cf07d	AB	35	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
ef5a56cb-dbe0-4a68-ac2c-46b0180af9b6	AB	36	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6c44de73-015d-4c31-8cdb-1d7fe7469391	AB	37	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
42ac871a-2b48-4f83-b4bc-572d0c378e8b	AB	38	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
286f379d-8810-4735-b503-3ecb7eeaae61	AB	39	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
c29f4129-d560-487b-bb7d-49dacf08f35a	AB	40	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
933c15c8-bf85-46e0-8f15-c77105f22d24	AB	41	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
5e9dc619-6677-4232-b203-18977041d0fc	AB	42	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
b83484e6-04be-4c99-a5f5-d1eec6dc3e3e	AB	43	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
4cdb8fe7-4a38-4882-9277-7fe3ba2abb26	AB	44	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
d794888f-76c0-4803-88ab-353710f1ec1b	AB	45	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
5963f7f1-bd29-44b6-b847-2b2323758dbc	AB	46	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
d995da8e-e86c-48c9-a1cf-78795f8727cb	AB	47	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
75dc882a-3549-4081-b030-f7ccb13f8559	AB	48	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
471e0355-907d-4b73-bcbf-e6ea4d6cdb7b	AB	49	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
711dd89e-923b-40c5-925e-e80aab36879e	AB	50	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
870be429-9f7b-4628-b077-50ac9cd34e0f	AB	51	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
04e10296-795b-4c69-bc3c-69d96957307b	AB	52	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
bc6c011c-4dd4-499d-b340-187b31410f89	AB	53	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
ff9511d7-39be-4e90-88e0-14c6ee275f63	AB	54	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
bcdf7992-f2e5-4e38-97f4-de120b45f266	AB	55	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
33ab6f29-bdfd-4592-aa39-dc24bd4690ee	AB	56	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
12a935b7-7614-4a24-aa22-b712c72e798b	AB	57	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
58d4c676-da7b-4e92-b03a-8c619419b5cc	AB	58	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
054	YO MOM	54	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
055	YO MOM	55	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
056	YO MOM	56	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
057	YO MOM	57	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
058	YO MOM	58	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
059	YO MOM	59	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
060	YO MOM	60	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
061	YO MOM	61	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
062	YO MOM	62	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
063	YO MOM	63	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
064	YO MOM	64	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
065	YO MOM	65	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
066	YO MOM	66	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
067	YO MOM	67	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
068	YO MOM	68	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
069	YO MOM	69	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
070	YO MOM	70	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
071	YO MOM	71	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
072	YO MOM	72	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
073	YO MOM	73	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
074	YO MOM	74	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
075	YO MOM	75	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
076	YO MOM	76	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
077	YO MOM	77	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
078	YO MOM	78	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
079	YO MOM	79	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
080	YO MOM	80	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
081	YO MOM	81	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
082	YO MOM	82	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
083	YO MOM	83	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
084	YO MOM	84	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
085	YO MOM	85	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
086	YO MOM	86	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
087	YO MOM	87	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
088	YO MOM	88	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
089	YO MOM	89	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
090	YO MOM	90	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
091	YO MOM	91	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
092	YO MOM	92	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
093	YO MOM	93	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
094	YO MOM	94	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
095	YO MOM	95	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
096	YO MOM	96	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
097	YO MOM	97	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
098	YO MOM	98	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
099	YO MOM	99	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
100	YO MOM	100	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
101	YO MOM	101	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
102	YO MOM	102	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
103	YO MOM	103	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
104	YO MOM	104	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
105	YO MOM	105	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
106	YO MOM	106	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
107	YO MOM	107	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
108	YO MOM	108	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
109	YO MOM	109	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
110	YO MOM	110	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
111	YO MOM	111	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
112	YO MOM	112	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
113	YO MOM	113	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
114	YO MOM	114	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
115	YO MOM	115	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
116	YO MOM	116	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
117	YO MOM	117	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
118	YO MOM	118	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
119	YO MOM	119	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
4f3c680c-2a8a-4a21-9a18-54da5159ffc4	AB	59	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6947e9c9-b791-412c-84c5-ecbd0974023c	AB	60	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
741ad686-e3a0-4891-b43e-40a4303f9612	AB	61	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
d52449ed-f7cc-4455-a348-9d900e7ba5d5	AB	62	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
f4ff844b-e352-4aef-ba36-cd46660982aa	AB	63	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
089b7e15-448d-408d-83f5-597a2226a9c4	AB	64	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
be424e45-d07c-4b38-9a1f-89e94db7423f	AB	65	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
851bb749-1ff7-4b95-97ef-af2d4aab34ef	AB	66	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
243e7805-3ace-44cc-aeac-39ec6ada09b9	AB	67	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
1abd3cc6-b868-4ad0-94a0-d21ce4e6730d	AB	68	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
b060b47a-1619-44b1-b2ac-c744d919bde5	AB	69	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
49bc3f66-bb2d-4b68-b515-3a03bf6d49ed	AB	70	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
88baa42c-e49d-4c19-8d31-c7e542b1ed90	AB	71	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
4b8163f4-e7ff-4c4b-b552-cbc5784e9d2c	AB	72	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
9e7c6d0f-0a1f-46c8-8980-95777e4c1f70	AB	73	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
5bdc9e16-d8a1-4d8b-a819-1b3c8e2fb83a	AB	74	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
4e4a2e41-6ad6-44cb-8999-6a9075359b1a	AB	75	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
93dc1793-39ab-4009-93c6-e336fc27ae48	AB	76	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
c75aa168-ed8a-4634-bce0-2c3daadf9df4	AB	77	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
1d47e671-d554-4c46-b0e5-d2f7cc783ab5	AB	78	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
17681df8-07a0-4a2d-9cfe-8da24613d477	AB	79	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
f1f22415-f614-4629-aaa7-5f5035726b1e	AB	80	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
66d4b644-a731-428c-b396-c27c04dbb0b5	AB	81	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
099d2eea-399b-4b19-99c0-4abae1b74993	AB	82	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
2bfb082f-3a18-4586-abc9-e3cbf243e305	AB	83	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
2a07f0fb-fea9-4bce-9dad-7549809ef5d3	AB	84	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6f989a5b-1aa7-4736-a62a-b30b59f08fca	AB	85	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
868d1356-89bf-4f4a-959c-371e72fc26a5	AB	86	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
301b831b-bf8c-44cb-bb1b-b115a66db961	AB	87	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
1c6499d0-49f4-410e-aaa3-3e960cdee417	AB	88	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
b091e11a-0aa2-4a72-82cb-6c765661bc60	AB	89	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
f5505923-529b-477c-bdf3-aa5722c3de51	AB	90	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
f1bf75d0-4dd6-4c80-bc2c-38f201b251a0	AB	91	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
291afa87-9b81-427f-9e0e-7f5a97823252	AB	92	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
61953c50-102d-4b9c-ab07-12d19d7e9cd3	AB	93	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
a4a9ef3e-ef91-45e4-bb72-7ccfdf69805c	AB	94	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
4c8ace7b-adab-4912-9c8c-e46460a7319d	AB	95	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
f91245d9-3961-4689-92e0-5194af06701b	AB	96	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
41942f95-57f1-4d8e-b7cb-22f1cfa4f7f0	AB	97	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6deed08a-f4cf-4f5f-9cb6-1af365602bb2	AB	98	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
1780ab1a-ceaf-4ffa-8322-e77748757fe6	AB	99	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
01da32fc-85e1-430a-936b-71f7d53c7355	AB	100	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
120	YO MOM	120	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
121	YO MOM	121	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
122	YO MOM	122	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
123	YO MOM	123	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
124	YO MOM	124	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
125	YO MOM	125	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
126	YO MOM	126	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
127	YO MOM	127	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
128	YO MOM	128	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
129	YO MOM	129	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
130	YO MOM	130	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
131	YO MOM	131	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
132	YO MOM	132	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
133	YO MOM	133	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
134	YO MOM	134	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
135	YO MOM	135	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
136	YO MOM	136	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
137	YO MOM	137	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
138	YO MOM	138	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
139	YO MOM	139	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
140	YO MOM	140	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
141	YO MOM	141	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
142	YO MOM	142	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
143	YO MOM	143	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
144	YO MOM	144	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
145	YO MOM	145	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
146	YO MOM	146	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
147	YO MOM	147	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
148	YO MOM	148	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
149	YO MOM	149	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
150	YO MOM	150	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
151	YO MOM	151	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
152	YO MOM	152	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
153	YO MOM	153	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
154	YO MOM	154	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
155	YO MOM	155	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
156	YO MOM	156	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
157	YO MOM	157	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
158	YO MOM	158	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
159	YO MOM	159	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
160	YO MOM	160	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
161	YO MOM	161	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
162	YO MOM	162	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
163	YO MOM	163	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
164	YO MOM	164	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
165	YO MOM	165	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
166	YO MOM	166	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
167	YO MOM	167	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
168	YO MOM	168	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
169	YO MOM	169	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
170	YO MOM	170	RAISIN	1764201600000	GOOD		0	1764219514619	1764219514619	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
b2387bf2-0426-42c3-9ccb-856278f49407	AB	101	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
8276949e-4056-4266-9a6c-c8311b79a73b	AB	102	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
c9669f88-9b29-4415-88ce-bbd7b8eee0ec	AB	103	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
f188608e-2eba-42b7-980d-e49458862b55	AB	104	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
3038ea4b-b66f-41de-80ab-3a062af43c45	AB	105	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
e877247d-01a0-4514-9d17-d52704783a1d	AB	106	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
e38e27d6-a0a9-47d6-ac5a-f3a728e572ad	AB	107	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
bbae4913-fac2-438a-87ff-aa9e86361627	AB	108	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
a1789c1a-32ce-4ef1-8c34-0603cb170d5c	AB	109	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
b135d00e-6b3d-42e3-980d-7d96a95f934a	AB	110	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
8f09fe50-abe4-4edf-92ae-9c9f2b427cdd	AB	111	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
397d6e65-5a33-49bd-b53e-4eecf36f6baf	AB	112	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
febda5b0-283b-4773-8e91-b7a05fd4de10	AB	113	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
a90866df-e9ef-4640-aaee-4c9ece623454	AB	114	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
f6ddbc89-3105-483b-9bdc-5d753c6457ac	AB	115	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
669e78e2-732d-4f46-bab6-e4a87aaa449c	AB	116	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
8c04fe54-84e4-47c6-9f27-86cf3a9671df	AB	117	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
f6b18658-8c6a-46fa-a3bc-8d65a4915306	AB	118	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
1bc475a2-e734-446a-8e9e-5890472eefc5	AB	119	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
8e02b464-c57d-480b-910e-2189bb103bae	AB	120	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
abfcb4af-bda4-4666-918a-37d2297c1177	AB	121	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
1e5fddd2-4808-4c60-85b3-6b6c9f2cc0c3	AB	122	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
76171cd9-8de2-4c54-ab51-a938e6378bfe	AB	123	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
e83c6161-7b3e-4410-9efc-3a038985a36b	AB	124	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
8a1c3652-5e2b-48a3-ba20-30be4c327629	AB	125	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
9cbc9cb6-4883-431d-b61f-6f029c90a17d	AB	126	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
db193ec1-3b92-497c-9c02-fe94ad018cfb	AB	127	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
49f3eb9f-31e1-47fb-a39e-86384c2fb11a	AB	128	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
978c8e19-aa85-41d4-aaed-3c419bacf824	AB	129	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
64650a19-fcb8-45fc-b116-3e524c1c4f95	AB	130	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
e3d9b913-bf62-4a07-9a02-729130177add	AB	131	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
2477b66c-42e9-4b14-83ee-e2d72a30a4dc	AB	132	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6af807fd-9253-46a4-a5d3-7e8f3fef9324	AB	133	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
8d7a4cd8-cdd2-408a-baab-a2853c28f3a7	AB	134	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
ac3ceded-91dc-4fde-92e3-a16c630c82b7	AB	135	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
ab56d74a-4ade-4067-8711-e8fc53e26de0	AB	136	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
d83aab95-afb4-47e6-b933-b107331f6dde	AB	137	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
9efe0375-e49a-4a0e-95fa-175f01ee83d4	AB	138	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
4411efca-6030-4a8b-913c-9b50a62380ba	AB	139	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
11b874f3-5350-4cb9-9a21-cf3472eeb6cb	AB	140	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
25c758b2-4659-45ef-ad1f-a3b78615c7a1	AB	141	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
80783890-aa16-4cab-8e09-351af84f4f64	AB	142	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
877e26c8-1e25-4933-ba83-4be46a8e4d82	AB	143	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
80358e79-89de-4d1a-855e-2631c8a851ae	AB	144	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
f27468d3-9029-4f42-a073-39070701c860	AB	145	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
766625e0-2489-4644-975f-8dcc9ea906a5	AB	146	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
e84975c5-4e97-4520-ad0b-ee7ae0484783	AB	147	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
a207cd86-c5c2-423d-a6f6-8b0cc881ef92	AB	148	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
c3444638-d886-4358-a82c-41d832a636ee	AB	149	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
53b30ce6-6704-45f0-8eba-732f18ef639a	AB	150	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
806d4af9-e4cd-4358-bf5d-bc21394294e8	AB	151	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6f9fce41-4e42-4bfe-912c-72008107d1eb	AB	152	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
8f449637-033e-4e5b-a3d1-84c93f8fa9a7	AB	153	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
ebb4590a-d492-4388-9738-99c7bf9c1816	AB	154	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
84e01b8c-a8c9-41de-8a74-490ed4881ba2	AB	155	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
01b033e1-8711-4e15-baa7-3b9095aaf854	AB	156	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
a2d983f2-4f1d-40da-89c5-802dfcc17dd7	AB	157	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
e729e169-256a-40ef-bebb-8680d6394121	AB	158	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
48f2c08e-e313-4d2c-81f9-11e913dcb659	AB	159	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
6977f6d5-1cec-4173-a4a6-40cb3d53c5e5	AB	160	SAUV	1764374400000	GOOD		0	1764440055679	1764440055679	user_34zvb6YsnjkI4IFo9qDJyUXGQfK	\N	\N
ee0bd754-19e7-4f70-8f70-1ca5767ae104	BLAH BLAH BOO	171	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
94b1c8f1-2a67-4877-9092-cde08db88b0c	BLAH BLAH BOO	172	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
24aeae46-0cd6-4464-a61a-dce78920332c	BLAH BLAH BOO	173	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
857b9fe6-e1c2-496c-9e32-ecdefb8c4f9f	BLAH BLAH BOO	174	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
5e9cbc95-5be7-4341-a635-b1409f79fd18	BLAH BLAH BOO	175	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
f0f85881-7f7d-42ab-a803-02510405b2a7	BLAH BLAH BOO	176	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
255e8229-f58d-458f-81c9-e4f3921fe858	BLAH BLAH BOO	177	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
7811cf2e-98a3-4bdc-a4cd-3991265f953e	BLAH BLAH BOO	178	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
f23058f0-88b5-42db-bd98-20e1318f93c9	BLAH BLAH BOO	179	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
5dd63235-5dea-43ca-99f4-80ff9f946b9b	BLAH BLAH BOO	180	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
9af13313-4cbc-413a-9f6c-2f29ea389510	BLAH BLAH BOO	181	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
19c800d1-d987-4d52-a058-5f76772ecae3	BLAH BLAH BOO	182	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
9bfe79a0-ffc2-4d70-a85f-fa4f0e72c078	BLAH BLAH BOO	183	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
387913a1-64ab-4bae-bcdd-a3108df78b87	BLAH BLAH BOO	184	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
6d7d58de-65ab-4b95-9fa9-023faa3d2c77	BLAH BLAH BOO	185	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
a7a1c2fe-536c-479f-b199-1bbf34a07353	BLAH BLAH BOO	186	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
9910c555-4c1e-46e3-9d10-2d3843442183	BLAH BLAH BOO	187	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
7a817d53-767b-4ada-b624-51f98912b147	BLAH BLAH BOO	188	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
d956bbc5-1aa6-4c10-bc08-b81dfa6b3403	BLAH BLAH BOO	189	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
dcdf49d8-988e-4e78-8503-9e0d4450383d	BLAH BLAH BOO	190	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
6c177a5c-b5e7-46a5-848f-8dd8ef4043cd	BLAH BLAH BOO	191	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
2e868132-4822-490b-9cf6-6a385362f9bf	BLAH BLAH BOO	192	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
95887db6-5faf-4f6d-a6eb-21885ca45a7b	BLAH BLAH BOO	193	BLUEBERRY	1764201600000	GOOD		0	1764263359129	1764263359129	user_35OE5HRokyZRuyqGeVqV48BlnIc	\N	\N
\.


--
-- Data for Name: vineyard; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.vineyard (id, name, location, varieties, created_at, updated_at, user_id) FROM stdin;
e5c02909-b57e-4521-ad51-8c6fead2d94a	My My Metro	40.594482, -111.845994	{"A GRAPE","A GREEN GRAPE",RAISIN}	1764219470732	1764263370992	user_35OE5HRokyZRuyqGeVqV48BlnIc
35b4e8bc-cbfb-448d-bb9e-a43ca4e35589	blah blah boo	40.594219, -111.845878	{"CAB FRANC",SAUV}	1764214656165	1764439659271	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
\.


--
-- Data for Name: vintage; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.vintage (id, vineyard_id, vintage_year, variety, block_ids, current_stage, harvest_date, harvest_weight_lbs, harvest_volume_gallons, notes, created_at, updated_at, grape_source, supplier_name, user_id) FROM stdin;
2025-raisin	e5c02909-b57e-4521-ad51-8c6fead2d94a	2025	RAISIN	{}	harvested	1764201600000	\N	\N		1764219541348	1764219541348	own_vineyard	\N	user_35OE5HRokyZRuyqGeVqV48BlnIc
2025-a-green-grape	e5c02909-b57e-4521-ad51-8c6fead2d94a	2025	A GREEN GRAPE	{}	harvested	1764201600000	\N	\N		1764263413714	1764263413714	own_vineyard	\N	user_35OE5HRokyZRuyqGeVqV48BlnIc
2025-pinot	35b4e8bc-cbfb-448d-bb9e-a43ca4e35589	2025	PINOT	{}	harvested	1764201600000	60	6	This was a great harvest. It tested a little less acidic pre-harvest, but we got a lot off many vines. Did not include all blocks, only T1 and T2	1764274276883	1764274276883	own_vineyard	\N	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
\.


--
-- Data for Name: wine; Type: TABLE DATA; Schema: public; Owner: mattpardini
--

COPY public.wine (id, vintage_id, vineyard_id, name, wine_type, volume_gallons, current_volume_gallons, current_stage, status, last_tasting_notes, created_at, updated_at, blend_components, user_id) FROM stdin;
d71922c8-7031-4251-a40a-4a2a1a338b98	2025-raisin	e5c02909-b57e-4521-ad51-8c6fead2d94a	THE MOTHER LOAD	rosé	900	900	primary_fermentation	active		1764219570548	1764219570548	\N	user_35OE5HRokyZRuyqGeVqV48BlnIc
7f36ff0a-85db-4a37-85ce-cd5e0314c6c4	2025-a-green-grape	e5c02909-b57e-4521-ad51-8c6fead2d94a	MY MY GREEN VINE	red	55	55	crush	active		1764263428167	1764263428167	\N	user_35OE5HRokyZRuyqGeVqV48BlnIc
579e7c78-a3b7-4632-8a97-5125582b115b	2025-pinot	35b4e8bc-cbfb-448d-bb9e-a43ca4e35589	THE BENNY	red	6	6	primary_fermentation	active		1764274322089	1764274335860	\N	user_34zvb6YsnjkI4IFo9qDJyUXGQfK
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: zero; Owner: mattpardini
--

COPY zero.permissions (permissions, hash, lock) FROM stdin;
{"tables": {"task": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "user": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "vine": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "wine": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "block": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "vintage": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "vineyard": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "measurement": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "pruning_log": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "stage_history": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "task_template": {"row": {"delete": [["allow", {"type": "and", "conditions": []}]], "insert": [["allow", {"type": "and", "conditions": []}]], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [["allow", {"type": "and", "conditions": []}]], "postMutation": [["allow", {"type": "and", "conditions": []}]]}}}, "measurement_range": {"row": {"delete": [], "insert": [], "select": [["allow", {"type": "and", "conditions": []}]], "update": {"preMutation": [], "postMutation": []}}}}}	3dc54fc818ed762ac78d82365ac3fe97	t
\.


--
-- Data for Name: schemaVersions; Type: TABLE DATA; Schema: zero; Owner: mattpardini
--

COPY zero."schemaVersions" ("minSupportedVersion", "maxSupportedVersion", lock) FROM stdin;
1	1	t
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: zero_0; Owner: mattpardini
--

COPY zero_0.clients ("clientGroupID", "clientID", "lastMutationID", "userID") FROM stdin;
6g1qd923t3ki0i9gu9	ea6fa9ghn2puhnccu5	1	\N
6g1qd923t3ki0i9gu9	40vocat67tdusoghmm	2	\N
6g1qd923t3ki0i9gu9	6dbtip36u7603rn27t	2	\N
lananaqcj6js8htau4	k8icf8eeol5oa364ki	24	\N
lananaqcj6js8htau4	dfipfsll3649bad863	151	\N
6g1qd923t3ki0i9gu9	n38l8e779r5snvgs5k	2	\N
f7apckcs7fr9gqaers	f1u3o94p7c6o0t0dds	21	\N
6g1qd923t3ki0i9gu9	oovf3kq42hi19tig5r	2	\N
f7apckcs7fr9gqaers	i62auvhcrd4b4ahurj	13	\N
6g1qd923t3ki0i9gu9	aoogm54buj26ub2fjm	2	\N
m041b6mbeasp5cpjg5	s3dveaccnbu1g1i4b2	2	\N
lananaqcj6js8htau4	t2p96iu4rd3gcl72kr	151	\N
klpqq44dtq617l9irf	5qc9ru2rftrpcn0da0	4	\N
mhjo4lrk3s0fdtvi6n	bi04c0tnid3jcu2h03	2	\N
lananaqcj6js8htau4	kg5i2r7uvhe1k58r2a	3	\N
mhjo4lrk3s0fdtvi6n	8lvmq9eetu8t72b69n	4	\N
mhjo4lrk3s0fdtvi6n	bfatun5m6qkdc9n7sm	1	\N
mhjo4lrk3s0fdtvi6n	d3n8u490k9g8eb3r4b	2	\N
mhjo4lrk3s0fdtvi6n	0b5jk1ksqv3j5fqpeo	1	\N
mhjo4lrk3s0fdtvi6n	5qhodn3vjrh2qf70e2	2	\N
mhjo4lrk3s0fdtvi6n	a5c5grhaldg56k1d31	2	\N
4m3i5a8ugvsu8abgto	do51hk7419gauufque	25	\N
4m3i5a8ugvsu8abgto	nb02fgr82vvhb3h01q	1	\N
mhjo4lrk3s0fdtvi6n	26vjkn5b42ekcm9ct7	4	\N
mhjo4lrk3s0fdtvi6n	uras2fc27b4o5rldpc	2	\N
mhjo4lrk3s0fdtvi6n	kdno96sn5o3t5h7fev	2	\N
mhjo4lrk3s0fdtvi6n	2vd6cdk096p0le9jeh	1	\N
f7apckcs7fr9gqaers	mulf4qo2kr4do0fsml	8	\N
hrnt7c7fsbpbitqik7	o0tricra360fneciuv	2	\N
lb23po2rk9du4ri0vs	ti0uvlq0tkjmje6t3v	1	\N
lb23po2rk9du4ri0vs	fhf2anmief4vbiatki	1	\N
lb23po2rk9du4ri0vs	fhgqo5fspbg1l10jen	2	\N
selbm4q1nujueksntp	jkjuvj4f8ikc907sik	172	\N
lb23po2rk9du4ri0vs	bqeb5nef4vbgsl2na5	3	\N
lb23po2rk9du4ri0vs	3i12jqdcqub8p3ue4h	1	\N
lb23po2rk9du4ri0vs	5um5hkf22341oh1rfr	1	\N
lb23po2rk9du4ri0vs	7pomiip7v0uafb0dnt	1	\N
f7apckcs7fr9gqaers	gm4kkf3lml0ak8h1od	4	\N
lb23po2rk9du4ri0vs	sfrc58mmqukd4a7kh8	1	\N
us4bmok9jgd096p15v	q0bn7v4obsu6msdri1	1	\N
cgra5a4a5njn6oslcj	0i5c8mqp5cfa73jh66	1	\N
lgjjhlae3ahqt5kavi	nu25mv7155trhrdn9k	2	\N
g96e8k2rg7l6p0b6o2	0ku0enal0gbuneg7ne	2	\N
co3tceof4g2pan2tc9	18g4ji73nlgq7783o3	2	\N
co3tceof4g2pan2tc9	9i5k8a32kt1u8bi68n	1	\N
co3tceof4g2pan2tc9	n0cq8ost82uuv8ocqj	1	\N
selbm4q1nujueksntp	21fq0da29r4m9ug5nc	2	\N
juvq521i8qisoh2r9v	36cm22kvkptgs1ehrr	1	\N
f7apckcs7fr9gqaers	ggg6tdrs9f3ce30ut7	3	\N
f7apckcs7fr9gqaers	jv7tli0cgjfhhmuo91	1	\N
selbm4q1nujueksntp	8gpr3cj12t8konsfd3	4	\N
f7apckcs7fr9gqaers	s9qqq4s4ca4c8g9rd9	3	\N
lananaqcj6js8htau4	eabmcuik4r5qhpjqfl	151	\N
f7apckcs7fr9gqaers	j1bccg1gcmobrdsao0	11	\N
4m3i5a8ugvsu8abgto	qe6slhc0gmrcip4op1	4	\N
lananaqcj6js8htau4	vi2b2qad97gu9gudo2	152	\N
5f3aqm0ssvgt7dnqk3	05dklb5krq95qdlr13	100	\N
lananaqcj6js8htau4	l84fi8hlnf2ai3sbvb	2	\N
lananaqcj6js8htau4	21r9jku31bccs5dh2l	10	\N
f7apckcs7fr9gqaers	3s9hacat4edf5h2pc3	34	\N
lananaqcj6js8htau4	7u971bioer1kd6qsmv	3	\N
lananaqcj6js8htau4	9r8740l6u0v87ijvpp	151	\N
lananaqcj6js8htau4	m3pkucn32nfnh8vgc6	256	\N
5f3aqm0ssvgt7dnqk3	3plgs2j8p1br26duri	100	\N
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	5	\N
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	3	\N
lananaqcj6js8htau4	m9obru4gjo2ntuadud	2	\N
lananaqcj6js8htau4	kol92elp5mrobf5e9d	2	\N
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	18	\N
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	10	\N
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	9	\N
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	8	\N
lananaqcj6js8htau4	4snodhil2u1getab18	3	\N
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	10	\N
lananaqcj6js8htau4	4u93sla95qngpp0k6c	3	\N
lananaqcj6js8htau4	66n997q0omm3c7mg1i	22	\N
lananaqcj6js8htau4	q6nn4anq1ollumgndb	34	\N
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	9	\N
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	3	\N
lananaqcj6js8htau4	f38a6m2d84go31q2ll	2	\N
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	13	\N
lananaqcj6js8htau4	qkhr7raed6ths7fd5i	2	\N
lananaqcj6js8htau4	71os01irlgg9120h0b	1	\N
lananaqcj6js8htau4	eo0qugng3mpspb58as	13	\N
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	2	\N
lananaqcj6js8htau4	0on89uat46f1boko9t	5	\N
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	19	\N
lananaqcj6js8htau4	inqritfqb2noc6jd33	8	\N
lananaqcj6js8htau4	gaqgh9jd3safb2h3o2	3	\N
lananaqcj6js8htau4	8sca6026i7sheb4811	14	\N
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	2	\N
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	7	\N
lananaqcj6js8htau4	gglfcqmlreh1c952p3	2	\N
lananaqcj6js8htau4	upngfbg4kovohhrmf9	4	\N
uk74dsudpgd94faf3n	54m3rs68vas04rcqlk	1	\N
88nh1g3umqn4ia48q0	uuigjoj29dpmtalhsp	1	\N
uk74dsudpgd94faf3n	f0hjjppmk4879lddns	2	\N
uk74dsudpgd94faf3n	mimq96bbomdq325vbq	1	\N
uk74dsudpgd94faf3n	fi6emo63bpgt4jqqrn	2	\N
uk74dsudpgd94faf3n	9f3elvilaek4nrlmbn	1	\N
uk74dsudpgd94faf3n	4966gqdvsogft8umig	1	\N
uk74dsudpgd94faf3n	2svpnpeh67qcdvrhe1	1	\N
uk74dsudpgd94faf3n	pqhddjahl0r2sver56	1	\N
uk74dsudpgd94faf3n	4dqmckj4i271sbi95i	2	\N
uk74dsudpgd94faf3n	i67s55b3hs5v5h751o	1	\N
uk74dsudpgd94faf3n	bq5k58pgb4t5ntf7es	2	\N
uk74dsudpgd94faf3n	pli24c6h5j97o2f2h7	3	\N
uk74dsudpgd94faf3n	ge2d9qcevecbae6rto	2	\N
88nh1g3umqn4ia48q0	qbir6a80n53bicv966	11	\N
88nh1g3umqn4ia48q0	15vovggackulaosh7a	150	\N
\.


--
-- Data for Name: mutations; Type: TABLE DATA; Schema: zero_0; Owner: mattpardini
--

COPY zero_0.mutations ("clientGroupID", "clientID", "mutationID", result) FROM stdin;
\.


--
-- Data for Name: replicas; Type: TABLE DATA; Schema: zero_0; Owner: mattpardini
--

COPY zero_0.replicas (slot, version, "initialSchema") FROM stdin;
zero_0_1764218530301	554tsug	{"tables":[{"oid":25482,"schema":"public","name":"_sqlx_migrations","replicaIdentity":"d","columns":{"checksum":{"pos":5,"dflt":null,"notNull":true,"typeOID":17,"dataType":"bytea","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"description":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"execution_time":{"pos":6,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"installed_on":{"pos":3,"dflt":"now()","notNull":true,"typeOID":1184,"dataType":"timestamptz","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"success":{"pos":4,"dflt":null,"notNull":true,"typeOID":16,"dataType":"bool","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"version":{"pos":1,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["version"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25518,"schema":"public","name":"alert_settings","replicaIdentity":"d","columns":{"alert_type":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"settings":{"pos":3,"dflt":null,"notNull":true,"typeOID":3802,"dataType":"jsonb","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":4,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"vineyard_id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["vineyard_id","alert_type"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25497,"schema":"public","name":"block","replicaIdentity":"d","columns":{"created_at":{"pos":7,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"location":{"pos":3,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"name":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"notes":{"pos":6,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"size_acres":{"pos":4,"dflt":null,"notNull":false,"typeOID":1700,"dataType":"numeric","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"soil_type":{"pos":5,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":8,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"user_id":{"pos":9,"dflt":"''::character varying","notNull":true,"typeOID":1043,"dataType":"varchar","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":255}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25609,"schema":"public","name":"measurement","replicaIdentity":"d","columns":{"brix":{"pos":8,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"created_at":{"pos":12,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"date":{"pos":4,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"entity_id":{"pos":3,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"entity_type":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"notes":{"pos":11,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"ph":{"pos":6,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"stage":{"pos":5,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"ta":{"pos":7,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"tasting_notes":{"pos":10,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"temperature":{"pos":9,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":13,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"user_id":{"pos":14,"dflt":"''::character varying","notNull":true,"typeOID":1043,"dataType":"varchar","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":255}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25619,"schema":"public","name":"measurement_range","replicaIdentity":"d","columns":{"created_at":{"pos":10,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"high_warning":{"pos":9,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"ideal_max":{"pos":7,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"ideal_min":{"pos":6,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"low_warning":{"pos":8,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"max_value":{"pos":5,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"measurement_type":{"pos":3,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"min_value":{"pos":4,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"wine_type":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25566,"schema":"public","name":"stage_history","replicaIdentity":"d","columns":{"completed_at":{"pos":6,"dflt":null,"notNull":false,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"created_at":{"pos":9,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"entity_id":{"pos":3,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"entity_type":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"notes":{"pos":8,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"skipped":{"pos":7,"dflt":"false","notNull":false,"typeOID":16,"dataType":"bool","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"stage":{"pos":4,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"started_at":{"pos":5,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":10,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"user_id":{"pos":11,"dflt":"''::character varying","notNull":true,"typeOID":1043,"dataType":"varchar","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":255}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25592,"schema":"public","name":"task","replicaIdentity":"d","columns":{"completed_at":{"pos":9,"dflt":null,"notNull":false,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"completed_by":{"pos":10,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"created_at":{"pos":13,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"description":{"pos":7,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"due_date":{"pos":8,"dflt":null,"notNull":false,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"entity_id":{"pos":4,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"entity_type":{"pos":3,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"name":{"pos":6,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"notes":{"pos":11,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"skipped":{"pos":12,"dflt":"false","notNull":false,"typeOID":16,"dataType":"bool","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"stage":{"pos":5,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"task_template_id":{"pos":2,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":14,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"user_id":{"pos":15,"dflt":"''::character varying","notNull":true,"typeOID":1043,"dataType":"varchar","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":255}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25576,"schema":"public","name":"task_template","replicaIdentity":"d","columns":{"created_at":{"pos":13,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"default_enabled":{"pos":11,"dflt":"true","notNull":false,"typeOID":16,"dataType":"bool","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"description":{"pos":7,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"entity_type":{"pos":4,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"frequency":{"pos":8,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"frequency_count":{"pos":9,"dflt":null,"notNull":false,"typeOID":23,"dataType":"int4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"frequency_unit":{"pos":10,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"name":{"pos":6,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"sort_order":{"pos":12,"dflt":null,"notNull":false,"typeOID":23,"dataType":"int4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"stage":{"pos":3,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":14,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"user_id":{"pos":15,"dflt":"''::character varying","notNull":true,"typeOID":1043,"dataType":"varchar","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":255},"vineyard_id":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"wine_type":{"pos":5,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25864,"schema":"public","name":"user","replicaIdentity":"d","columns":{"created_at":{"pos":7,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"display_name":{"pos":3,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"email":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"onboarding_completed":{"pos":6,"dflt":"false","notNull":true,"typeOID":16,"dataType":"bool","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"role":{"pos":5,"dflt":"'owner'::text","notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":8,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"vineyard_id":{"pos":4,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25504,"schema":"public","name":"vine","replicaIdentity":"d","columns":{"block":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"created_at":{"pos":9,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"health":{"pos":6,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"notes":{"pos":7,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"planting_date":{"pos":5,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"qr_generated":{"pos":8,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"sequence_number":{"pos":3,"dflt":null,"notNull":true,"typeOID":23,"dataType":"int4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":10,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"user_id":{"pos":11,"dflt":"''::character varying","notNull":true,"typeOID":1043,"dataType":"varchar","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":255},"variety":{"pos":4,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25490,"schema":"public","name":"vineyard","replicaIdentity":"d","columns":{"created_at":{"pos":5,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"location":{"pos":3,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"name":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":6,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"user_id":{"pos":7,"dflt":"''::character varying","notNull":true,"typeOID":1043,"dataType":"varchar","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":255},"varieties":{"pos":4,"dflt":null,"notNull":false,"typeOID":1009,"dataType":"text[]","pgTypeClass":"b","elemPgTypeClass":"b","characterMaximumLength":null}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25527,"schema":"public","name":"vintage","replicaIdentity":"d","columns":{"block_ids":{"pos":5,"dflt":null,"notNull":false,"typeOID":1009,"dataType":"text[]","pgTypeClass":"b","elemPgTypeClass":"b","characterMaximumLength":null},"created_at":{"pos":12,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"current_stage":{"pos":6,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"grape_source":{"pos":14,"dflt":"'own_vineyard'::text","notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"harvest_date":{"pos":7,"dflt":null,"notNull":false,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"harvest_volume_gallons":{"pos":9,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"harvest_weight_lbs":{"pos":8,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"notes":{"pos":11,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"supplier_name":{"pos":15,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":13,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"user_id":{"pos":16,"dflt":"''::character varying","notNull":true,"typeOID":1043,"dataType":"varchar","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":255},"variety":{"pos":4,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"vineyard_id":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"vintage_year":{"pos":3,"dflt":null,"notNull":true,"typeOID":23,"dataType":"int4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25544,"schema":"public","name":"wine","replicaIdentity":"d","columns":{"blend_components":{"pos":13,"dflt":null,"notNull":false,"typeOID":3802,"dataType":"jsonb","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"created_at":{"pos":11,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"current_stage":{"pos":8,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"current_volume_gallons":{"pos":7,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"id":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"last_tasting_notes":{"pos":10,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"name":{"pos":4,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"status":{"pos":9,"dflt":"'active'::text","notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"updated_at":{"pos":12,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"user_id":{"pos":14,"dflt":"''::character varying","notNull":true,"typeOID":1043,"dataType":"varchar","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":255},"vineyard_id":{"pos":3,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"vintage_id":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"volume_gallons":{"pos":6,"dflt":null,"notNull":false,"typeOID":700,"dataType":"float4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"wine_type":{"pos":5,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["id"],"publications":{"_zero_public_0":{"rowFilter":null}}},{"oid":25659,"schema":"zero","name":"permissions","replicaIdentity":"d","columns":{"hash":{"pos":2,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"lock":{"pos":3,"dflt":"true","notNull":true,"typeOID":16,"dataType":"bool","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"permissions":{"pos":1,"dflt":null,"notNull":false,"typeOID":3802,"dataType":"jsonb","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["lock"],"publications":{"_zero_metadata_0":{"rowFilter":null}}},{"oid":25652,"schema":"zero","name":"schemaVersions","replicaIdentity":"d","columns":{"lock":{"pos":3,"dflt":"true","notNull":true,"typeOID":16,"dataType":"bool","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"maxSupportedVersion":{"pos":2,"dflt":null,"notNull":false,"typeOID":23,"dataType":"int4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"minSupportedVersion":{"pos":1,"dflt":null,"notNull":false,"typeOID":23,"dataType":"int4","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["lock"],"publications":{"_zero_metadata_0":{"rowFilter":null}}},{"oid":25756,"schema":"zero_0","name":"clients","replicaIdentity":"d","columns":{"clientGroupID":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"clientID":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"lastMutationID":{"pos":3,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"userID":{"pos":4,"dflt":null,"notNull":false,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["clientGroupID","clientID"],"publications":{"_zero_metadata_0":{"rowFilter":null}}},{"oid":25763,"schema":"zero_0","name":"mutations","replicaIdentity":"d","columns":{"clientGroupID":{"pos":1,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"clientID":{"pos":2,"dflt":null,"notNull":true,"typeOID":25,"dataType":"text","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"mutationID":{"pos":3,"dflt":null,"notNull":true,"typeOID":20,"dataType":"int8","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null},"result":{"pos":4,"dflt":null,"notNull":true,"typeOID":114,"dataType":"json","pgTypeClass":"b","elemPgTypeClass":null,"characterMaximumLength":null}},"primaryKey":["clientGroupID","clientID","mutationID"],"publications":{"_zero_metadata_0":{"rowFilter":null}}}],"indexes":[{"schema":"public","tableName":"_sqlx_migrations","name":"_sqlx_migrations_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"version":"ASC"}},{"schema":"public","tableName":"alert_settings","name":"alert_settings_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"vineyard_id":"ASC","alert_type":"ASC"}},{"schema":"public","tableName":"alert_settings","name":"idx_alert_settings_type","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"alert_type":"ASC"}},{"schema":"public","tableName":"alert_settings","name":"idx_alert_settings_updated_at","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"updated_at":"ASC"}},{"schema":"public","tableName":"block","name":"block_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"block","name":"idx_block_user_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"user_id":"ASC"}},{"schema":"public","tableName":"measurement","name":"idx_measurement_date","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"date":"ASC"}},{"schema":"public","tableName":"measurement","name":"idx_measurement_entity","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"entity_type":"ASC","entity_id":"ASC"}},{"schema":"public","tableName":"measurement","name":"idx_measurement_stage","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"stage":"ASC"}},{"schema":"public","tableName":"measurement","name":"idx_measurement_user_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"user_id":"ASC"}},{"schema":"public","tableName":"measurement","name":"measurement_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"measurement_range","name":"idx_measurement_range_wine_type","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"wine_type":"ASC"}},{"schema":"public","tableName":"measurement_range","name":"measurement_range_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"measurement_range","name":"unique_range_per_type","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"wine_type":"ASC","measurement_type":"ASC"}},{"schema":"public","tableName":"stage_history","name":"idx_stage_history_entity","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"entity_type":"ASC","entity_id":"ASC"}},{"schema":"public","tableName":"stage_history","name":"idx_stage_history_stage","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"stage":"ASC"}},{"schema":"public","tableName":"stage_history","name":"idx_stage_history_user_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"user_id":"ASC"}},{"schema":"public","tableName":"stage_history","name":"stage_history_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"task","name":"idx_task_completed","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"completed_at":"ASC"}},{"schema":"public","tableName":"task","name":"idx_task_due","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"due_date":"ASC"}},{"schema":"public","tableName":"task","name":"idx_task_entity","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"entity_type":"ASC","entity_id":"ASC"}},{"schema":"public","tableName":"task","name":"idx_task_stage","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"stage":"ASC"}},{"schema":"public","tableName":"task","name":"idx_task_user_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"user_id":"ASC"}},{"schema":"public","tableName":"task","name":"task_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"task_template","name":"idx_task_template_stage","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"stage":"ASC"}},{"schema":"public","tableName":"task_template","name":"idx_task_template_user_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"user_id":"ASC"}},{"schema":"public","tableName":"task_template","name":"idx_task_template_vineyard","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"vineyard_id":"ASC"}},{"schema":"public","tableName":"task_template","name":"idx_task_template_wine_type","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"wine_type":"ASC"}},{"schema":"public","tableName":"task_template","name":"task_template_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"user","name":"idx_user_email","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"email":"ASC"}},{"schema":"public","tableName":"user","name":"idx_user_vineyard_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"vineyard_id":"ASC"}},{"schema":"public","tableName":"user","name":"user_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"vine","name":"idx_vine_block","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"block":"ASC"}},{"schema":"public","tableName":"vine","name":"idx_vine_user_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"user_id":"ASC"}},{"schema":"public","tableName":"vine","name":"idx_vine_variety","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"variety":"ASC"}},{"schema":"public","tableName":"vine","name":"vine_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"vineyard","name":"idx_vineyard_user_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"user_id":"ASC"}},{"schema":"public","tableName":"vineyard","name":"vineyard_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"vintage","name":"idx_vintage_stage","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"current_stage":"ASC"}},{"schema":"public","tableName":"vintage","name":"idx_vintage_user_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"user_id":"ASC"}},{"schema":"public","tableName":"vintage","name":"idx_vintage_vineyard","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"vineyard_id":"ASC"}},{"schema":"public","tableName":"vintage","name":"idx_vintage_year","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"vintage_year":"ASC"}},{"schema":"public","tableName":"vintage","name":"unique_vintage_per_variety_year","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"vineyard_id":"ASC","variety":"ASC","vintage_year":"ASC"}},{"schema":"public","tableName":"vintage","name":"vintage_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"public","tableName":"vintage","name":"vintage_unique_source","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"vineyard_id":"ASC","variety":"ASC","vintage_year":"ASC","grape_source":"ASC","supplier_name":"ASC"}},{"schema":"public","tableName":"wine","name":"idx_wine_stage","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"current_stage":"ASC"}},{"schema":"public","tableName":"wine","name":"idx_wine_status","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"status":"ASC"}},{"schema":"public","tableName":"wine","name":"idx_wine_user_id","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"user_id":"ASC"}},{"schema":"public","tableName":"wine","name":"idx_wine_vineyard","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"vineyard_id":"ASC"}},{"schema":"public","tableName":"wine","name":"idx_wine_vintage","unique":false,"isReplicaIdentity":false,"isImmediate":true,"columns":{"vintage_id":"ASC"}},{"schema":"public","tableName":"wine","name":"wine_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"id":"ASC"}},{"schema":"zero","tableName":"permissions","name":"permissions_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"lock":"ASC"}},{"schema":"zero","tableName":"schemaVersions","name":"schemaVersions_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"lock":"ASC"}},{"schema":"zero_0","tableName":"clients","name":"clients_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"clientGroupID":"ASC","clientID":"ASC"}},{"schema":"zero_0","tableName":"mutations","name":"mutations_pkey","unique":true,"isReplicaIdentity":false,"isImmediate":true,"columns":{"clientGroupID":"ASC","clientID":"ASC","mutationID":"ASC"}}]}
\.


--
-- Data for Name: shardConfig; Type: TABLE DATA; Schema: zero_0; Owner: mattpardini
--

COPY zero_0."shardConfig" (publications, "ddlDetection", lock) FROM stdin;
{_zero_metadata_0,_zero_public_0}	t	t
\.


--
-- Data for Name: versionHistory; Type: TABLE DATA; Schema: zero_0; Owner: mattpardini
--

COPY zero_0."versionHistory" ("dataVersion", "schemaVersion", "minSafeVersion", lock) FROM stdin;
10	10	1	v
\.


--
-- Data for Name: changeLog; Type: TABLE DATA; Schema: zero_0/cdc; Owner: mattpardini
--

COPY "zero_0/cdc"."changeLog" (watermark, pos, change, precommit) FROM stdin;
56cz6u0	0	{"tag":"begin","commitLsn":"00000000/16EC7158","commitTime":1764447070045862,"xid":34345,"json":"s"}	\N
56cz6u0	1	{"tag":"commit","flags":0,"commitLsn":"00000000/16EC7158","commitEndLsn":"00000000/16EC7188","commitTime":1764447070045862}	56cz6u0
56d23gw	0	{"tag":"begin","commitLsn":"00000000/16EE8310","commitTime":1764447070240856,"xid":34346,"json":"s"}	\N
56d23gw	1	{"tag":"commit","flags":0,"commitLsn":"00000000/16EE8310","commitEndLsn":"00000000/16EE8398","commitTime":1764447070240856}	56d23gw
56cxpyo	0	{"tag":"begin","commitLsn":"00000000/16EB65B0","commitTime":1764446988369829,"xid":34339,"json":"s"}	\N
56cxpyo	1	{"tag":"update","relation":{"tag":"relation","relationOid":25659,"schema":"zero","name":"permissions","replicaIdentity":"default","keyColumns":["lock"]},"key":null,"old":null,"new":{"permissions":"{\\"tables\\": {\\"task\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"user\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"vine\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"wine\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"block\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"vintage\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"vineyard\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"measurement\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"pruning_log\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"stage_history\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"task_template\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"measurement_range\\": {\\"row\\": {\\"delete\\": [], \\"insert\\": [], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [], \\"postMutation\\": []}}}}}","hash":"3dc54fc818ed762ac78d82365ac3fe97","lock":true}}	\N
56cxpyo	2	{"tag":"commit","flags":0,"commitLsn":"00000000/16EB65B0","commitEndLsn":"00000000/16EB65E0","commitTime":1764446988369829}	56cxpyo
56d28i8	0	{"tag":"begin","commitLsn":"00000000/16EE9C90","commitTime":1764447070267605,"xid":34347,"json":"s"}	\N
56d28i8	1	{"tag":"update","relation":{"tag":"relation","relationOid":25659,"schema":"zero","name":"permissions","replicaIdentity":"default","keyColumns":["lock"]},"key":null,"old":null,"new":{"permissions":"{\\"tables\\": {\\"task\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"user\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"vine\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"wine\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"block\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"vintage\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"vineyard\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"measurement\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"pruning_log\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"stage_history\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"task_template\\": {\\"row\\": {\\"delete\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"insert\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"postMutation\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]]}}}, \\"measurement_range\\": {\\"row\\": {\\"delete\\": [], \\"insert\\": [], \\"select\\": [[\\"allow\\", {\\"type\\": \\"and\\", \\"conditions\\": []}]], \\"update\\": {\\"preMutation\\": [], \\"postMutation\\": []}}}}}","hash":"3dc54fc818ed762ac78d82365ac3fe97","lock":true}}	\N
56d28i8	2	{"tag":"commit","flags":0,"commitLsn":"00000000/16EE9C90","commitEndLsn":"00000000/16EE9CC0","commitTime":1764447070267605}	56d28i8
\.


--
-- Data for Name: replicationConfig; Type: TABLE DATA; Schema: zero_0/cdc; Owner: mattpardini
--

COPY "zero_0/cdc"."replicationConfig" ("replicaVersion", publications, "resetRequired", lock) FROM stdin;
554tsug	{_zero_metadata_0,_zero_public_0}	\N	1
\.


--
-- Data for Name: replicationState; Type: TABLE DATA; Schema: zero_0/cdc; Owner: mattpardini
--

COPY "zero_0/cdc"."replicationState" ("lastWatermark", owner, "ownerAddress", lock) FROM stdin;
56d28i8	WoVdoFLAlMTBLOy9nbLXr	192.168.1.166:4849	1
\.


--
-- Data for Name: versionHistory; Type: TABLE DATA; Schema: zero_0/cdc; Owner: mattpardini
--

COPY "zero_0/cdc"."versionHistory" ("dataVersion", "schemaVersion", "minSafeVersion", lock) FROM stdin;
5	5	1	v
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: zero_0/cvr; Owner: mattpardini
--

COPY "zero_0/cvr".clients ("clientGroupID", "clientID") FROM stdin;
uk74dsudpgd94faf3n	qf3uetqe4i1ue08bcc
lananaqcj6js8htau4	r95c56punh5fb36ooa
03t8qgkk1nqfk9vv0c	aiump1ulmfnt946h1o
l8mvh560r0fbhr8lj3	0k3as0c795rcd1jvc0
31mc88jnq97se1qfd3	i3ns92ko7inlhtk0rf
um9oencbpuv57ete7t	f49oikpmnmocucjeqb
kir8njkgnkqiu0b650	3o0g3qutvgjtqh216b
hduufqspughbcleqlh	lhgiba916gr42j2o6e
j7bhrg08dkl0ut6f8e	egl20ve48hbelk85t2
5ph82kuone893qddig	snituid2946m59pin6
s7a0o435h2ri4c12g5	bcvsofqv4rvlkktnh2
fdm9fr3m544qman1r0	lgparfvps0d3d0icht
cm2q3g8j0kgtd3grm7	3fsbf3cvkni8vj20hq
nucjcspfqppevp3r6i	n5jkc8s79d579o1f7m
qnohrfdk062faauu7h	qcqnhg2f3596gmv17l
fnfm99oelq3cqe42ki	a7dtaqbjs8ts7kmghf
uspqnc772u0gl3atvk	s1crud46kgnauj669g
2jgaqgbq1bcrckcvu9	tqfvjnmkm54t5vgmut
5f9babhn73rfvnj9rd	toi1l3rkjragl4ckl8
htc76aifuod9vqouk8	30q4afgm41c6r1uudb
gb84jvct157rn24agr	h3hn5phmpjh01b2398
k8nqtfgdt1gfua17hj	bn6ib21gb5imh3s3ou
ihvkgj53a883ci6pfj	qehqdru5os9st2ff2c
f6ensgggfospg8ohnh	26c8ml3gv3nob99h2m
g3v14ttgpg24ikddc2	07tjdpr82pmdkgt5n8
hnan605eembon699el	ms8lk6k90gcu69l910
hk190gb9r62o0nurct	8hdlsa525d3aeve1t4
287ctj7acmbh2aediu	tihh0oq3jm73sblr43
amdndj578iksr3ndab	riv4miuulodnelhiu9
t6msrosengq3p4a7ce	j9igv4t3jupoournjp
o3nc60rubd8sueu3n3	b96ms5m1c4is7qlvsj
88nh1g3umqn4ia48q0	sfsktf6embntcghg0b
\.


--
-- Data for Name: desires; Type: TABLE DATA; Schema: zero_0/cvr; Owner: mattpardini
--

COPY "zero_0/cvr".desires ("clientGroupID", "clientID", "queryHash", "patchVersion", deleted, ttl, "inactivatedAt") FROM stdin;
uk74dsudpgd94faf3n	4dqmckj4i271sbi95i	3t09dyzubc9zp	562fnnc:01	t	00:05:00	1969-12-31 17:10:57.492-07
uk74dsudpgd94faf3n	4dqmckj4i271sbi95i	3unh7411ka0tz	562fnnc:01	t	00:05:00	1969-12-31 17:10:57.492-07
uk74dsudpgd94faf3n	4dqmckj4i271sbi95i	817el2k23zdp	562fnnc:01	t	00:05:00	1969-12-31 17:10:57.492-07
lananaqcj6js8htau4	800aseb65cbksl9j83	2g43j83a271g9	55s721c:12w	t	00:05:00	1969-12-31 18:14:35.409-07
lananaqcj6js8htau4	800aseb65cbksl9j83	3t09dyzubc9zp	55s721c:12w	t	00:05:00	1969-12-31 18:14:35.409-07
lananaqcj6js8htau4	800aseb65cbksl9j83	3unh7411ka0tz	55s721c:12w	t	00:05:00	1969-12-31 18:14:35.409-07
lananaqcj6js8htau4	s4d935qsc26u87h7cc	2g43j83a271g9	55s721c:11n	t	00:05:00	1969-12-31 18:10:07.722-07
lananaqcj6js8htau4	s4d935qsc26u87h7cc	3t09dyzubc9zp	55s721c:11n	t	00:05:00	1969-12-31 18:10:07.722-07
lananaqcj6js8htau4	s4d935qsc26u87h7cc	3unh7411ka0tz	55s721c:11n	t	00:05:00	1969-12-31 18:10:07.722-07
lananaqcj6js8htau4	s4d935qsc26u87h7cc	817el2k23zdp	55s721c:11n	t	00:05:00	1969-12-31 18:10:07.722-07
lananaqcj6js8htau4	800aseb65cbksl9j83	817el2k23zdp	55s721c:12w	t	00:05:00	1969-12-31 18:14:35.409-07
uk74dsudpgd94faf3n	4dqmckj4i271sbi95i	e2hz9kajle2s	562fnnc:01	t	00:05:00	1969-12-31 17:10:57.492-07
lananaqcj6js8htau4	fstj79gq7i9gnjsku5	2g43j83a271g9	55s721c:11o	t	00:05:00	1969-12-31 18:10:14.938-07
lananaqcj6js8htau4	fstj79gq7i9gnjsku5	3t09dyzubc9zp	55s721c:11o	t	00:05:00	1969-12-31 18:10:14.938-07
lananaqcj6js8htau4	fstj79gq7i9gnjsku5	3unh7411ka0tz	55s721c:11o	t	00:05:00	1969-12-31 18:10:14.938-07
lananaqcj6js8htau4	fstj79gq7i9gnjsku5	817el2k23zdp	55s721c:11o	t	00:05:00	1969-12-31 18:10:14.938-07
lananaqcj6js8htau4	papqqkd69i46dtcnsk	2g43j83a271g9	55s721c:12x	t	00:05:00	1969-12-31 18:14:58.227-07
lananaqcj6js8htau4	papqqkd69i46dtcnsk	3t09dyzubc9zp	55s721c:12x	t	00:05:00	1969-12-31 18:14:58.227-07
lananaqcj6js8htau4	papqqkd69i46dtcnsk	3unh7411ka0tz	55s721c:12x	t	00:05:00	1969-12-31 18:14:58.227-07
lananaqcj6js8htau4	f8std32801sd18ld4s	2g43j83a271g9	55s721c:11p	t	00:05:00	1969-12-31 18:10:16.009-07
lananaqcj6js8htau4	f8std32801sd18ld4s	3t09dyzubc9zp	55s721c:11p	t	00:05:00	1969-12-31 18:10:16.009-07
lananaqcj6js8htau4	f8std32801sd18ld4s	3unh7411ka0tz	55s721c:11p	t	00:05:00	1969-12-31 18:10:16.009-07
lananaqcj6js8htau4	f8std32801sd18ld4s	817el2k23zdp	55s721c:11p	t	00:05:00	1969-12-31 18:10:16.009-07
lananaqcj6js8htau4	bo0r46adboclfqk0mv	2g43j83a271g9	55s721c:11q	t	00:05:00	1969-12-31 18:10:23.625-07
lananaqcj6js8htau4	bo0r46adboclfqk0mv	3t09dyzubc9zp	55s721c:11q	t	00:05:00	1969-12-31 18:10:23.625-07
lananaqcj6js8htau4	bo0r46adboclfqk0mv	3unh7411ka0tz	55s721c:11q	t	00:05:00	1969-12-31 18:10:23.625-07
lananaqcj6js8htau4	bo0r46adboclfqk0mv	817el2k23zdp	55s721c:11q	t	00:05:00	1969-12-31 18:10:23.625-07
lananaqcj6js8htau4	2lvdurtid9p1ote19n	817el2k23zdp	55s721c:12q	t	00:05:00	1969-12-31 18:13:38.514-07
lananaqcj6js8htau4	papqqkd69i46dtcnsk	817el2k23zdp	55s721c:12x	t	00:05:00	1969-12-31 18:14:58.227-07
lananaqcj6js8htau4	ut5gs8iile36vka46q	2g43j83a271g9	55s721c:12y	t	00:05:00	1969-12-31 18:15:06.327-07
lananaqcj6js8htau4	ut5gs8iile36vka46q	3t09dyzubc9zp	55s721c:12y	t	00:05:00	1969-12-31 18:15:06.327-07
lananaqcj6js8htau4	ut5gs8iile36vka46q	3unh7411ka0tz	55s721c:12y	t	00:05:00	1969-12-31 18:15:06.327-07
lananaqcj6js8htau4	eq9cpkhikaf79uv875	817el2k23zdp	55s721c:12r	t	00:05:00	1969-12-31 18:13:54.161-07
lananaqcj6js8htau4	ut5gs8iile36vka46q	817el2k23zdp	55s721c:12y	t	00:05:00	1969-12-31 18:15:06.327-07
uspqnc772u0gl3atvk	s1crud46kgnauj669g	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	4hdccqguj9flivo2a1	2g43j83a271g9	55s721c:12s	t	00:05:00	1969-12-31 18:14:04.182-07
lananaqcj6js8htau4	4hdccqguj9flivo2a1	3t09dyzubc9zp	55s721c:12s	t	00:05:00	1969-12-31 18:14:04.182-07
lananaqcj6js8htau4	4hdccqguj9flivo2a1	3unh7411ka0tz	55s721c:12s	t	00:05:00	1969-12-31 18:14:04.182-07
lananaqcj6js8htau4	4hdccqguj9flivo2a1	817el2k23zdp	55s721c:12s	t	00:05:00	1969-12-31 18:14:04.182-07
lananaqcj6js8htau4	dhkn5rulap32bjuchj	2g43j83a271g9	55s721c:12t	t	00:05:00	1969-12-31 18:14:10.398-07
lananaqcj6js8htau4	dhkn5rulap32bjuchj	3t09dyzubc9zp	55s721c:12t	t	00:05:00	1969-12-31 18:14:10.398-07
lananaqcj6js8htau4	dhkn5rulap32bjuchj	3unh7411ka0tz	55s721c:12t	t	00:05:00	1969-12-31 18:14:10.398-07
lananaqcj6js8htau4	dhkn5rulap32bjuchj	817el2k23zdp	55s721c:12t	t	00:05:00	1969-12-31 18:14:10.398-07
lananaqcj6js8htau4	g4uatj4vr43ntbdhnk	2g43j83a271g9	55s721c:12u	t	00:05:00	1969-12-31 18:14:18.033-07
lananaqcj6js8htau4	g4uatj4vr43ntbdhnk	3t09dyzubc9zp	55s721c:12u	t	00:05:00	1969-12-31 18:14:18.033-07
lananaqcj6js8htau4	g4uatj4vr43ntbdhnk	3unh7411ka0tz	55s721c:12u	t	00:05:00	1969-12-31 18:14:18.033-07
lananaqcj6js8htau4	g4uatj4vr43ntbdhnk	817el2k23zdp	55s721c:12u	t	00:05:00	1969-12-31 18:14:18.033-07
uk74dsudpgd94faf3n	l6d2f2geskb3pdp90v	3t09dyzubc9zp	55zqif4:0b	t	00:05:00	1969-12-31 17:00:36.376-07
uk74dsudpgd94faf3n	l6d2f2geskb3pdp90v	3unh7411ka0tz	55zqif4:0b	t	00:05:00	1969-12-31 17:00:36.376-07
uk74dsudpgd94faf3n	l6d2f2geskb3pdp90v	817el2k23zdp	55zqif4:0b	t	00:05:00	1969-12-31 17:00:36.376-07
uk74dsudpgd94faf3n	2sjqhvnf5rhmvf6c0p	2g43j83a271g9	55zqif4:0f	t	00:05:00	1969-12-31 17:00:50.056-07
uk74dsudpgd94faf3n	2sjqhvnf5rhmvf6c0p	3t09dyzubc9zp	55zqif4:0f	t	00:05:00	1969-12-31 17:00:50.056-07
uk74dsudpgd94faf3n	2sjqhvnf5rhmvf6c0p	3unh7411ka0tz	55zqif4:0f	t	00:05:00	1969-12-31 17:00:50.056-07
uk74dsudpgd94faf3n	2sjqhvnf5rhmvf6c0p	817el2k23zdp	55zqif4:0f	t	00:05:00	1969-12-31 17:00:50.056-07
uk74dsudpgd94faf3n	egnojv4le0um5kscf1	3t09dyzubc9zp	55zqif4:0y	t	00:05:00	1969-12-31 17:03:38.874-07
uk74dsudpgd94faf3n	egnojv4le0um5kscf1	3unh7411ka0tz	55zqif4:0y	t	00:05:00	1969-12-31 17:03:38.874-07
uk74dsudpgd94faf3n	egnojv4le0um5kscf1	817el2k23zdp	55zqif4:0y	t	00:05:00	1969-12-31 17:03:38.874-07
uk74dsudpgd94faf3n	3qaatcffr2nf5stmp5	2g43j83a271g9	55zqif4:0z	t	00:05:00	1969-12-31 17:03:46.597-07
uk74dsudpgd94faf3n	3qaatcffr2nf5stmp5	3t09dyzubc9zp	55zqif4:0z	t	00:05:00	1969-12-31 17:03:46.597-07
uk74dsudpgd94faf3n	3qaatcffr2nf5stmp5	3unh7411ka0tz	55zqif4:0z	t	00:05:00	1969-12-31 17:03:46.597-07
uk74dsudpgd94faf3n	3qaatcffr2nf5stmp5	817el2k23zdp	55zqif4:0z	t	00:05:00	1969-12-31 17:03:46.597-07
uk74dsudpgd94faf3n	npeqf9u5i0uudt8eeb	2g43j83a271g9	55zqif4:111	t	00:05:00	1969-12-31 17:03:47.1-07
uk74dsudpgd94faf3n	npeqf9u5i0uudt8eeb	3t09dyzubc9zp	55zqif4:111	t	00:05:00	1969-12-31 17:03:47.1-07
uk74dsudpgd94faf3n	npeqf9u5i0uudt8eeb	3unh7411ka0tz	55zqif4:111	t	00:05:00	1969-12-31 17:03:47.1-07
uk74dsudpgd94faf3n	54m3rs68vas04rcqlk	2g43j83a271g9	560g6i8:01	t	00:05:00	1969-12-31 17:04:12.722-07
uk74dsudpgd94faf3n	54m3rs68vas04rcqlk	3t09dyzubc9zp	560g6i8:01	t	00:05:00	1969-12-31 17:04:12.722-07
lananaqcj6js8htau4	qtv49c935v1ojo4uo8	2g43j83a271g9	55s721c:12v	t	00:05:00	1969-12-31 18:14:34.31-07
lananaqcj6js8htau4	qtv49c935v1ojo4uo8	3t09dyzubc9zp	55s721c:12v	t	00:05:00	1969-12-31 18:14:34.31-07
lananaqcj6js8htau4	qtv49c935v1ojo4uo8	3unh7411ka0tz	55s721c:12v	t	00:05:00	1969-12-31 18:14:34.31-07
lananaqcj6js8htau4	qtv49c935v1ojo4uo8	817el2k23zdp	55s721c:12v	t	00:05:00	1969-12-31 18:14:34.31-07
88nh1g3umqn4ia48q0	vah0up1oioq283ritl	2g43j83a271g9	56auau8:0q	t	00:05:00	1969-12-31 17:15:25.825-07
lananaqcj6js8htau4	9n12pml1a7qec90k25	2g43j83a271g9	55s721c:11r	t	00:05:00	1969-12-31 18:10:24.656-07
lananaqcj6js8htau4	9n12pml1a7qec90k25	3t09dyzubc9zp	55s721c:11r	t	00:05:00	1969-12-31 18:10:24.656-07
lananaqcj6js8htau4	9n12pml1a7qec90k25	3unh7411ka0tz	55s721c:11r	t	00:05:00	1969-12-31 18:10:24.656-07
lananaqcj6js8htau4	9n12pml1a7qec90k25	817el2k23zdp	55s721c:11r	t	00:05:00	1969-12-31 18:10:24.656-07
lananaqcj6js8htau4	juft5vp23pkv1js3ka	2g43j83a271g9	55s721c:11s	t	00:05:00	1969-12-31 18:10:31.541-07
lananaqcj6js8htau4	juft5vp23pkv1js3ka	3t09dyzubc9zp	55s721c:11s	t	00:05:00	1969-12-31 18:10:31.541-07
lananaqcj6js8htau4	juft5vp23pkv1js3ka	3unh7411ka0tz	55s721c:11s	t	00:05:00	1969-12-31 18:10:31.541-07
lananaqcj6js8htau4	juft5vp23pkv1js3ka	817el2k23zdp	55s721c:11s	t	00:05:00	1969-12-31 18:10:31.541-07
lananaqcj6js8htau4	bgf4qpgoca7u3omoec	2g43j83a271g9	55s721c:12z	t	00:05:00	1969-12-31 18:15:07.457-07
lananaqcj6js8htau4	bgf4qpgoca7u3omoec	3t09dyzubc9zp	55s721c:12z	t	00:05:00	1969-12-31 18:15:07.457-07
lananaqcj6js8htau4	bgf4qpgoca7u3omoec	3unh7411ka0tz	55s721c:12z	t	00:05:00	1969-12-31 18:15:07.457-07
lananaqcj6js8htau4	bgf4qpgoca7u3omoec	817el2k23zdp	55s721c:12z	t	00:05:00	1969-12-31 18:15:07.457-07
lananaqcj6js8htau4	qcm4t619k513ou51jj	2g43j83a271g9	55s721c:11t	t	00:05:00	1969-12-31 18:10:43.284-07
lananaqcj6js8htau4	qcm4t619k513ou51jj	3t09dyzubc9zp	55s721c:11t	t	00:05:00	1969-12-31 18:10:43.284-07
lananaqcj6js8htau4	qcm4t619k513ou51jj	3unh7411ka0tz	55s721c:11t	t	00:05:00	1969-12-31 18:10:43.284-07
lananaqcj6js8htau4	qcm4t619k513ou51jj	817el2k23zdp	55s721c:11t	t	00:05:00	1969-12-31 18:10:43.284-07
lananaqcj6js8htau4	ngct00po7p4cncghh1	2g43j83a271g9	55s721c:11u	t	00:05:00	1969-12-31 18:10:45.144-07
lananaqcj6js8htau4	ngct00po7p4cncghh1	3t09dyzubc9zp	55s721c:11u	t	00:05:00	1969-12-31 18:10:45.144-07
lananaqcj6js8htau4	ngct00po7p4cncghh1	3unh7411ka0tz	55s721c:11u	t	00:05:00	1969-12-31 18:10:45.144-07
lananaqcj6js8htau4	ngct00po7p4cncghh1	817el2k23zdp	55s721c:11u	t	00:05:00	1969-12-31 18:10:45.144-07
lananaqcj6js8htau4	il6dh1jvjah3v0fv0i	2g43j83a271g9	55s721c:130	t	00:05:00	1969-12-31 18:15:23.894-07
lananaqcj6js8htau4	il6dh1jvjah3v0fv0i	3t09dyzubc9zp	55s721c:130	t	00:05:00	1969-12-31 18:15:23.894-07
lananaqcj6js8htau4	il6dh1jvjah3v0fv0i	3unh7411ka0tz	55s721c:130	t	00:05:00	1969-12-31 18:15:23.894-07
lananaqcj6js8htau4	il6dh1jvjah3v0fv0i	817el2k23zdp	55s721c:130	t	00:05:00	1969-12-31 18:15:23.894-07
lananaqcj6js8htau4	ecbg5dehg29e1o1snn	2g43j83a271g9	55s721c:11v	t	00:05:00	1969-12-31 18:10:50.471-07
lananaqcj6js8htau4	ecbg5dehg29e1o1snn	3t09dyzubc9zp	55s721c:11v	t	00:05:00	1969-12-31 18:10:50.471-07
lananaqcj6js8htau4	ecbg5dehg29e1o1snn	3unh7411ka0tz	55s721c:11v	t	00:05:00	1969-12-31 18:10:50.471-07
lananaqcj6js8htau4	ecbg5dehg29e1o1snn	817el2k23zdp	55s721c:11v	t	00:05:00	1969-12-31 18:10:50.471-07
lananaqcj6js8htau4	p97hqce9htq4ni4phe	2g43j83a271g9	55s721c:11w	t	00:05:00	1969-12-31 18:10:50.574-07
lananaqcj6js8htau4	p97hqce9htq4ni4phe	3t09dyzubc9zp	55s721c:11w	t	00:05:00	1969-12-31 18:10:50.574-07
lananaqcj6js8htau4	p97hqce9htq4ni4phe	3unh7411ka0tz	55s721c:11w	t	00:05:00	1969-12-31 18:10:50.574-07
lananaqcj6js8htau4	p97hqce9htq4ni4phe	817el2k23zdp	55s721c:11w	t	00:05:00	1969-12-31 18:10:50.574-07
lananaqcj6js8htau4	fosk7m9abgat2pkk91	2g43j83a271g9	55s721c:11x	t	00:05:00	1969-12-31 18:10:55.953-07
lananaqcj6js8htau4	fosk7m9abgat2pkk91	3t09dyzubc9zp	55s721c:11x	t	00:05:00	1969-12-31 18:10:55.953-07
lananaqcj6js8htau4	fosk7m9abgat2pkk91	3unh7411ka0tz	55s721c:11x	t	00:05:00	1969-12-31 18:10:55.953-07
lananaqcj6js8htau4	fosk7m9abgat2pkk91	817el2k23zdp	55s721c:11x	t	00:05:00	1969-12-31 18:10:55.953-07
lananaqcj6js8htau4	b9qr6bj2icg7r7vpjk	2g43j83a271g9	55s721c:131	t	00:05:00	1969-12-31 18:15:24.904-07
lananaqcj6js8htau4	b9qr6bj2icg7r7vpjk	3t09dyzubc9zp	55s721c:131	t	00:05:00	1969-12-31 18:15:24.904-07
lananaqcj6js8htau4	b9qr6bj2icg7r7vpjk	3unh7411ka0tz	55s721c:131	t	00:05:00	1969-12-31 18:15:24.904-07
lananaqcj6js8htau4	b9qr6bj2icg7r7vpjk	817el2k23zdp	55s721c:131	t	00:05:00	1969-12-31 18:15:24.904-07
lananaqcj6js8htau4	nj06853giibdqfucq7	2g43j83a271g9	55s721c:132	t	00:05:00	1969-12-31 18:15:31.575-07
lananaqcj6js8htau4	nj06853giibdqfucq7	3t09dyzubc9zp	55s721c:132	t	00:05:00	1969-12-31 18:15:31.575-07
lananaqcj6js8htau4	nj06853giibdqfucq7	3unh7411ka0tz	55s721c:132	t	00:05:00	1969-12-31 18:15:31.575-07
lananaqcj6js8htau4	nj06853giibdqfucq7	817el2k23zdp	55s721c:132	t	00:05:00	1969-12-31 18:15:31.575-07
lananaqcj6js8htau4	5sm89vaq6q35sacfga	2g43j83a271g9	55s721c:133	t	00:05:00	1969-12-31 18:15:39.153-07
lananaqcj6js8htau4	5sm89vaq6q35sacfga	3t09dyzubc9zp	55s721c:133	t	00:05:00	1969-12-31 18:15:39.153-07
lananaqcj6js8htau4	5sm89vaq6q35sacfga	3unh7411ka0tz	55s721c:133	t	00:05:00	1969-12-31 18:15:39.153-07
lananaqcj6js8htau4	5sm89vaq6q35sacfga	817el2k23zdp	55s721c:133	t	00:05:00	1969-12-31 18:15:39.153-07
lananaqcj6js8htau4	tqobfmt77oeiu89d0a	2g43j83a271g9	55s721c:134	t	00:05:00	1969-12-31 18:15:46.867-07
lananaqcj6js8htau4	tqobfmt77oeiu89d0a	3t09dyzubc9zp	55s721c:134	t	00:05:00	1969-12-31 18:15:46.867-07
lananaqcj6js8htau4	tqobfmt77oeiu89d0a	3unh7411ka0tz	55s721c:134	t	00:05:00	1969-12-31 18:15:46.867-07
lananaqcj6js8htau4	tqobfmt77oeiu89d0a	817el2k23zdp	55s721c:134	t	00:05:00	1969-12-31 18:15:46.867-07
lananaqcj6js8htau4	18atpftefa3g20iq45	2g43j83a271g9	55s721c:135	t	00:05:00	1969-12-31 18:15:54.738-07
lananaqcj6js8htau4	18atpftefa3g20iq45	3t09dyzubc9zp	55s721c:135	t	00:05:00	1969-12-31 18:15:54.738-07
lananaqcj6js8htau4	e6gdo5skf052jvomb8	2g43j83a271g9	55s721c:136	t	00:05:00	1969-12-31 18:16:05.343-07
lananaqcj6js8htau4	e6gdo5skf052jvomb8	3t09dyzubc9zp	55s721c:136	t	00:05:00	1969-12-31 18:16:05.343-07
lananaqcj6js8htau4	e6gdo5skf052jvomb8	3unh7411ka0tz	55s721c:136	t	00:05:00	1969-12-31 18:16:05.343-07
lananaqcj6js8htau4	e6gdo5skf052jvomb8	817el2k23zdp	55s721c:136	t	00:05:00	1969-12-31 18:16:05.343-07
lananaqcj6js8htau4	18atpftefa3g20iq45	3unh7411ka0tz	55s721c:135	t	00:05:00	1969-12-31 18:15:54.738-07
lananaqcj6js8htau4	18atpftefa3g20iq45	817el2k23zdp	55s721c:135	t	00:05:00	1969-12-31 18:15:54.738-07
uk74dsudpgd94faf3n	2svpnpeh67qcdvrhe1	2g43j83a271g9	5621vg8:01	t	00:05:00	1969-12-31 17:09:35.524-07
lananaqcj6js8htau4	rlfafkglj43nfls4go	2g43j83a271g9	55s721c:11y	t	00:05:00	1969-12-31 18:11:03.135-07
lananaqcj6js8htau4	rlfafkglj43nfls4go	3t09dyzubc9zp	55s721c:11y	t	00:05:00	1969-12-31 18:11:03.135-07
lananaqcj6js8htau4	rlfafkglj43nfls4go	3unh7411ka0tz	55s721c:11y	t	00:05:00	1969-12-31 18:11:03.135-07
lananaqcj6js8htau4	rlfafkglj43nfls4go	817el2k23zdp	55s721c:11y	t	00:05:00	1969-12-31 18:11:03.135-07
uk74dsudpgd94faf3n	2svpnpeh67qcdvrhe1	3t09dyzubc9zp	5621vg8:01	t	00:05:00	1969-12-31 17:09:35.524-07
uk74dsudpgd94faf3n	2svpnpeh67qcdvrhe1	3unh7411ka0tz	5621vg8:01	t	00:05:00	1969-12-31 17:09:35.524-07
uk74dsudpgd94faf3n	2svpnpeh67qcdvrhe1	817el2k23zdp	5621vg8:01	t	00:05:00	1969-12-31 17:09:35.524-07
uk74dsudpgd94faf3n	2svpnpeh67qcdvrhe1	e2hz9kajle2s	5621vg8:01	t	00:05:00	1969-12-31 17:09:35.524-07
uk74dsudpgd94faf3n	c0qm4smg5n5lvdru8n	e2hz9kajle2s	5621vg8:03	t	00:05:00	1969-12-31 17:09:36.245-07
88nh1g3umqn4ia48q0	vah0up1oioq283ritl	3t09dyzubc9zp	56auau8:0q	t	00:05:00	1969-12-31 17:15:25.825-07
lananaqcj6js8htau4	68td0v25tgmpgcop1p	2g43j83a271g9	55s721c:137	t	00:05:00	1969-12-31 18:16:17.103-07
lananaqcj6js8htau4	68td0v25tgmpgcop1p	3t09dyzubc9zp	55s721c:137	t	00:05:00	1969-12-31 18:16:17.103-07
lananaqcj6js8htau4	68td0v25tgmpgcop1p	3unh7411ka0tz	55s721c:137	t	00:05:00	1969-12-31 18:16:17.103-07
lananaqcj6js8htau4	68td0v25tgmpgcop1p	817el2k23zdp	55s721c:137	t	00:05:00	1969-12-31 18:16:17.103-07
88nh1g3umqn4ia48q0	vah0up1oioq283ritl	3unh7411ka0tz	56auau8:0q	t	00:05:00	1969-12-31 17:15:25.825-07
88nh1g3umqn4ia48q0	qiplkmnpd1odl62l6t	2g43j83a271g9	56auau8:0s	t	00:05:00	1969-12-31 17:15:40.135-07
uk74dsudpgd94faf3n	m0ith7o50vesf3vbfp	2blc6xwom46ss	563o7s8:12u	t	00:05:00	1969-12-31 17:29:02.726-07
lananaqcj6js8htau4	k959kp8d0ska4so6du	2g43j83a271g9	55s721c:138	t	00:05:00	1969-12-31 18:16:25.928-07
lananaqcj6js8htau4	k959kp8d0ska4so6du	3t09dyzubc9zp	55s721c:138	t	00:05:00	1969-12-31 18:16:25.928-07
lananaqcj6js8htau4	k959kp8d0ska4so6du	3unh7411ka0tz	55s721c:138	t	00:05:00	1969-12-31 18:16:25.928-07
lananaqcj6js8htau4	k959kp8d0ska4so6du	817el2k23zdp	55s721c:138	t	00:05:00	1969-12-31 18:16:25.928-07
uk74dsudpgd94faf3n	2227b7tv21u164e6ot	3t09dyzubc9zp	5621vg8:07	t	00:05:00	1969-12-31 17:09:45.357-07
uk74dsudpgd94faf3n	2227b7tv21u164e6ot	3unh7411ka0tz	5621vg8:07	t	00:05:00	1969-12-31 17:09:45.357-07
uk74dsudpgd94faf3n	i7vl4hk4m72ibv2pum	2g43j83a271g9	5621vg8:09	t	00:05:00	1969-12-31 17:09:52.768-07
lananaqcj6js8htau4	1t1gv95ja5qp2jg2vn	2g43j83a271g9	55s721c:139	t	00:05:00	1969-12-31 18:16:27.053-07
lananaqcj6js8htau4	1t1gv95ja5qp2jg2vn	3t09dyzubc9zp	55s721c:139	t	00:05:00	1969-12-31 18:16:27.053-07
lananaqcj6js8htau4	1t1gv95ja5qp2jg2vn	3unh7411ka0tz	55s721c:139	t	00:05:00	1969-12-31 18:16:27.053-07
lananaqcj6js8htau4	1t1gv95ja5qp2jg2vn	817el2k23zdp	55s721c:139	t	00:05:00	1969-12-31 18:16:27.053-07
lananaqcj6js8htau4	ddjep4kq4mk6hdpve9	2g43j83a271g9	55s721c:13a	t	00:05:00	1969-12-31 18:16:50.92-07
lananaqcj6js8htau4	ddjep4kq4mk6hdpve9	3t09dyzubc9zp	55s721c:13a	t	00:05:00	1969-12-31 18:16:50.92-07
lananaqcj6js8htau4	ddjep4kq4mk6hdpve9	3unh7411ka0tz	55s721c:13a	t	00:05:00	1969-12-31 18:16:50.92-07
lananaqcj6js8htau4	ddjep4kq4mk6hdpve9	817el2k23zdp	55s721c:13a	t	00:05:00	1969-12-31 18:16:50.92-07
2jgaqgbq1bcrckcvu9	tqfvjnmkm54t5vgmut	2g43j83a271g9	00:01	f	00:05:00	\N
uk74dsudpgd94faf3n	l6d2f2geskb3pdp90v	gt8yfqbqc7ca	55zqif4:0a	t	00:05:00	1969-12-31 17:00:23.63-07
uk74dsudpgd94faf3n	l6d2f2geskb3pdp90v	3rnpsi5qegpt3	55zqif4:0a	t	00:05:00	1969-12-31 17:00:23.63-07
uk74dsudpgd94faf3n	okrfh00hnk2ef5v7i9	2g43j83a271g9	55zqif4:0d	t	00:05:00	1969-12-31 17:00:43.695-07
uk74dsudpgd94faf3n	okrfh00hnk2ef5v7i9	3t09dyzubc9zp	55zqif4:0d	t	00:05:00	1969-12-31 17:00:43.695-07
uk74dsudpgd94faf3n	okrfh00hnk2ef5v7i9	3unh7411ka0tz	55zqif4:0d	t	00:05:00	1969-12-31 17:00:43.695-07
uk74dsudpgd94faf3n	okrfh00hnk2ef5v7i9	817el2k23zdp	55zqif4:0d	t	00:05:00	1969-12-31 17:00:43.695-07
uk74dsudpgd94faf3n	npeqf9u5i0uudt8eeb	817el2k23zdp	55zqif4:111	t	00:05:00	1969-12-31 17:03:47.1-07
uk74dsudpgd94faf3n	npeqf9u5i0uudt8eeb	e2hz9kajle2s	55zqif4:111	t	00:05:00	1969-12-31 17:03:47.1-07
uk74dsudpgd94faf3n	54m3rs68vas04rcqlk	3unh7411ka0tz	560g6i8:01	t	00:05:00	1969-12-31 17:04:12.722-07
uk74dsudpgd94faf3n	54m3rs68vas04rcqlk	817el2k23zdp	560g6i8:01	t	00:05:00	1969-12-31 17:04:12.722-07
uk74dsudpgd94faf3n	54m3rs68vas04rcqlk	e2hz9kajle2s	560g6i8:01	t	00:05:00	1969-12-31 17:04:12.722-07
uk74dsudpgd94faf3n	f0hjjppmk4879lddns	2g43j83a271g9	560iits:01	t	00:05:00	1969-12-31 17:04:56.99-07
uk74dsudpgd94faf3n	f0hjjppmk4879lddns	3t09dyzubc9zp	560iits:01	t	00:05:00	1969-12-31 17:04:56.99-07
uk74dsudpgd94faf3n	f0hjjppmk4879lddns	3unh7411ka0tz	560iits:01	t	00:05:00	1969-12-31 17:04:56.99-07
uk74dsudpgd94faf3n	f0hjjppmk4879lddns	817el2k23zdp	560iits:01	t	00:05:00	1969-12-31 17:04:56.99-07
uk74dsudpgd94faf3n	f0hjjppmk4879lddns	e2hz9kajle2s	560iits:01	t	00:05:00	1969-12-31 17:04:56.99-07
uk74dsudpgd94faf3n	50tp2loou2c8kcou77	2g43j83a271g9	560jlo0:0b	t	00:05:00	1969-12-31 17:05:32.037-07
uk74dsudpgd94faf3n	50tp2loou2c8kcou77	3t09dyzubc9zp	560jlo0:0b	t	00:05:00	1969-12-31 17:05:32.037-07
uk74dsudpgd94faf3n	50tp2loou2c8kcou77	3unh7411ka0tz	560jlo0:0b	t	00:05:00	1969-12-31 17:05:32.037-07
uk74dsudpgd94faf3n	50tp2loou2c8kcou77	817el2k23zdp	560jlo0:0b	t	00:05:00	1969-12-31 17:05:32.037-07
uk74dsudpgd94faf3n	50tp2loou2c8kcou77	e2hz9kajle2s	560jlo0:0b	t	00:05:00	1969-12-31 17:05:32.037-07
uk74dsudpgd94faf3n	e31nff1ha84iufdjj3	2g43j83a271g9	5615vzc:03	t	00:05:00	1969-12-31 17:07:09.863-07
uk74dsudpgd94faf3n	e31nff1ha84iufdjj3	3t09dyzubc9zp	5615vzc:03	t	00:05:00	1969-12-31 17:07:09.863-07
uk74dsudpgd94faf3n	e31nff1ha84iufdjj3	3unh7411ka0tz	5615vzc:03	t	00:05:00	1969-12-31 17:07:09.863-07
uk74dsudpgd94faf3n	e31nff1ha84iufdjj3	817el2k23zdp	5615vzc:03	t	00:05:00	1969-12-31 17:07:09.863-07
uk74dsudpgd94faf3n	e31nff1ha84iufdjj3	e2hz9kajle2s	5615vzc:03	t	00:05:00	1969-12-31 17:07:09.863-07
uk74dsudpgd94faf3n	4966gqdvsogft8umig	2g43j83a271g9	561nv60:01	t	00:05:00	1969-12-31 17:08:17.957-07
uk74dsudpgd94faf3n	9ji249tn3ngj977a2a	2g43j83a271g9	561nv60:05	t	00:05:00	1969-12-31 17:08:19.155-07
uk74dsudpgd94faf3n	403saa8etb431r81b5	e2hz9kajle2s	561nv60:0h	t	00:05:00	1969-12-31 17:08:25.398-07
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	m2ssjaqatowg	561nv60:0z	f	00:05:00	\N
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	1tgahbk62pc9s	561nv60:115	f	00:05:00	\N
uk74dsudpgd94faf3n	m0ith7o50vesf3vbfp	2g43j83a271g9	563o7s8:12u	t	00:05:00	1969-12-31 17:29:02.726-07
uk74dsudpgd94faf3n	m0ith7o50vesf3vbfp	3se2qu476j7tg	563o7s8:12u	t	00:05:00	1969-12-31 17:29:02.726-07
uk74dsudpgd94faf3n	m0ith7o50vesf3vbfp	caqm13mxzbdr	563o7s8:12u	t	00:05:00	1969-12-31 17:29:02.726-07
uk74dsudpgd94faf3n	2227b7tv21u164e6ot	2g43j83a271g9	5621vg8:07	t	00:05:00	1969-12-31 17:09:45.357-07
lananaqcj6js8htau4	gi8s6esicnguo2ape8	2g43j83a271g9	55s721c:13b	t	00:05:00	1969-12-31 18:16:56.889-07
lananaqcj6js8htau4	gi8s6esicnguo2ape8	3t09dyzubc9zp	55s721c:13b	t	00:05:00	1969-12-31 18:16:56.889-07
lananaqcj6js8htau4	ilkvfvvv5joccjukr9	2g43j83a271g9	55s721c:11z	t	00:05:00	1969-12-31 18:11:10.207-07
lananaqcj6js8htau4	ilkvfvvv5joccjukr9	3t09dyzubc9zp	55s721c:11z	t	00:05:00	1969-12-31 18:11:10.207-07
lananaqcj6js8htau4	ilkvfvvv5joccjukr9	3unh7411ka0tz	55s721c:11z	t	00:05:00	1969-12-31 18:11:10.207-07
lananaqcj6js8htau4	ilkvfvvv5joccjukr9	817el2k23zdp	55s721c:11z	t	00:05:00	1969-12-31 18:11:10.207-07
lananaqcj6js8htau4	gi8s6esicnguo2ape8	3unh7411ka0tz	55s721c:13b	t	00:05:00	1969-12-31 18:16:56.889-07
lananaqcj6js8htau4	gi8s6esicnguo2ape8	817el2k23zdp	55s721c:13b	t	00:05:00	1969-12-31 18:16:56.889-07
lananaqcj6js8htau4	5nrifc2gldsg0o0dcg	2g43j83a271g9	55s721c:120	t	00:05:00	1969-12-31 18:11:11.274-07
lananaqcj6js8htau4	5nrifc2gldsg0o0dcg	3t09dyzubc9zp	55s721c:120	t	00:05:00	1969-12-31 18:11:11.274-07
lananaqcj6js8htau4	5nrifc2gldsg0o0dcg	3unh7411ka0tz	55s721c:120	t	00:05:00	1969-12-31 18:11:11.274-07
lananaqcj6js8htau4	5nrifc2gldsg0o0dcg	817el2k23zdp	55s721c:120	t	00:05:00	1969-12-31 18:11:11.274-07
lananaqcj6js8htau4	ne08al6p1t38dklq05	2g43j83a271g9	55s721c:13c	t	00:05:00	1969-12-31 18:16:56.916-07
lananaqcj6js8htau4	ne08al6p1t38dklq05	3t09dyzubc9zp	55s721c:13c	t	00:05:00	1969-12-31 18:16:56.916-07
lananaqcj6js8htau4	l0cb9rbi3dup30qmf2	2g43j83a271g9	55s721c:121	t	00:05:00	1969-12-31 18:11:18.756-07
lananaqcj6js8htau4	l0cb9rbi3dup30qmf2	3t09dyzubc9zp	55s721c:121	t	00:05:00	1969-12-31 18:11:18.756-07
lananaqcj6js8htau4	l0cb9rbi3dup30qmf2	3unh7411ka0tz	55s721c:121	t	00:05:00	1969-12-31 18:11:18.756-07
lananaqcj6js8htau4	l0cb9rbi3dup30qmf2	817el2k23zdp	55s721c:121	t	00:05:00	1969-12-31 18:11:18.756-07
lananaqcj6js8htau4	ne08al6p1t38dklq05	3unh7411ka0tz	55s721c:13c	t	00:05:00	1969-12-31 18:16:56.916-07
lananaqcj6js8htau4	ne08al6p1t38dklq05	817el2k23zdp	55s721c:13c	t	00:05:00	1969-12-31 18:16:56.916-07
lananaqcj6js8htau4	4mvmj7qtb9vsk1i11r	2g43j83a271g9	55s721c:13d	t	00:05:00	1969-12-31 18:17:06.453-07
lananaqcj6js8htau4	4mvmj7qtb9vsk1i11r	3t09dyzubc9zp	55s721c:13d	t	00:05:00	1969-12-31 18:17:06.453-07
lananaqcj6js8htau4	s72qppbjp43tcscboe	2g43j83a271g9	55s721c:122	t	00:05:00	1969-12-31 18:11:19.807-07
lananaqcj6js8htau4	s72qppbjp43tcscboe	3t09dyzubc9zp	55s721c:122	t	00:05:00	1969-12-31 18:11:19.807-07
lananaqcj6js8htau4	s72qppbjp43tcscboe	3unh7411ka0tz	55s721c:122	t	00:05:00	1969-12-31 18:11:19.807-07
lananaqcj6js8htau4	s72qppbjp43tcscboe	817el2k23zdp	55s721c:122	t	00:05:00	1969-12-31 18:11:19.807-07
lananaqcj6js8htau4	4mvmj7qtb9vsk1i11r	3unh7411ka0tz	55s721c:13d	t	00:05:00	1969-12-31 18:17:06.453-07
lananaqcj6js8htau4	4mvmj7qtb9vsk1i11r	817el2k23zdp	55s721c:13d	t	00:05:00	1969-12-31 18:17:06.453-07
5f9babhn73rfvnj9rd	toi1l3rkjragl4ckl8	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	e4kddttff6fasan0ve	2g43j83a271g9	55s721c:123	t	00:05:00	1969-12-31 18:11:25.787-07
lananaqcj6js8htau4	e4kddttff6fasan0ve	3t09dyzubc9zp	55s721c:123	t	00:05:00	1969-12-31 18:11:25.787-07
lananaqcj6js8htau4	e4kddttff6fasan0ve	3unh7411ka0tz	55s721c:123	t	00:05:00	1969-12-31 18:11:25.787-07
lananaqcj6js8htau4	e4kddttff6fasan0ve	817el2k23zdp	55s721c:123	t	00:05:00	1969-12-31 18:11:25.787-07
uk74dsudpgd94faf3n	7jsl1qp6q8n5tlh8nt	2g43j83a271g9	55zqif4:0c	t	00:05:00	1969-12-31 17:00:37.113-07
lananaqcj6js8htau4	esbjvpsrskbiqi85g4	2g43j83a271g9	55s721c:124	t	00:05:00	1969-12-31 18:11:25.873-07
lananaqcj6js8htau4	esbjvpsrskbiqi85g4	3t09dyzubc9zp	55s721c:124	t	00:05:00	1969-12-31 18:11:25.873-07
lananaqcj6js8htau4	esbjvpsrskbiqi85g4	3unh7411ka0tz	55s721c:124	t	00:05:00	1969-12-31 18:11:25.873-07
lananaqcj6js8htau4	esbjvpsrskbiqi85g4	817el2k23zdp	55s721c:124	t	00:05:00	1969-12-31 18:11:25.873-07
lananaqcj6js8htau4	pdk4q2lp5a8i30fqsv	2g43j83a271g9	55s721c:125	t	00:05:00	1969-12-31 18:11:33.081-07
lananaqcj6js8htau4	pdk4q2lp5a8i30fqsv	3t09dyzubc9zp	55s721c:125	t	00:05:00	1969-12-31 18:11:33.081-07
lananaqcj6js8htau4	pdk4q2lp5a8i30fqsv	3unh7411ka0tz	55s721c:125	t	00:05:00	1969-12-31 18:11:33.081-07
lananaqcj6js8htau4	pdk4q2lp5a8i30fqsv	817el2k23zdp	55s721c:125	t	00:05:00	1969-12-31 18:11:33.081-07
uk74dsudpgd94faf3n	7jsl1qp6q8n5tlh8nt	3t09dyzubc9zp	55zqif4:0c	t	00:05:00	1969-12-31 17:00:37.113-07
uk74dsudpgd94faf3n	7jsl1qp6q8n5tlh8nt	3unh7411ka0tz	55zqif4:0c	t	00:05:00	1969-12-31 17:00:37.113-07
uk74dsudpgd94faf3n	7jsl1qp6q8n5tlh8nt	817el2k23zdp	55zqif4:0c	t	00:05:00	1969-12-31 17:00:37.113-07
uk74dsudpgd94faf3n	qft33v39nrpkaa9k5s	2g43j83a271g9	55zqif4:0o	t	00:05:00	1969-12-31 17:01:20.175-07
uk74dsudpgd94faf3n	mplte6csr9f2kj3s4u	2g43j83a271g9	560iits:03	t	00:05:00	1969-12-31 17:04:58.411-07
uk74dsudpgd94faf3n	mplte6csr9f2kj3s4u	3t09dyzubc9zp	560iits:03	t	00:05:00	1969-12-31 17:04:58.411-07
uk74dsudpgd94faf3n	mplte6csr9f2kj3s4u	3unh7411ka0tz	560iits:03	t	00:05:00	1969-12-31 17:04:58.411-07
uk74dsudpgd94faf3n	mplte6csr9f2kj3s4u	817el2k23zdp	560iits:03	t	00:05:00	1969-12-31 17:04:58.411-07
uk74dsudpgd94faf3n	mplte6csr9f2kj3s4u	e2hz9kajle2s	560iits:03	t	00:05:00	1969-12-31 17:04:58.411-07
uk74dsudpgd94faf3n	mimq96bbomdq325vbq	2g43j83a271g9	560jlo0:01	t	00:05:00	1969-12-31 17:05:03.605-07
uk74dsudpgd94faf3n	mimq96bbomdq325vbq	3t09dyzubc9zp	560jlo0:01	t	00:05:00	1969-12-31 17:05:03.605-07
uk74dsudpgd94faf3n	mimq96bbomdq325vbq	3unh7411ka0tz	560jlo0:01	t	00:05:00	1969-12-31 17:05:03.605-07
uk74dsudpgd94faf3n	mimq96bbomdq325vbq	817el2k23zdp	560jlo0:01	t	00:05:00	1969-12-31 17:05:03.605-07
uk74dsudpgd94faf3n	mimq96bbomdq325vbq	e2hz9kajle2s	560jlo0:01	t	00:05:00	1969-12-31 17:05:03.605-07
uk74dsudpgd94faf3n	3ufis2kunif8q22r9c	2g43j83a271g9	560jlo0:03	t	00:05:00	1969-12-31 17:05:12.541-07
uk74dsudpgd94faf3n	3ufis2kunif8q22r9c	3t09dyzubc9zp	560jlo0:03	t	00:05:00	1969-12-31 17:05:12.541-07
uk74dsudpgd94faf3n	rhf78rh2i5frgqrv5b	2g43j83a271g9	560jlo0:05	t	00:05:00	1969-12-31 17:05:12.818-07
uk74dsudpgd94faf3n	rhf78rh2i5frgqrv5b	3t09dyzubc9zp	560jlo0:05	t	00:05:00	1969-12-31 17:05:12.818-07
uk74dsudpgd94faf3n	rhf78rh2i5frgqrv5b	3unh7411ka0tz	560jlo0:05	t	00:05:00	1969-12-31 17:05:12.818-07
uk74dsudpgd94faf3n	rhf78rh2i5frgqrv5b	817el2k23zdp	560jlo0:05	t	00:05:00	1969-12-31 17:05:12.818-07
uk74dsudpgd94faf3n	c0qm4smg5n5lvdru8n	2g43j83a271g9	5621vg8:03	t	00:05:00	1969-12-31 17:09:36.245-07
uk74dsudpgd94faf3n	c0qm4smg5n5lvdru8n	3t09dyzubc9zp	5621vg8:03	t	00:05:00	1969-12-31 17:09:36.245-07
uk74dsudpgd94faf3n	c0qm4smg5n5lvdru8n	3unh7411ka0tz	5621vg8:03	t	00:05:00	1969-12-31 17:09:36.245-07
uk74dsudpgd94faf3n	c0qm4smg5n5lvdru8n	817el2k23zdp	5621vg8:03	t	00:05:00	1969-12-31 17:09:36.245-07
lananaqcj6js8htau4	9morsjudrmvbmcuecs	2g43j83a271g9	55s721c:126	t	00:05:00	1969-12-31 18:11:42.479-07
lananaqcj6js8htau4	qd7t2sn5vjt60ajdgg	2g43j83a271g9	55s721c:13e	t	00:05:00	1969-12-31 18:17:16.216-07
lananaqcj6js8htau4	9morsjudrmvbmcuecs	3t09dyzubc9zp	55s721c:126	t	00:05:00	1969-12-31 18:11:42.479-07
lananaqcj6js8htau4	9morsjudrmvbmcuecs	3unh7411ka0tz	55s721c:126	t	00:05:00	1969-12-31 18:11:42.479-07
lananaqcj6js8htau4	9morsjudrmvbmcuecs	817el2k23zdp	55s721c:126	t	00:05:00	1969-12-31 18:11:42.479-07
lananaqcj6js8htau4	qd7t2sn5vjt60ajdgg	3t09dyzubc9zp	55s721c:13e	t	00:05:00	1969-12-31 18:17:16.216-07
lananaqcj6js8htau4	qd7t2sn5vjt60ajdgg	3unh7411ka0tz	55s721c:13e	t	00:05:00	1969-12-31 18:17:16.216-07
lananaqcj6js8htau4	qd7t2sn5vjt60ajdgg	817el2k23zdp	55s721c:13e	t	00:05:00	1969-12-31 18:17:16.216-07
lananaqcj6js8htau4	823utiq7q43f1257cb	2g43j83a271g9	55s721c:127	t	00:05:00	1969-12-31 18:11:43.563-07
lananaqcj6js8htau4	823utiq7q43f1257cb	3t09dyzubc9zp	55s721c:127	t	00:05:00	1969-12-31 18:11:43.563-07
lananaqcj6js8htau4	823utiq7q43f1257cb	3unh7411ka0tz	55s721c:127	t	00:05:00	1969-12-31 18:11:43.563-07
lananaqcj6js8htau4	823utiq7q43f1257cb	817el2k23zdp	55s721c:127	t	00:05:00	1969-12-31 18:11:43.563-07
lananaqcj6js8htau4	4nb0ps7ov2l5aetj4u	2g43j83a271g9	55s721c:13f	t	00:05:00	1969-12-31 18:17:23.644-07
lananaqcj6js8htau4	4nb0ps7ov2l5aetj4u	3t09dyzubc9zp	55s721c:13f	t	00:05:00	1969-12-31 18:17:23.644-07
lananaqcj6js8htau4	4nb0ps7ov2l5aetj4u	3unh7411ka0tz	55s721c:13f	t	00:05:00	1969-12-31 18:17:23.644-07
lananaqcj6js8htau4	2l3cpjre22j372b356	2g43j83a271g9	55s721c:128	t	00:05:00	1969-12-31 18:11:50.767-07
lananaqcj6js8htau4	2l3cpjre22j372b356	3t09dyzubc9zp	55s721c:128	t	00:05:00	1969-12-31 18:11:50.767-07
lananaqcj6js8htau4	2l3cpjre22j372b356	3unh7411ka0tz	55s721c:128	t	00:05:00	1969-12-31 18:11:50.767-07
lananaqcj6js8htau4	2l3cpjre22j372b356	817el2k23zdp	55s721c:128	t	00:05:00	1969-12-31 18:11:50.767-07
lananaqcj6js8htau4	4nb0ps7ov2l5aetj4u	817el2k23zdp	55s721c:13f	t	00:05:00	1969-12-31 18:17:23.644-07
lananaqcj6js8htau4	upv8a5te4sv7vb09oe	2g43j83a271g9	55s721c:129	t	00:05:00	1969-12-31 18:11:50.816-07
lananaqcj6js8htau4	upv8a5te4sv7vb09oe	3t09dyzubc9zp	55s721c:129	t	00:05:00	1969-12-31 18:11:50.816-07
lananaqcj6js8htau4	upv8a5te4sv7vb09oe	3unh7411ka0tz	55s721c:129	t	00:05:00	1969-12-31 18:11:50.816-07
lananaqcj6js8htau4	upv8a5te4sv7vb09oe	817el2k23zdp	55s721c:129	t	00:05:00	1969-12-31 18:11:50.816-07
lananaqcj6js8htau4	9mr1un1q97c53kcgck	2g43j83a271g9	55s721c:13g	t	00:05:00	1969-12-31 18:17:25.714-07
lananaqcj6js8htau4	9mr1un1q97c53kcgck	3t09dyzubc9zp	55s721c:13g	t	00:05:00	1969-12-31 18:17:25.714-07
lananaqcj6js8htau4	9mr1un1q97c53kcgck	3unh7411ka0tz	55s721c:13g	t	00:05:00	1969-12-31 18:17:25.714-07
lananaqcj6js8htau4	fe41eormeu09pji7kt	2g43j83a271g9	55s721c:12a	t	00:05:00	1969-12-31 18:11:59.321-07
lananaqcj6js8htau4	fe41eormeu09pji7kt	3t09dyzubc9zp	55s721c:12a	t	00:05:00	1969-12-31 18:11:59.321-07
lananaqcj6js8htau4	fe41eormeu09pji7kt	3unh7411ka0tz	55s721c:12a	t	00:05:00	1969-12-31 18:11:59.321-07
lananaqcj6js8htau4	fe41eormeu09pji7kt	817el2k23zdp	55s721c:12a	t	00:05:00	1969-12-31 18:11:59.321-07
lananaqcj6js8htau4	9mr1un1q97c53kcgck	817el2k23zdp	55s721c:13g	t	00:05:00	1969-12-31 18:17:25.714-07
lananaqcj6js8htau4	ftnm7pe03p9ju40qpk	2g43j83a271g9	55s721c:12b	t	00:05:00	1969-12-31 18:12:07.214-07
lananaqcj6js8htau4	ftnm7pe03p9ju40qpk	3t09dyzubc9zp	55s721c:12b	t	00:05:00	1969-12-31 18:12:07.214-07
lananaqcj6js8htau4	ftnm7pe03p9ju40qpk	3unh7411ka0tz	55s721c:12b	t	00:05:00	1969-12-31 18:12:07.214-07
lananaqcj6js8htau4	ftnm7pe03p9ju40qpk	817el2k23zdp	55s721c:12b	t	00:05:00	1969-12-31 18:12:07.214-07
lananaqcj6js8htau4	5d346heanrode9c8ot	2g43j83a271g9	55s721c:12c	t	00:05:00	1969-12-31 18:12:16.669-07
lananaqcj6js8htau4	5d346heanrode9c8ot	3t09dyzubc9zp	55s721c:12c	t	00:05:00	1969-12-31 18:12:16.669-07
lananaqcj6js8htau4	5d346heanrode9c8ot	3unh7411ka0tz	55s721c:12c	t	00:05:00	1969-12-31 18:12:16.669-07
lananaqcj6js8htau4	5d346heanrode9c8ot	817el2k23zdp	55s721c:12c	t	00:05:00	1969-12-31 18:12:16.669-07
lananaqcj6js8htau4	hp6bm0lnbaabng7sve	2g43j83a271g9	55s721c:13h	t	00:05:00	1969-12-31 18:17:25.814-07
lananaqcj6js8htau4	hp6bm0lnbaabng7sve	3t09dyzubc9zp	55s721c:13h	t	00:05:00	1969-12-31 18:17:25.814-07
lananaqcj6js8htau4	hp6bm0lnbaabng7sve	3unh7411ka0tz	55s721c:13h	t	00:05:00	1969-12-31 18:17:25.814-07
lananaqcj6js8htau4	hp6bm0lnbaabng7sve	817el2k23zdp	55s721c:13h	t	00:05:00	1969-12-31 18:17:25.814-07
lananaqcj6js8htau4	8qsppkskjgt7vnjgqn	2g43j83a271g9	55s721c:13i	t	00:05:00	1969-12-31 18:17:32.956-07
lananaqcj6js8htau4	8qsppkskjgt7vnjgqn	3t09dyzubc9zp	55s721c:13i	t	00:05:00	1969-12-31 18:17:32.956-07
lananaqcj6js8htau4	8qsppkskjgt7vnjgqn	3unh7411ka0tz	55s721c:13i	t	00:05:00	1969-12-31 18:17:32.956-07
lananaqcj6js8htau4	8qsppkskjgt7vnjgqn	817el2k23zdp	55s721c:13i	t	00:05:00	1969-12-31 18:17:32.956-07
htc76aifuod9vqouk8	30q4afgm41c6r1uudb	2g43j83a271g9	00:01	f	00:05:00	\N
uk74dsudpgd94faf3n	4j8t1qtplch2td5k2o	2g43j83a271g9	55zqif4:0e	t	00:05:00	1969-12-31 17:00:43.819-07
uk74dsudpgd94faf3n	4j8t1qtplch2td5k2o	3t09dyzubc9zp	55zqif4:0e	t	00:05:00	1969-12-31 17:00:43.819-07
uk74dsudpgd94faf3n	4j8t1qtplch2td5k2o	3unh7411ka0tz	55zqif4:0e	t	00:05:00	1969-12-31 17:00:43.819-07
uk74dsudpgd94faf3n	4j8t1qtplch2td5k2o	817el2k23zdp	55zqif4:0e	t	00:05:00	1969-12-31 17:00:43.819-07
uk74dsudpgd94faf3n	3ufis2kunif8q22r9c	3unh7411ka0tz	560jlo0:03	t	00:05:00	1969-12-31 17:05:12.541-07
uk74dsudpgd94faf3n	3ufis2kunif8q22r9c	817el2k23zdp	560jlo0:03	t	00:05:00	1969-12-31 17:05:12.541-07
uk74dsudpgd94faf3n	3ufis2kunif8q22r9c	e2hz9kajle2s	560jlo0:03	t	00:05:00	1969-12-31 17:05:12.541-07
uk74dsudpgd94faf3n	rhf78rh2i5frgqrv5b	e2hz9kajle2s	560jlo0:05	t	00:05:00	1969-12-31 17:05:12.818-07
uk74dsudpgd94faf3n	bikmrmgf5a0udq442t	2g43j83a271g9	560jlo0:09	t	00:05:00	1969-12-31 17:05:24.568-07
uk74dsudpgd94faf3n	bikmrmgf5a0udq442t	3t09dyzubc9zp	560jlo0:09	t	00:05:00	1969-12-31 17:05:24.568-07
uk74dsudpgd94faf3n	bikmrmgf5a0udq442t	3unh7411ka0tz	560jlo0:09	t	00:05:00	1969-12-31 17:05:24.568-07
uk74dsudpgd94faf3n	bikmrmgf5a0udq442t	817el2k23zdp	560jlo0:09	t	00:05:00	1969-12-31 17:05:24.568-07
uk74dsudpgd94faf3n	bikmrmgf5a0udq442t	e2hz9kajle2s	560jlo0:09	t	00:05:00	1969-12-31 17:05:24.568-07
uk74dsudpgd94faf3n	2227b7tv21u164e6ot	e2hz9kajle2s	5621vg8:07	t	00:05:00	1969-12-31 17:09:45.357-07
uk74dsudpgd94faf3n	mlne445708j4elbb62	2g43j83a271g9	562fnnc:02	t	00:05:00	1969-12-31 17:10:58.248-07
uk74dsudpgd94faf3n	mlne445708j4elbb62	3t09dyzubc9zp	562fnnc:02	t	00:05:00	1969-12-31 17:10:58.248-07
uk74dsudpgd94faf3n	mlne445708j4elbb62	3unh7411ka0tz	562fnnc:02	t	00:05:00	1969-12-31 17:10:58.248-07
lananaqcj6js8htau4	k1fr3lmilc25h0223n	2g43j83a271g9	55s721c:12d	t	00:05:00	1969-12-31 18:12:25.572-07
lananaqcj6js8htau4	k1fr3lmilc25h0223n	3t09dyzubc9zp	55s721c:12d	t	00:05:00	1969-12-31 18:12:25.572-07
lananaqcj6js8htau4	k1fr3lmilc25h0223n	3unh7411ka0tz	55s721c:12d	t	00:05:00	1969-12-31 18:12:25.572-07
lananaqcj6js8htau4	k1fr3lmilc25h0223n	817el2k23zdp	55s721c:12d	t	00:05:00	1969-12-31 18:12:25.572-07
lananaqcj6js8htau4	4itve6l2rojb01fbhb	2g43j83a271g9	55s721c:13j	t	00:05:00	1969-12-31 18:17:48.725-07
lananaqcj6js8htau4	4itve6l2rojb01fbhb	3t09dyzubc9zp	55s721c:13j	t	00:05:00	1969-12-31 18:17:48.725-07
lananaqcj6js8htau4	4itve6l2rojb01fbhb	3unh7411ka0tz	55s721c:13j	t	00:05:00	1969-12-31 18:17:48.725-07
lananaqcj6js8htau4	4itve6l2rojb01fbhb	817el2k23zdp	55s721c:13j	t	00:05:00	1969-12-31 18:17:48.725-07
lananaqcj6js8htau4	f316aq75rsm6k5n5ej	2g43j83a271g9	55s721c:12e	t	00:05:00	1969-12-31 18:12:25.648-07
lananaqcj6js8htau4	f316aq75rsm6k5n5ej	3t09dyzubc9zp	55s721c:12e	t	00:05:00	1969-12-31 18:12:25.648-07
lananaqcj6js8htau4	f316aq75rsm6k5n5ej	3unh7411ka0tz	55s721c:12e	t	00:05:00	1969-12-31 18:12:25.648-07
lananaqcj6js8htau4	f316aq75rsm6k5n5ej	817el2k23zdp	55s721c:12e	t	00:05:00	1969-12-31 18:12:25.648-07
lananaqcj6js8htau4	t5245q1losadqb8il7	2g43j83a271g9	55s721c:12f	t	00:05:00	1969-12-31 18:12:33.201-07
lananaqcj6js8htau4	t5245q1losadqb8il7	3t09dyzubc9zp	55s721c:12f	t	00:05:00	1969-12-31 18:12:33.201-07
lananaqcj6js8htau4	t5245q1losadqb8il7	3unh7411ka0tz	55s721c:12f	t	00:05:00	1969-12-31 18:12:33.201-07
lananaqcj6js8htau4	t5245q1losadqb8il7	817el2k23zdp	55s721c:12f	t	00:05:00	1969-12-31 18:12:33.201-07
lananaqcj6js8htau4	u7pfrav3ukmbj047ej	2g43j83a271g9	55s721c:13k	t	00:05:00	1969-12-31 18:18:09.371-07
lananaqcj6js8htau4	u7pfrav3ukmbj047ej	3t09dyzubc9zp	55s721c:13k	t	00:05:00	1969-12-31 18:18:09.371-07
lananaqcj6js8htau4	u7pfrav3ukmbj047ej	3unh7411ka0tz	55s721c:13k	t	00:05:00	1969-12-31 18:18:09.371-07
lananaqcj6js8htau4	u7pfrav3ukmbj047ej	817el2k23zdp	55s721c:13k	t	00:05:00	1969-12-31 18:18:09.371-07
lananaqcj6js8htau4	i8e60pv8vrqblf6rkt	2g43j83a271g9	55s721c:13l	t	00:05:00	1969-12-31 18:19:00.352-07
lananaqcj6js8htau4	i8e60pv8vrqblf6rkt	3t09dyzubc9zp	55s721c:13l	t	00:05:00	1969-12-31 18:19:00.352-07
lananaqcj6js8htau4	i8e60pv8vrqblf6rkt	3unh7411ka0tz	55s721c:13l	t	00:05:00	1969-12-31 18:19:00.352-07
lananaqcj6js8htau4	i8e60pv8vrqblf6rkt	817el2k23zdp	55s721c:13l	t	00:05:00	1969-12-31 18:19:00.352-07
lananaqcj6js8htau4	h74kdqnkmjufpop9jj	2g43j83a271g9	55s721c:13m	t	00:05:00	1969-12-31 18:19:46.217-07
lananaqcj6js8htau4	h74kdqnkmjufpop9jj	3t09dyzubc9zp	55s721c:13m	t	00:05:00	1969-12-31 18:19:46.217-07
lananaqcj6js8htau4	h74kdqnkmjufpop9jj	3unh7411ka0tz	55s721c:13m	t	00:05:00	1969-12-31 18:19:46.217-07
lananaqcj6js8htau4	h74kdqnkmjufpop9jj	817el2k23zdp	55s721c:13m	t	00:05:00	1969-12-31 18:19:46.217-07
lananaqcj6js8htau4	79j1ga2qcbo30910d1	2g43j83a271g9	55s721c:13n	t	00:05:00	1969-12-31 18:20:16.176-07
lananaqcj6js8htau4	79j1ga2qcbo30910d1	3t09dyzubc9zp	55s721c:13n	t	00:05:00	1969-12-31 18:20:16.176-07
lananaqcj6js8htau4	79j1ga2qcbo30910d1	3unh7411ka0tz	55s721c:13n	t	00:05:00	1969-12-31 18:20:16.176-07
lananaqcj6js8htau4	79j1ga2qcbo30910d1	817el2k23zdp	55s721c:13n	t	00:05:00	1969-12-31 18:20:16.176-07
gb84jvct157rn24agr	h3hn5phmpjh01b2398	2g43j83a271g9	00:01	f	00:05:00	\N
uk74dsudpgd94faf3n	9dk31rcmil4ab21rta	2g43j83a271g9	55zqif4:0i	t	00:05:00	1969-12-31 17:01:06.203-07
uk74dsudpgd94faf3n	9dk31rcmil4ab21rta	3t09dyzubc9zp	55zqif4:0i	t	00:05:00	1969-12-31 17:01:06.203-07
uk74dsudpgd94faf3n	9dk31rcmil4ab21rta	3unh7411ka0tz	55zqif4:0i	t	00:05:00	1969-12-31 17:01:06.203-07
uk74dsudpgd94faf3n	9dk31rcmil4ab21rta	817el2k23zdp	55zqif4:0i	t	00:05:00	1969-12-31 17:01:06.203-07
uk74dsudpgd94faf3n	osfj0e1ibvmroj5ids	3t09dyzubc9zp	55zqif4:0m	t	00:05:00	1969-12-31 17:01:18.358-07
uk74dsudpgd94faf3n	osfj0e1ibvmroj5ids	3unh7411ka0tz	55zqif4:0m	t	00:05:00	1969-12-31 17:01:18.358-07
uk74dsudpgd94faf3n	osfj0e1ibvmroj5ids	817el2k23zdp	55zqif4:0m	t	00:05:00	1969-12-31 17:01:18.358-07
uk74dsudpgd94faf3n	pchrbao5cdtb253s7u	2g43j83a271g9	560jlo0:07	t	00:05:00	1969-12-31 17:05:17.065-07
uk74dsudpgd94faf3n	pchrbao5cdtb253s7u	3t09dyzubc9zp	560jlo0:07	t	00:05:00	1969-12-31 17:05:17.065-07
uk74dsudpgd94faf3n	pchrbao5cdtb253s7u	3unh7411ka0tz	560jlo0:07	t	00:05:00	1969-12-31 17:05:17.065-07
uk74dsudpgd94faf3n	pchrbao5cdtb253s7u	817el2k23zdp	560jlo0:07	t	00:05:00	1969-12-31 17:05:17.065-07
uk74dsudpgd94faf3n	pchrbao5cdtb253s7u	e2hz9kajle2s	560jlo0:07	t	00:05:00	1969-12-31 17:05:17.065-07
uk74dsudpgd94faf3n	9s8vt41b35q9mho62o	2g43j83a271g9	560jlo0:0d	t	00:05:00	1969-12-31 17:05:32.573-07
uk74dsudpgd94faf3n	9s8vt41b35q9mho62o	3t09dyzubc9zp	560jlo0:0d	t	00:05:00	1969-12-31 17:05:32.573-07
uk74dsudpgd94faf3n	9s8vt41b35q9mho62o	3unh7411ka0tz	560jlo0:0d	t	00:05:00	1969-12-31 17:05:32.573-07
uk74dsudpgd94faf3n	9s8vt41b35q9mho62o	817el2k23zdp	560jlo0:0d	t	00:05:00	1969-12-31 17:05:32.573-07
uk74dsudpgd94faf3n	9s8vt41b35q9mho62o	e2hz9kajle2s	560jlo0:0d	t	00:05:00	1969-12-31 17:05:32.573-07
uk74dsudpgd94faf3n	dpi6ssgon4s8qusjro	2g43j83a271g9	560jlo0:0f	t	00:05:00	1969-12-31 17:05:40.169-07
uk74dsudpgd94faf3n	dpi6ssgon4s8qusjro	3t09dyzubc9zp	560jlo0:0f	t	00:05:00	1969-12-31 17:05:40.169-07
uk74dsudpgd94faf3n	dpi6ssgon4s8qusjro	3unh7411ka0tz	560jlo0:0f	t	00:05:00	1969-12-31 17:05:40.169-07
uk74dsudpgd94faf3n	dpi6ssgon4s8qusjro	817el2k23zdp	560jlo0:0f	t	00:05:00	1969-12-31 17:05:40.169-07
uk74dsudpgd94faf3n	dpi6ssgon4s8qusjro	e2hz9kajle2s	560jlo0:0f	t	00:05:00	1969-12-31 17:05:40.169-07
uk74dsudpgd94faf3n	sloqd25bnce7o17neh	2g43j83a271g9	5615vzc:05	t	00:05:00	1969-12-31 17:07:10.218-07
uk74dsudpgd94faf3n	sloqd25bnce7o17neh	3t09dyzubc9zp	5615vzc:05	t	00:05:00	1969-12-31 17:07:10.218-07
uk74dsudpgd94faf3n	sloqd25bnce7o17neh	3unh7411ka0tz	5615vzc:05	t	00:05:00	1969-12-31 17:07:10.218-07
uk74dsudpgd94faf3n	sloqd25bnce7o17neh	817el2k23zdp	5615vzc:05	t	00:05:00	1969-12-31 17:07:10.218-07
uk74dsudpgd94faf3n	sloqd25bnce7o17neh	e2hz9kajle2s	5615vzc:05	t	00:05:00	1969-12-31 17:07:10.218-07
uk74dsudpgd94faf3n	71npuc8ljfejltin9t	2g43j83a271g9	5615vzc:09	t	00:05:00	1969-12-31 17:07:37.954-07
uk74dsudpgd94faf3n	71npuc8ljfejltin9t	3t09dyzubc9zp	5615vzc:09	t	00:05:00	1969-12-31 17:07:37.954-07
uk74dsudpgd94faf3n	9ji249tn3ngj977a2a	3t09dyzubc9zp	561nv60:05	t	00:05:00	1969-12-31 17:08:19.155-07
uk74dsudpgd94faf3n	2227b7tv21u164e6ot	817el2k23zdp	5621vg8:07	t	00:05:00	1969-12-31 17:09:45.357-07
uk74dsudpgd94faf3n	mlne445708j4elbb62	817el2k23zdp	562fnnc:02	t	00:05:00	1969-12-31 17:10:58.248-07
uk74dsudpgd94faf3n	mlne445708j4elbb62	e2hz9kajle2s	562fnnc:02	t	00:05:00	1969-12-31 17:10:58.248-07
uk74dsudpgd94faf3n	v544q159fkq7f21u55	2g43j83a271g9	563o7s8:12v	t	00:05:00	1969-12-31 17:29:10.57-07
uk74dsudpgd94faf3n	v544q159fkq7f21u55	caqm13mxzbdr	563o7s8:12v	t	00:05:00	1969-12-31 17:29:10.57-07
uk74dsudpgd94faf3n	v544q159fkq7f21u55	2blc6xwom46ss	563o7s8:12v	t	00:05:00	1969-12-31 17:29:10.57-07
uk74dsudpgd94faf3n	huhai6j3mu91hnkc1o	1tgahbk62pc9s	562jj60:0c	t	00:05:00	1969-12-31 17:12:10.248-07
lananaqcj6js8htau4	7mnbvcm42ld40j052t	2g43j83a271g9	55s721c:13o	t	00:05:00	1969-12-31 18:20:23.954-07
lananaqcj6js8htau4	7mnbvcm42ld40j052t	3t09dyzubc9zp	55s721c:13o	t	00:05:00	1969-12-31 18:20:23.954-07
lananaqcj6js8htau4	7mnbvcm42ld40j052t	3unh7411ka0tz	55s721c:13o	t	00:05:00	1969-12-31 18:20:23.954-07
lananaqcj6js8htau4	7mnbvcm42ld40j052t	817el2k23zdp	55s721c:13o	t	00:05:00	1969-12-31 18:20:23.954-07
lananaqcj6js8htau4	gag98qucbf4grfek37	2g43j83a271g9	55s721c:13p	t	00:05:00	1969-12-31 18:20:25.964-07
lananaqcj6js8htau4	gag98qucbf4grfek37	3t09dyzubc9zp	55s721c:13p	t	00:05:00	1969-12-31 18:20:25.964-07
lananaqcj6js8htau4	gag98qucbf4grfek37	3unh7411ka0tz	55s721c:13p	t	00:05:00	1969-12-31 18:20:25.964-07
lananaqcj6js8htau4	gag98qucbf4grfek37	817el2k23zdp	55s721c:13p	t	00:05:00	1969-12-31 18:20:25.964-07
k8nqtfgdt1gfua17hj	bn6ib21gb5imh3s3ou	2g43j83a271g9	00:01	f	00:05:00	\N
uk74dsudpgd94faf3n	21to2c8rnt61ij6thp	2g43j83a271g9	55zqif4:0j	t	00:05:00	1969-12-31 17:01:13.317-07
uk74dsudpgd94faf3n	21to2c8rnt61ij6thp	3t09dyzubc9zp	55zqif4:0j	t	00:05:00	1969-12-31 17:01:13.317-07
uk74dsudpgd94faf3n	21to2c8rnt61ij6thp	3unh7411ka0tz	55zqif4:0j	t	00:05:00	1969-12-31 17:01:13.317-07
uk74dsudpgd94faf3n	21to2c8rnt61ij6thp	817el2k23zdp	55zqif4:0j	t	00:05:00	1969-12-31 17:01:13.317-07
uk74dsudpgd94faf3n	t3fvpignpn7vu7j1nu	2g43j83a271g9	562jj60:0f	t	00:05:00	1969-12-31 17:12:51.768-07
uk74dsudpgd94faf3n	t3fvpignpn7vu7j1nu	3t09dyzubc9zp	562jj60:0f	t	00:05:00	1969-12-31 17:12:51.768-07
uk74dsudpgd94faf3n	t3fvpignpn7vu7j1nu	3unh7411ka0tz	562jj60:0f	t	00:05:00	1969-12-31 17:12:51.768-07
uk74dsudpgd94faf3n	qft33v39nrpkaa9k5s	3t09dyzubc9zp	55zqif4:0o	t	00:05:00	1969-12-31 17:01:20.175-07
uk74dsudpgd94faf3n	qft33v39nrpkaa9k5s	3unh7411ka0tz	55zqif4:0o	t	00:05:00	1969-12-31 17:01:20.175-07
uk74dsudpgd94faf3n	qft33v39nrpkaa9k5s	817el2k23zdp	55zqif4:0o	t	00:05:00	1969-12-31 17:01:20.175-07
uk74dsudpgd94faf3n	buhusksoelb3prkk88	2g43j83a271g9	560jlo0:0h	t	00:05:00	1969-12-31 17:05:40.243-07
uk74dsudpgd94faf3n	buhusksoelb3prkk88	3t09dyzubc9zp	560jlo0:0h	t	00:05:00	1969-12-31 17:05:40.243-07
uk74dsudpgd94faf3n	buhusksoelb3prkk88	3unh7411ka0tz	560jlo0:0h	t	00:05:00	1969-12-31 17:05:40.243-07
uk74dsudpgd94faf3n	buhusksoelb3prkk88	817el2k23zdp	560jlo0:0h	t	00:05:00	1969-12-31 17:05:40.243-07
uk74dsudpgd94faf3n	buhusksoelb3prkk88	e2hz9kajle2s	560jlo0:0h	t	00:05:00	1969-12-31 17:05:40.243-07
uk74dsudpgd94faf3n	cgr2p04ur8falv3k4v	2g43j83a271g9	560jlo0:0j	t	00:05:00	1969-12-31 17:05:51.678-07
uk74dsudpgd94faf3n	cgr2p04ur8falv3k4v	3t09dyzubc9zp	560jlo0:0j	t	00:05:00	1969-12-31 17:05:51.678-07
uk74dsudpgd94faf3n	cgr2p04ur8falv3k4v	3unh7411ka0tz	560jlo0:0j	t	00:05:00	1969-12-31 17:05:51.678-07
uk74dsudpgd94faf3n	cgr2p04ur8falv3k4v	817el2k23zdp	560jlo0:0j	t	00:05:00	1969-12-31 17:05:51.678-07
uk74dsudpgd94faf3n	cgr2p04ur8falv3k4v	e2hz9kajle2s	560jlo0:0j	t	00:05:00	1969-12-31 17:05:51.678-07
uk74dsudpgd94faf3n	8kf2qhd2scbujk5oqp	2g43j83a271g9	560jlo0:0l	t	00:05:00	1969-12-31 17:05:52.263-07
uk74dsudpgd94faf3n	8kf2qhd2scbujk5oqp	3t09dyzubc9zp	560jlo0:0l	t	00:05:00	1969-12-31 17:05:52.263-07
uk74dsudpgd94faf3n	8kf2qhd2scbujk5oqp	3unh7411ka0tz	560jlo0:0l	t	00:05:00	1969-12-31 17:05:52.263-07
uk74dsudpgd94faf3n	8kf2qhd2scbujk5oqp	817el2k23zdp	560jlo0:0l	t	00:05:00	1969-12-31 17:05:52.263-07
uk74dsudpgd94faf3n	8kf2qhd2scbujk5oqp	e2hz9kajle2s	560jlo0:0l	t	00:05:00	1969-12-31 17:05:52.263-07
uk74dsudpgd94faf3n	dmp65f05hsces65dvi	2g43j83a271g9	560jlo0:0n	t	00:05:00	1969-12-31 17:06:09.459-07
uk74dsudpgd94faf3n	dmp65f05hsces65dvi	3t09dyzubc9zp	560jlo0:0n	t	00:05:00	1969-12-31 17:06:09.459-07
uk74dsudpgd94faf3n	dmp65f05hsces65dvi	3unh7411ka0tz	560jlo0:0n	t	00:05:00	1969-12-31 17:06:09.459-07
uk74dsudpgd94faf3n	dmp65f05hsces65dvi	817el2k23zdp	560jlo0:0n	t	00:05:00	1969-12-31 17:06:09.459-07
uk74dsudpgd94faf3n	dmp65f05hsces65dvi	e2hz9kajle2s	560jlo0:0n	t	00:05:00	1969-12-31 17:06:09.459-07
uk74dsudpgd94faf3n	fi6emo63bpgt4jqqrn	2g43j83a271g9	560vfaw:01	t	00:05:00	1969-12-31 17:06:37.577-07
uk74dsudpgd94faf3n	fi6emo63bpgt4jqqrn	3t09dyzubc9zp	560vfaw:01	t	00:05:00	1969-12-31 17:06:37.577-07
uk74dsudpgd94faf3n	fi6emo63bpgt4jqqrn	3unh7411ka0tz	560vfaw:01	t	00:05:00	1969-12-31 17:06:37.577-07
uk74dsudpgd94faf3n	fi6emo63bpgt4jqqrn	817el2k23zdp	560vfaw:01	t	00:05:00	1969-12-31 17:06:37.577-07
uk74dsudpgd94faf3n	fi6emo63bpgt4jqqrn	e2hz9kajle2s	560vfaw:01	t	00:05:00	1969-12-31 17:06:37.577-07
uk74dsudpgd94faf3n	q75tvgu5shjot899gl	2g43j83a271g9	5615vzc:07	t	00:05:00	1969-12-31 17:07:26.351-07
uk74dsudpgd94faf3n	q75tvgu5shjot899gl	3t09dyzubc9zp	5615vzc:07	t	00:05:00	1969-12-31 17:07:26.351-07
uk74dsudpgd94faf3n	q75tvgu5shjot899gl	3unh7411ka0tz	5615vzc:07	t	00:05:00	1969-12-31 17:07:26.351-07
uk74dsudpgd94faf3n	q75tvgu5shjot899gl	817el2k23zdp	5615vzc:07	t	00:05:00	1969-12-31 17:07:26.351-07
uk74dsudpgd94faf3n	q75tvgu5shjot899gl	e2hz9kajle2s	5615vzc:07	t	00:05:00	1969-12-31 17:07:26.351-07
uk74dsudpgd94faf3n	9ji249tn3ngj977a2a	3unh7411ka0tz	561nv60:05	t	00:05:00	1969-12-31 17:08:19.155-07
uk74dsudpgd94faf3n	9ji249tn3ngj977a2a	5yw2tu9v1pca	561nv60:05	t	00:05:00	1969-12-31 17:08:19.155-07
uk74dsudpgd94faf3n	9ji249tn3ngj977a2a	817el2k23zdp	561nv60:05	t	00:05:00	1969-12-31 17:08:19.155-07
uk74dsudpgd94faf3n	t20evahjht87uhotkr	2g43j83a271g9	561nv60:07	t	00:05:00	1969-12-31 17:08:19.835-07
uk74dsudpgd94faf3n	t20evahjht87uhotkr	3t09dyzubc9zp	561nv60:07	t	00:05:00	1969-12-31 17:08:19.835-07
uk74dsudpgd94faf3n	t20evahjht87uhotkr	3unh7411ka0tz	561nv60:07	t	00:05:00	1969-12-31 17:08:19.835-07
uk74dsudpgd94faf3n	t20evahjht87uhotkr	5yw2tu9v1pca	561nv60:07	t	00:05:00	1969-12-31 17:08:19.835-07
uk74dsudpgd94faf3n	t20evahjht87uhotkr	817el2k23zdp	561nv60:07	t	00:05:00	1969-12-31 17:08:19.835-07
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	6cyrj6k89ujx	561nv60:0l	f	00:05:00	\N
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	6sslkw7ya3s8	561nv60:0t	f	00:05:00	\N
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	38xozpcnh6zqd	561nv60:0v	f	00:05:00	\N
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	1j8dxewufrst5	561nv60:117	f	00:05:00	\N
uk74dsudpgd94faf3n	v544q159fkq7f21u55	3se2qu476j7tg	563o7s8:12v	t	00:05:00	1969-12-31 17:29:10.57-07
88nh1g3umqn4ia48q0	qiplkmnpd1odl62l6t	3unh7411ka0tz	56auau8:0s	t	00:05:00	1969-12-31 17:15:40.135-07
lananaqcj6js8htau4	3oovflhon72fhi3kiu	2g43j83a271g9	55s721c:13q	t	00:05:00	1969-12-31 18:20:25.996-07
lananaqcj6js8htau4	3oovflhon72fhi3kiu	3t09dyzubc9zp	55s721c:13q	t	00:05:00	1969-12-31 18:20:25.996-07
lananaqcj6js8htau4	3oovflhon72fhi3kiu	3unh7411ka0tz	55s721c:13q	t	00:05:00	1969-12-31 18:20:25.996-07
lananaqcj6js8htau4	3oovflhon72fhi3kiu	817el2k23zdp	55s721c:13q	t	00:05:00	1969-12-31 18:20:25.996-07
lananaqcj6js8htau4	tlkugrd8bkglpc2iun	2g43j83a271g9	55s721c:13r	t	00:05:00	1969-12-31 18:20:35.391-07
lananaqcj6js8htau4	tlkugrd8bkglpc2iun	3t09dyzubc9zp	55s721c:13r	t	00:05:00	1969-12-31 18:20:35.391-07
lananaqcj6js8htau4	tlkugrd8bkglpc2iun	3unh7411ka0tz	55s721c:13r	t	00:05:00	1969-12-31 18:20:35.391-07
lananaqcj6js8htau4	tlkugrd8bkglpc2iun	817el2k23zdp	55s721c:13r	t	00:05:00	1969-12-31 18:20:35.391-07
lananaqcj6js8htau4	7t0r04d2lsi4q4bk5c	2g43j83a271g9	55s721c:13s	t	00:05:00	1969-12-31 18:20:35.475-07
lananaqcj6js8htau4	7t0r04d2lsi4q4bk5c	3t09dyzubc9zp	55s721c:13s	t	00:05:00	1969-12-31 18:20:35.475-07
lananaqcj6js8htau4	7t0r04d2lsi4q4bk5c	3unh7411ka0tz	55s721c:13s	t	00:05:00	1969-12-31 18:20:35.475-07
lananaqcj6js8htau4	7t0r04d2lsi4q4bk5c	817el2k23zdp	55s721c:13s	t	00:05:00	1969-12-31 18:20:35.475-07
lananaqcj6js8htau4	8ssq16g8vvtjq6k5u9	2g43j83a271g9	55s721c:13t	t	00:05:00	1969-12-31 18:20:42.572-07
lananaqcj6js8htau4	fbsc434pi3eeimpnat	2g43j83a271g9	55s721c:12g	t	00:05:00	1969-12-31 18:12:34.123-07
lananaqcj6js8htau4	8ssq16g8vvtjq6k5u9	3t09dyzubc9zp	55s721c:13t	t	00:05:00	1969-12-31 18:20:42.572-07
lananaqcj6js8htau4	fbsc434pi3eeimpnat	3t09dyzubc9zp	55s721c:12g	t	00:05:00	1969-12-31 18:12:34.123-07
lananaqcj6js8htau4	8ssq16g8vvtjq6k5u9	3unh7411ka0tz	55s721c:13t	t	00:05:00	1969-12-31 18:20:42.572-07
lananaqcj6js8htau4	fbsc434pi3eeimpnat	3unh7411ka0tz	55s721c:12g	t	00:05:00	1969-12-31 18:12:34.123-07
lananaqcj6js8htau4	8ssq16g8vvtjq6k5u9	817el2k23zdp	55s721c:13t	t	00:05:00	1969-12-31 18:20:42.572-07
lananaqcj6js8htau4	fbsc434pi3eeimpnat	817el2k23zdp	55s721c:12g	t	00:05:00	1969-12-31 18:12:34.123-07
lananaqcj6js8htau4	lk4o33h0reafhq9vq2	2g43j83a271g9	55s721c:12h	t	00:05:00	1969-12-31 18:12:40.03-07
lananaqcj6js8htau4	1g58kcprts2dsj82d3	2g43j83a271g9	55s721c:13u	t	00:05:00	1969-12-31 18:20:43.656-07
lananaqcj6js8htau4	1g58kcprts2dsj82d3	3t09dyzubc9zp	55s721c:13u	t	00:05:00	1969-12-31 18:20:43.656-07
lananaqcj6js8htau4	1g58kcprts2dsj82d3	3unh7411ka0tz	55s721c:13u	t	00:05:00	1969-12-31 18:20:43.656-07
lananaqcj6js8htau4	1g58kcprts2dsj82d3	817el2k23zdp	55s721c:13u	t	00:05:00	1969-12-31 18:20:43.656-07
lananaqcj6js8htau4	lk4o33h0reafhq9vq2	3t09dyzubc9zp	55s721c:12h	t	00:05:00	1969-12-31 18:12:40.03-07
lananaqcj6js8htau4	lk4o33h0reafhq9vq2	3unh7411ka0tz	55s721c:12h	t	00:05:00	1969-12-31 18:12:40.03-07
lananaqcj6js8htau4	lk4o33h0reafhq9vq2	817el2k23zdp	55s721c:12h	t	00:05:00	1969-12-31 18:12:40.03-07
lananaqcj6js8htau4	rsgiqsm6cbotf5634k	3t09dyzubc9zp	55s721c:13x	t	00:05:00	1969-12-31 18:20:44.195-07
lananaqcj6js8htau4	rsgiqsm6cbotf5634k	3unh7411ka0tz	55s721c:13x	t	00:05:00	1969-12-31 18:20:44.195-07
lananaqcj6js8htau4	rsgiqsm6cbotf5634k	2g43j83a271g9	55s721c:13y	t	00:05:00	1969-12-31 18:20:57.261-07
lananaqcj6js8htau4	rsgiqsm6cbotf5634k	817el2k23zdp	55s721c:13y	t	00:05:00	1969-12-31 18:20:57.261-07
lananaqcj6js8htau4	rsgiqsm6cbotf5634k	gt8yfqbqc7ca	55s721c:13y	t	00:05:00	1969-12-31 18:20:57.261-07
lananaqcj6js8htau4	rsgiqsm6cbotf5634k	2blc6xwom46ss	55s721c:13y	t	00:05:00	1969-12-31 18:20:57.261-07
lananaqcj6js8htau4	rsgiqsm6cbotf5634k	3rnpsi5qegpt3	55s721c:13y	t	00:05:00	1969-12-31 18:20:57.261-07
lananaqcj6js8htau4	rsgiqsm6cbotf5634k	3se2qu476j7tg	55s721c:13y	t	00:05:00	1969-12-31 18:20:57.261-07
lananaqcj6js8htau4	rsgiqsm6cbotf5634k	caqm13mxzbdr	55s721c:13y	t	00:05:00	1969-12-31 18:20:57.261-07
lananaqcj6js8htau4	upngfbg4kovohhrmf9	3se2qu476j7tg	55xripk:01	t	00:05:00	1969-12-31 18:21:02.264-07
lananaqcj6js8htau4	upngfbg4kovohhrmf9	caqm13mxzbdr	55xripk:01	t	00:05:00	1969-12-31 18:21:02.264-07
lananaqcj6js8htau4	upngfbg4kovohhrmf9	gt8yfqbqc7ca	55xripk:03	t	00:05:00	1969-12-31 18:21:03.806-07
lananaqcj6js8htau4	upngfbg4kovohhrmf9	3rnpsi5qegpt3	55xripk:03	t	00:05:00	1969-12-31 18:21:03.806-07
lananaqcj6js8htau4	upngfbg4kovohhrmf9	2blc6xwom46ss	55xripk:03	t	00:05:00	1969-12-31 18:21:03.806-07
lananaqcj6js8htau4	upngfbg4kovohhrmf9	2g43j83a271g9	55xripk:04	t	00:05:00	1969-12-31 18:21:13.451-07
lananaqcj6js8htau4	upngfbg4kovohhrmf9	817el2k23zdp	55xripk:04	t	00:05:00	1969-12-31 18:21:13.451-07
lananaqcj6js8htau4	upngfbg4kovohhrmf9	3t09dyzubc9zp	55xripk:04	t	00:05:00	1969-12-31 18:21:13.451-07
lananaqcj6js8htau4	upngfbg4kovohhrmf9	3unh7411ka0tz	55xripk:04	t	00:05:00	1969-12-31 18:21:13.451-07
ihvkgj53a883ci6pfj	qehqdru5os9st2ff2c	2g43j83a271g9	00:01	f	00:05:00	\N
uk74dsudpgd94faf3n	j1rsmmj7l8uukecg0d	2g43j83a271g9	55zqif4:0k	t	00:05:00	1969-12-31 17:01:13.461-07
uk74dsudpgd94faf3n	j1rsmmj7l8uukecg0d	3t09dyzubc9zp	55zqif4:0k	t	00:05:00	1969-12-31 17:01:13.461-07
uk74dsudpgd94faf3n	j1rsmmj7l8uukecg0d	3unh7411ka0tz	55zqif4:0k	t	00:05:00	1969-12-31 17:01:13.461-07
uk74dsudpgd94faf3n	j1rsmmj7l8uukecg0d	817el2k23zdp	55zqif4:0k	t	00:05:00	1969-12-31 17:01:13.461-07
uk74dsudpgd94faf3n	puemu9708m6bpg44t6	2g43j83a271g9	560vfaw:03	t	00:05:00	1969-12-31 17:06:46.901-07
uk74dsudpgd94faf3n	puemu9708m6bpg44t6	3t09dyzubc9zp	560vfaw:03	t	00:05:00	1969-12-31 17:06:46.901-07
uk74dsudpgd94faf3n	puemu9708m6bpg44t6	3unh7411ka0tz	560vfaw:03	t	00:05:00	1969-12-31 17:06:46.901-07
uk74dsudpgd94faf3n	puemu9708m6bpg44t6	817el2k23zdp	560vfaw:03	t	00:05:00	1969-12-31 17:06:46.901-07
uk74dsudpgd94faf3n	puemu9708m6bpg44t6	e2hz9kajle2s	560vfaw:03	t	00:05:00	1969-12-31 17:06:46.901-07
uk74dsudpgd94faf3n	71npuc8ljfejltin9t	3unh7411ka0tz	5615vzc:09	t	00:05:00	1969-12-31 17:07:37.954-07
uk74dsudpgd94faf3n	71npuc8ljfejltin9t	817el2k23zdp	5615vzc:09	t	00:05:00	1969-12-31 17:07:37.954-07
uk74dsudpgd94faf3n	71npuc8ljfejltin9t	e2hz9kajle2s	5615vzc:09	t	00:05:00	1969-12-31 17:07:37.954-07
uk74dsudpgd94faf3n	nv7uomqtrijjsr8ktr	2g43j83a271g9	5615vzc:0b	t	00:05:00	1969-12-31 17:07:47.485-07
uk74dsudpgd94faf3n	nv7uomqtrijjsr8ktr	3t09dyzubc9zp	5615vzc:0b	t	00:05:00	1969-12-31 17:07:47.485-07
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	e2hz9kajle2s	561nv60:11b	t	00:05:00	1969-12-31 17:09:15.514-07
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	2g43j83a271g9	561nv60:11b	t	00:05:00	1969-12-31 17:09:15.514-07
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	3t09dyzubc9zp	561nv60:11b	t	00:05:00	1969-12-31 17:09:15.514-07
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	3unh7411ka0tz	561nv60:11b	t	00:05:00	1969-12-31 17:09:15.514-07
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	817el2k23zdp	561nv60:11b	t	00:05:00	1969-12-31 17:09:15.514-07
uk74dsudpgd94faf3n	i7vl4hk4m72ibv2pum	3t09dyzubc9zp	5621vg8:09	t	00:05:00	1969-12-31 17:09:52.768-07
uk74dsudpgd94faf3n	i7vl4hk4m72ibv2pum	3unh7411ka0tz	5621vg8:09	t	00:05:00	1969-12-31 17:09:52.768-07
lananaqcj6js8htau4	ivns9pltonqbnp2add	2g43j83a271g9	55xripk:05	t	00:05:00	1969-12-31 18:21:14.385-07
lananaqcj6js8htau4	ivns9pltonqbnp2add	3t09dyzubc9zp	55xripk:05	t	00:05:00	1969-12-31 18:21:14.385-07
lananaqcj6js8htau4	ivns9pltonqbnp2add	3unh7411ka0tz	55xripk:05	t	00:05:00	1969-12-31 18:21:14.385-07
lananaqcj6js8htau4	ivns9pltonqbnp2add	817el2k23zdp	55xripk:05	t	00:05:00	1969-12-31 18:21:14.385-07
uk74dsudpgd94faf3n	i7vl4hk4m72ibv2pum	817el2k23zdp	5621vg8:09	t	00:05:00	1969-12-31 17:09:52.768-07
uk74dsudpgd94faf3n	i7vl4hk4m72ibv2pum	e2hz9kajle2s	5621vg8:09	t	00:05:00	1969-12-31 17:09:52.768-07
lananaqcj6js8htau4	tdsp5fql0lu4c9e924	2g43j83a271g9	55xripk:06	t	00:05:00	1969-12-31 18:21:21.058-07
lananaqcj6js8htau4	tdsp5fql0lu4c9e924	3t09dyzubc9zp	55xripk:06	t	00:05:00	1969-12-31 18:21:21.058-07
lananaqcj6js8htau4	tdsp5fql0lu4c9e924	3unh7411ka0tz	55xripk:06	t	00:05:00	1969-12-31 18:21:21.058-07
lananaqcj6js8htau4	tdsp5fql0lu4c9e924	817el2k23zdp	55xripk:06	t	00:05:00	1969-12-31 18:21:21.058-07
lananaqcj6js8htau4	h8n9qvng8q65i7md8q	2g43j83a271g9	55xripk:07	t	00:05:00	1969-12-31 18:21:35.73-07
lananaqcj6js8htau4	h8n9qvng8q65i7md8q	3t09dyzubc9zp	55xripk:07	t	00:05:00	1969-12-31 18:21:35.73-07
lananaqcj6js8htau4	h8n9qvng8q65i7md8q	3unh7411ka0tz	55xripk:07	t	00:05:00	1969-12-31 18:21:35.73-07
lananaqcj6js8htau4	h8n9qvng8q65i7md8q	817el2k23zdp	55xripk:07	t	00:05:00	1969-12-31 18:21:35.73-07
g3v14ttgpg24ikddc2	07tjdpr82pmdkgt5n8	2g43j83a271g9	00:01	f	00:05:00	\N
uk74dsudpgd94faf3n	osfj0e1ibvmroj5ids	2g43j83a271g9	55zqif4:0m	t	00:05:00	1969-12-31 17:01:18.358-07
uk74dsudpgd94faf3n	r8bdmi44ha9gc708q1	3t09dyzubc9zp	560vfaw:03	f	00:05:00	\N
uk74dsudpgd94faf3n	r8bdmi44ha9gc708q1	3unh7411ka0tz	560vfaw:03	f	00:05:00	\N
uk74dsudpgd94faf3n	r8bdmi44ha9gc708q1	817el2k23zdp	560vfaw:03	f	00:05:00	\N
uk74dsudpgd94faf3n	r8bdmi44ha9gc708q1	e2hz9kajle2s	560vfaw:03	f	00:05:00	\N
uk74dsudpgd94faf3n	r8bdmi44ha9gc708q1	2g43j83a271g9	5610588:01	t	00:05:00	1969-12-31 17:06:47.759-07
uk74dsudpgd94faf3n	pqhddjahl0r2sver56	3t09dyzubc9zp	562damg:01	t	00:05:00	1969-12-31 17:10:06.763-07
uk74dsudpgd94faf3n	pqhddjahl0r2sver56	3unh7411ka0tz	562damg:01	t	00:05:00	1969-12-31 17:10:06.763-07
uk74dsudpgd94faf3n	pqhddjahl0r2sver56	817el2k23zdp	562damg:01	t	00:05:00	1969-12-31 17:10:06.763-07
uk74dsudpgd94faf3n	pqhddjahl0r2sver56	e2hz9kajle2s	562damg:01	t	00:05:00	1969-12-31 17:10:06.763-07
uk74dsudpgd94faf3n	9f3elvilaek4nrlmbn	2g43j83a271g9	5615vzc:01	t	00:05:00	1969-12-31 17:07:01.636-07
uk74dsudpgd94faf3n	9f3elvilaek4nrlmbn	3t09dyzubc9zp	5615vzc:01	t	00:05:00	1969-12-31 17:07:01.636-07
uk74dsudpgd94faf3n	9f3elvilaek4nrlmbn	3unh7411ka0tz	5615vzc:01	t	00:05:00	1969-12-31 17:07:01.636-07
uk74dsudpgd94faf3n	9f3elvilaek4nrlmbn	817el2k23zdp	5615vzc:01	t	00:05:00	1969-12-31 17:07:01.636-07
uk74dsudpgd94faf3n	nv7uomqtrijjsr8ktr	3unh7411ka0tz	5615vzc:0b	t	00:05:00	1969-12-31 17:07:47.485-07
uk74dsudpgd94faf3n	nv7uomqtrijjsr8ktr	817el2k23zdp	5615vzc:0b	t	00:05:00	1969-12-31 17:07:47.485-07
uk74dsudpgd94faf3n	nv7uomqtrijjsr8ktr	e2hz9kajle2s	5615vzc:0b	t	00:05:00	1969-12-31 17:07:47.485-07
uk74dsudpgd94faf3n	jjbfddletucnjp5uc5	2g43j83a271g9	5615vzc:0d	t	00:05:00	1969-12-31 17:07:48.125-07
uk74dsudpgd94faf3n	jjbfddletucnjp5uc5	3t09dyzubc9zp	5615vzc:0d	t	00:05:00	1969-12-31 17:07:48.125-07
uk74dsudpgd94faf3n	jjbfddletucnjp5uc5	3unh7411ka0tz	5615vzc:0d	t	00:05:00	1969-12-31 17:07:48.125-07
uk74dsudpgd94faf3n	jjbfddletucnjp5uc5	817el2k23zdp	5615vzc:0d	t	00:05:00	1969-12-31 17:07:48.125-07
uk74dsudpgd94faf3n	jjbfddletucnjp5uc5	e2hz9kajle2s	5615vzc:0d	t	00:05:00	1969-12-31 17:07:48.125-07
uk74dsudpgd94faf3n	5i9aqac79af041v00l	3t09dyzubc9zp	562fnnc:03	t	00:05:00	1969-12-31 17:11:09.829-07
uk74dsudpgd94faf3n	5i9aqac79af041v00l	3unh7411ka0tz	562fnnc:03	t	00:05:00	1969-12-31 17:11:09.829-07
uk74dsudpgd94faf3n	5i9aqac79af041v00l	817el2k23zdp	562fnnc:03	t	00:05:00	1969-12-31 17:11:09.829-07
uk74dsudpgd94faf3n	5i9aqac79af041v00l	e2hz9kajle2s	562fnnc:03	t	00:05:00	1969-12-31 17:11:09.829-07
uk74dsudpgd94faf3n	8s52d5nspal38hgl87	2g43j83a271g9	561nv60:09	t	00:05:00	1969-12-31 17:08:20.678-07
uk74dsudpgd94faf3n	8s52d5nspal38hgl87	3t09dyzubc9zp	561nv60:09	t	00:05:00	1969-12-31 17:08:20.678-07
uk74dsudpgd94faf3n	8s52d5nspal38hgl87	3unh7411ka0tz	561nv60:09	t	00:05:00	1969-12-31 17:08:20.678-07
uk74dsudpgd94faf3n	8s52d5nspal38hgl87	5yw2tu9v1pca	561nv60:09	t	00:05:00	1969-12-31 17:08:20.678-07
uk74dsudpgd94faf3n	8s52d5nspal38hgl87	817el2k23zdp	561nv60:09	t	00:05:00	1969-12-31 17:08:20.678-07
uk74dsudpgd94faf3n	i67s55b3hs5v5h751o	2g43j83a271g9	562jj60:01	t	00:05:00	1969-12-31 17:11:25.732-07
uk74dsudpgd94faf3n	i67s55b3hs5v5h751o	3t09dyzubc9zp	562jj60:01	t	00:05:00	1969-12-31 17:11:25.732-07
uk74dsudpgd94faf3n	i67s55b3hs5v5h751o	3unh7411ka0tz	562jj60:01	t	00:05:00	1969-12-31 17:11:25.732-07
uk74dsudpgd94faf3n	4v7q5lf1sk7p4nfjek	5yw2tu9v1pca	561nv60:0b	f	00:05:00	\N
uk74dsudpgd94faf3n	4v7q5lf1sk7p4nfjek	3t09dyzubc9zp	561nv60:0d	t	00:05:00	1969-12-31 17:08:23.145-07
uk74dsudpgd94faf3n	4v7q5lf1sk7p4nfjek	3unh7411ka0tz	561nv60:0d	t	00:05:00	1969-12-31 17:08:23.145-07
uk74dsudpgd94faf3n	4v7q5lf1sk7p4nfjek	817el2k23zdp	561nv60:0d	t	00:05:00	1969-12-31 17:08:23.145-07
uk74dsudpgd94faf3n	i67s55b3hs5v5h751o	817el2k23zdp	562jj60:01	t	00:05:00	1969-12-31 17:11:25.732-07
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	wadifsltd94o	561nv60:0n	f	00:05:00	\N
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	jmcnhcd1etk2	561nv60:0r	f	00:05:00	\N
uk74dsudpgd94faf3n	umnqkondhkcfr4keab	3vom7mes0wp2i	561nv60:0x	f	00:05:00	\N
uk74dsudpgd94faf3n	huhai6j3mu91hnkc1o	3t09dyzubc9zp	562jj60:0e	t	00:05:00	1969-12-31 17:12:33.084-07
uk74dsudpgd94faf3n	huhai6j3mu91hnkc1o	3unh7411ka0tz	562jj60:0e	t	00:05:00	1969-12-31 17:12:33.084-07
uk74dsudpgd94faf3n	huhai6j3mu91hnkc1o	817el2k23zdp	562jj60:0e	t	00:05:00	1969-12-31 17:12:33.084-07
uk74dsudpgd94faf3n	huhai6j3mu91hnkc1o	e2hz9kajle2s	562jj60:0e	t	00:05:00	1969-12-31 17:12:33.084-07
88nh1g3umqn4ia48q0	qiplkmnpd1odl62l6t	3t09dyzubc9zp	56auau8:0s	t	00:05:00	1969-12-31 17:15:40.135-07
88nh1g3umqn4ia48q0	sast41muet9l15rm6d	3unh7411ka0tz	56bncow:01	t	00:05:00	1969-12-31 17:15:47.274-07
uk74dsudpgd94faf3n	fj80f944nuajrtn1an	2blc6xwom46ss	563o7s8:12w	t	00:05:00	1969-12-31 17:29:11.285-07
uk74dsudpgd94faf3n	fj80f944nuajrtn1an	2g43j83a271g9	563o7s8:12w	t	00:05:00	1969-12-31 17:29:11.285-07
uk74dsudpgd94faf3n	brhohoeuvq9u5b1q50	2g43j83a271g9	5627l1k:01	t	00:05:00	1969-12-31 17:09:53.25-07
uk74dsudpgd94faf3n	brhohoeuvq9u5b1q50	3t09dyzubc9zp	5627l1k:01	t	00:05:00	1969-12-31 17:09:53.25-07
uk74dsudpgd94faf3n	brhohoeuvq9u5b1q50	3unh7411ka0tz	5627l1k:01	t	00:05:00	1969-12-31 17:09:53.25-07
lananaqcj6js8htau4	8o0eig7jpbctnkvtda	2g43j83a271g9	55xripk:08	t	00:05:00	1969-12-31 18:21:50.797-07
lananaqcj6js8htau4	8o0eig7jpbctnkvtda	3t09dyzubc9zp	55xripk:08	t	00:05:00	1969-12-31 18:21:50.797-07
lananaqcj6js8htau4	8o0eig7jpbctnkvtda	3unh7411ka0tz	55xripk:08	t	00:05:00	1969-12-31 18:21:50.797-07
lananaqcj6js8htau4	8o0eig7jpbctnkvtda	817el2k23zdp	55xripk:08	t	00:05:00	1969-12-31 18:21:50.797-07
lananaqcj6js8htau4	r95c56punh5fb36ooa	2g43j83a271g9	55xripk:09	f	00:05:00	\N
lananaqcj6js8htau4	r95c56punh5fb36ooa	3t09dyzubc9zp	55xripk:09	f	00:05:00	\N
lananaqcj6js8htau4	r95c56punh5fb36ooa	3unh7411ka0tz	55xripk:09	f	00:05:00	\N
lananaqcj6js8htau4	r95c56punh5fb36ooa	817el2k23zdp	55xripk:09	f	00:05:00	\N
lananaqcj6js8htau4	u8muf0ijld9epujbb2	2g43j83a271g9	55xripk:09	t	00:05:00	1969-12-31 18:21:58.092-07
lananaqcj6js8htau4	u8muf0ijld9epujbb2	3t09dyzubc9zp	55xripk:09	t	00:05:00	1969-12-31 18:21:58.092-07
lananaqcj6js8htau4	u8muf0ijld9epujbb2	3unh7411ka0tz	55xripk:09	t	00:05:00	1969-12-31 18:21:58.092-07
lananaqcj6js8htau4	u8muf0ijld9epujbb2	817el2k23zdp	55xripk:09	t	00:05:00	1969-12-31 18:21:58.092-07
hnan605eembon699el	ms8lk6k90gcu69l910	2g43j83a271g9	00:01	f	00:05:00	\N
uk74dsudpgd94faf3n	brhohoeuvq9u5b1q50	817el2k23zdp	5627l1k:01	t	00:05:00	1969-12-31 17:09:53.25-07
uk74dsudpgd94faf3n	brhohoeuvq9u5b1q50	e2hz9kajle2s	5627l1k:01	t	00:05:00	1969-12-31 17:09:53.25-07
uk74dsudpgd94faf3n	1e9t59co4r80am7ane	2g43j83a271g9	5627l1k:02	t	00:05:00	1969-12-31 17:09:54.273-07
uk74dsudpgd94faf3n	1e9t59co4r80am7ane	3t09dyzubc9zp	5627l1k:02	t	00:05:00	1969-12-31 17:09:54.273-07
uk74dsudpgd94faf3n	uehvmb6e619j5b7tm3	2g43j83a271g9	55zqif4:0p	t	00:05:00	1969-12-31 17:01:25.851-07
uk74dsudpgd94faf3n	uehvmb6e619j5b7tm3	3t09dyzubc9zp	55zqif4:0p	t	00:05:00	1969-12-31 17:01:25.851-07
uk74dsudpgd94faf3n	uehvmb6e619j5b7tm3	3unh7411ka0tz	55zqif4:0p	t	00:05:00	1969-12-31 17:01:25.851-07
uk74dsudpgd94faf3n	uehvmb6e619j5b7tm3	817el2k23zdp	55zqif4:0p	t	00:05:00	1969-12-31 17:01:25.851-07
uk74dsudpgd94faf3n	1e9t59co4r80am7ane	3unh7411ka0tz	5627l1k:02	t	00:05:00	1969-12-31 17:09:54.273-07
uk74dsudpgd94faf3n	d5e8s44hge9pforego	2g43j83a271g9	5610588:05	t	00:05:00	1969-12-31 17:06:50.72-07
uk74dsudpgd94faf3n	1e9t59co4r80am7ane	817el2k23zdp	5627l1k:02	t	00:05:00	1969-12-31 17:09:54.273-07
uk74dsudpgd94faf3n	1e9t59co4r80am7ane	e2hz9kajle2s	5627l1k:02	t	00:05:00	1969-12-31 17:09:54.273-07
uk74dsudpgd94faf3n	i67s55b3hs5v5h751o	e2hz9kajle2s	562jj60:01	t	00:05:00	1969-12-31 17:11:25.732-07
uk74dsudpgd94faf3n	th6h83nsbcs7nqvvqh	2g43j83a271g9	5615vzc:0f	t	00:05:00	1969-12-31 17:08:04.136-07
uk74dsudpgd94faf3n	th6h83nsbcs7nqvvqh	3t09dyzubc9zp	5615vzc:0f	t	00:05:00	1969-12-31 17:08:04.136-07
uk74dsudpgd94faf3n	th6h83nsbcs7nqvvqh	3unh7411ka0tz	5615vzc:0f	t	00:05:00	1969-12-31 17:08:04.136-07
uk74dsudpgd94faf3n	th6h83nsbcs7nqvvqh	817el2k23zdp	5615vzc:0f	t	00:05:00	1969-12-31 17:08:04.136-07
uk74dsudpgd94faf3n	th6h83nsbcs7nqvvqh	e2hz9kajle2s	5615vzc:0f	t	00:05:00	1969-12-31 17:08:04.136-07
uk74dsudpgd94faf3n	6j5c0c6ia8f2g1faju	e2hz9kajle2s	562jj60:03	t	00:05:00	1969-12-31 17:11:27.675-07
uk74dsudpgd94faf3n	4v7q5lf1sk7p4nfjek	2g43j83a271g9	561nv60:0d	t	00:05:00	1969-12-31 17:08:23.145-07
uk74dsudpgd94faf3n	403saa8etb431r81b5	2g43j83a271g9	561nv60:0h	t	00:05:00	1969-12-31 17:08:25.398-07
uk74dsudpgd94faf3n	403saa8etb431r81b5	3t09dyzubc9zp	561nv60:0h	t	00:05:00	1969-12-31 17:08:25.398-07
uk74dsudpgd94faf3n	403saa8etb431r81b5	3unh7411ka0tz	561nv60:0h	t	00:05:00	1969-12-31 17:08:25.398-07
uk74dsudpgd94faf3n	403saa8etb431r81b5	817el2k23zdp	561nv60:0h	t	00:05:00	1969-12-31 17:08:25.398-07
uk74dsudpgd94faf3n	6j5c0c6ia8f2g1faju	2g43j83a271g9	562jj60:04	t	00:05:00	1969-12-31 17:11:39.942-07
uk74dsudpgd94faf3n	6j5c0c6ia8f2g1faju	3t09dyzubc9zp	562jj60:04	t	00:05:00	1969-12-31 17:11:39.942-07
uk74dsudpgd94faf3n	6j5c0c6ia8f2g1faju	3unh7411ka0tz	562jj60:04	t	00:05:00	1969-12-31 17:11:39.942-07
uk74dsudpgd94faf3n	6j5c0c6ia8f2g1faju	817el2k23zdp	562jj60:04	t	00:05:00	1969-12-31 17:11:39.942-07
uk74dsudpgd94faf3n	iu23ogacascpo59dam	2g43j83a271g9	562jj60:07	t	00:05:00	1969-12-31 17:11:57.538-07
uk74dsudpgd94faf3n	iu23ogacascpo59dam	3t09dyzubc9zp	562jj60:07	t	00:05:00	1969-12-31 17:11:57.538-07
uk74dsudpgd94faf3n	iu23ogacascpo59dam	3unh7411ka0tz	562jj60:07	t	00:05:00	1969-12-31 17:11:57.538-07
uk74dsudpgd94faf3n	iu23ogacascpo59dam	817el2k23zdp	562jj60:07	t	00:05:00	1969-12-31 17:11:57.538-07
uk74dsudpgd94faf3n	huhai6j3mu91hnkc1o	2g43j83a271g9	562jj60:0e	t	00:05:00	1969-12-31 17:12:33.084-07
uk74dsudpgd94faf3n	t3fvpignpn7vu7j1nu	817el2k23zdp	562jj60:0f	t	00:05:00	1969-12-31 17:12:51.768-07
uk74dsudpgd94faf3n	t3fvpignpn7vu7j1nu	e2hz9kajle2s	562jj60:0f	t	00:05:00	1969-12-31 17:12:51.768-07
uk74dsudpgd94faf3n	t0j0qa1hsdr7mknl83	2g43j83a271g9	562jj60:0h	t	00:05:00	1969-12-31 17:12:59.657-07
uk74dsudpgd94faf3n	t0j0qa1hsdr7mknl83	3t09dyzubc9zp	562jj60:0h	t	00:05:00	1969-12-31 17:12:59.657-07
uk74dsudpgd94faf3n	t0j0qa1hsdr7mknl83	3unh7411ka0tz	562jj60:0h	t	00:05:00	1969-12-31 17:12:59.657-07
88nh1g3umqn4ia48q0	sast41muet9l15rm6d	2g43j83a271g9	56bncow:01	t	00:05:00	1969-12-31 17:15:47.274-07
88nh1g3umqn4ia48q0	sast41muet9l15rm6d	3t09dyzubc9zp	56bncow:01	t	00:05:00	1969-12-31 17:15:47.274-07
88nh1g3umqn4ia48q0	vupfk1ablrojjh3l72	3t09dyzubc9zp	56bncow:02	t	00:05:00	1969-12-31 17:15:47.353-07
88nh1g3umqn4ia48q0	vupfk1ablrojjh3l72	3unh7411ka0tz	56bncow:02	t	00:05:00	1969-12-31 17:15:47.353-07
03t8qgkk1nqfk9vv0c	aiump1ulmfnt946h1o	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	kg5i2r7uvhe1k58r2a	343u9rvx540f6	55jiju0:01	t	00:05:00	1969-12-31 17:17:56.027-07
88nh1g3umqn4ia48q0	7ep1mbijkslo1eq4ie	2g43j83a271g9	56bncow:05	t	00:05:00	1969-12-31 17:16:34.099-07
88nh1g3umqn4ia48q0	7ep1mbijkslo1eq4ie	3t09dyzubc9zp	56bncow:05	t	00:05:00	1969-12-31 17:16:34.099-07
88nh1g3umqn4ia48q0	7ep1mbijkslo1eq4ie	3unh7411ka0tz	56bncow:05	t	00:05:00	1969-12-31 17:16:34.099-07
lananaqcj6js8htau4	9r8740l6u0v87ijvpp	2g43j83a271g9	55fy3mg:01	t	00:05:00	1969-12-31 17:08:38.947-07
lananaqcj6js8htau4	9r8740l6u0v87ijvpp	3t09dyzubc9zp	55fy3mg:01	t	00:05:00	1969-12-31 17:08:38.947-07
lananaqcj6js8htau4	9r8740l6u0v87ijvpp	3unh7411ka0tz	55fy3mg:01	t	00:05:00	1969-12-31 17:08:38.947-07
lananaqcj6js8htau4	9r8740l6u0v87ijvpp	817el2k23zdp	55fy3mg:01	t	00:05:00	1969-12-31 17:08:38.947-07
l8mvh560r0fbhr8lj3	0k3as0c795rcd1jvc0	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	823j6noa155stqnjnc	2g43j83a271g9	55s721c:0j	t	00:05:00	1969-12-31 18:03:35.232-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	30jvdj0cnbssk	55oncwg:0j	t	00:05:00	1969-12-31 17:41:09.16-07
88nh1g3umqn4ia48q0	vupfk1ablrojjh3l72	2g43j83a271g9	56bncow:02	t	00:05:00	1969-12-31 17:15:47.353-07
31mc88jnq97se1qfd3	i3ns92ko7inlhtk0rf	2g43j83a271g9	00:01	f	00:05:00	\N
kir8njkgnkqiu0b650	3o0g3qutvgjtqh216b	2g43j83a271g9	00:01	f	00:05:00	\N
hduufqspughbcleqlh	lhgiba916gr42j2o6e	2g43j83a271g9	00:01	f	00:05:00	\N
hk190gb9r62o0nurct	8hdlsa525d3aeve1t4	2g43j83a271g9	00:01	f	00:05:00	\N
88nh1g3umqn4ia48q0	4phub7smfc5c231su5	2g43j83a271g9	56bncow:03	t	00:05:00	1969-12-31 17:15:48.007-07
88nh1g3umqn4ia48q0	4phub7smfc5c231su5	3t09dyzubc9zp	56bncow:03	t	00:05:00	1969-12-31 17:15:48.007-07
88nh1g3umqn4ia48q0	4phub7smfc5c231su5	3unh7411ka0tz	56bncow:03	t	00:05:00	1969-12-31 17:15:48.007-07
uk74dsudpgd94faf3n	9pi605j5otc0mpdns2	2g43j83a271g9	55zqif4:0q	t	00:05:00	1969-12-31 17:02:06.927-07
uk74dsudpgd94faf3n	9pi605j5otc0mpdns2	3t09dyzubc9zp	55zqif4:0q	t	00:05:00	1969-12-31 17:02:06.927-07
uk74dsudpgd94faf3n	9pi605j5otc0mpdns2	3unh7411ka0tz	55zqif4:0q	t	00:05:00	1969-12-31 17:02:06.927-07
uk74dsudpgd94faf3n	9pi605j5otc0mpdns2	817el2k23zdp	55zqif4:0q	t	00:05:00	1969-12-31 17:02:06.927-07
uk74dsudpgd94faf3n	d5e8s44hge9pforego	5yw2tu9v1pca	5610588:03	f	00:05:00	\N
uk74dsudpgd94faf3n	d5e8s44hge9pforego	3t09dyzubc9zp	5610588:05	t	00:05:00	1969-12-31 17:06:50.72-07
uk74dsudpgd94faf3n	d5e8s44hge9pforego	3unh7411ka0tz	5610588:05	t	00:05:00	1969-12-31 17:06:50.72-07
uk74dsudpgd94faf3n	d5e8s44hge9pforego	817el2k23zdp	5610588:05	t	00:05:00	1969-12-31 17:06:50.72-07
uk74dsudpgd94faf3n	4966gqdvsogft8umig	3t09dyzubc9zp	5615vzc:0f	f	00:05:00	\N
uk74dsudpgd94faf3n	4966gqdvsogft8umig	3unh7411ka0tz	5615vzc:0f	f	00:05:00	\N
uk74dsudpgd94faf3n	4966gqdvsogft8umig	817el2k23zdp	5615vzc:0f	f	00:05:00	\N
uk74dsudpgd94faf3n	fj80f944nuajrtn1an	3se2qu476j7tg	563o7s8:12w	t	00:05:00	1969-12-31 17:29:11.285-07
uk74dsudpgd94faf3n	pqhddjahl0r2sver56	2g43j83a271g9	562damg:01	t	00:05:00	1969-12-31 17:10:06.763-07
uk74dsudpgd94faf3n	fj80f944nuajrtn1an	caqm13mxzbdr	563o7s8:12w	t	00:05:00	1969-12-31 17:29:11.285-07
88nh1g3umqn4ia48q0	3hr0te7tf9u96k2ccd	2g43j83a271g9	56bncow:04	t	00:05:00	1969-12-31 17:16:33.41-07
88nh1g3umqn4ia48q0	3hr0te7tf9u96k2ccd	3t09dyzubc9zp	56bncow:04	t	00:05:00	1969-12-31 17:16:33.41-07
88nh1g3umqn4ia48q0	3hr0te7tf9u96k2ccd	3unh7411ka0tz	56bncow:04	t	00:05:00	1969-12-31 17:16:33.41-07
uk74dsudpgd94faf3n	d6rcitp0vofsc7njri	2g43j83a271g9	562jj60:05	t	00:05:00	1969-12-31 17:11:40.568-07
uk74dsudpgd94faf3n	d6rcitp0vofsc7njri	3t09dyzubc9zp	562jj60:05	t	00:05:00	1969-12-31 17:11:40.568-07
uk74dsudpgd94faf3n	d6rcitp0vofsc7njri	3unh7411ka0tz	562jj60:05	t	00:05:00	1969-12-31 17:11:40.568-07
uk74dsudpgd94faf3n	d6rcitp0vofsc7njri	817el2k23zdp	562jj60:05	t	00:05:00	1969-12-31 17:11:40.568-07
uk74dsudpgd94faf3n	inkpqni218aeoanicn	2g43j83a271g9	562jj60:06	t	00:05:00	1969-12-31 17:11:51.02-07
uk74dsudpgd94faf3n	inkpqni218aeoanicn	3t09dyzubc9zp	562jj60:06	t	00:05:00	1969-12-31 17:11:51.02-07
uk74dsudpgd94faf3n	inkpqni218aeoanicn	3unh7411ka0tz	562jj60:06	t	00:05:00	1969-12-31 17:11:51.02-07
uk74dsudpgd94faf3n	inkpqni218aeoanicn	817el2k23zdp	562jj60:06	t	00:05:00	1969-12-31 17:11:51.02-07
uk74dsudpgd94faf3n	n08qinjk7291eves2l	2g43j83a271g9	562jj60:08	t	00:05:00	1969-12-31 17:11:57.663-07
uk74dsudpgd94faf3n	n08qinjk7291eves2l	3t09dyzubc9zp	562jj60:08	t	00:05:00	1969-12-31 17:11:57.663-07
uk74dsudpgd94faf3n	n08qinjk7291eves2l	3unh7411ka0tz	562jj60:08	t	00:05:00	1969-12-31 17:11:57.663-07
uk74dsudpgd94faf3n	n08qinjk7291eves2l	817el2k23zdp	562jj60:08	t	00:05:00	1969-12-31 17:11:57.663-07
uk74dsudpgd94faf3n	hhjptun70n2rseshgp	2g43j83a271g9	562jj60:09	t	00:05:00	1969-12-31 17:12:03.939-07
uk74dsudpgd94faf3n	hhjptun70n2rseshgp	3t09dyzubc9zp	562jj60:09	t	00:05:00	1969-12-31 17:12:03.939-07
uk74dsudpgd94faf3n	hhjptun70n2rseshgp	3unh7411ka0tz	562jj60:09	t	00:05:00	1969-12-31 17:12:03.939-07
uk74dsudpgd94faf3n	hhjptun70n2rseshgp	817el2k23zdp	562jj60:09	t	00:05:00	1969-12-31 17:12:03.939-07
uk74dsudpgd94faf3n	0ssd0gbfk5v59gf8kk	2g43j83a271g9	562jj60:0g	t	00:05:00	1969-12-31 17:12:59.133-07
uk74dsudpgd94faf3n	0ssd0gbfk5v59gf8kk	3t09dyzubc9zp	562jj60:0g	t	00:05:00	1969-12-31 17:12:59.133-07
uk74dsudpgd94faf3n	0ssd0gbfk5v59gf8kk	3unh7411ka0tz	562jj60:0g	t	00:05:00	1969-12-31 17:12:59.133-07
uk74dsudpgd94faf3n	0ssd0gbfk5v59gf8kk	817el2k23zdp	562jj60:0g	t	00:05:00	1969-12-31 17:12:59.133-07
uk74dsudpgd94faf3n	0ssd0gbfk5v59gf8kk	e2hz9kajle2s	562jj60:0g	t	00:05:00	1969-12-31 17:12:59.133-07
uk74dsudpgd94faf3n	t0j0qa1hsdr7mknl83	817el2k23zdp	562jj60:0h	t	00:05:00	1969-12-31 17:12:59.657-07
uk74dsudpgd94faf3n	t0j0qa1hsdr7mknl83	e2hz9kajle2s	562jj60:0h	t	00:05:00	1969-12-31 17:12:59.657-07
uk74dsudpgd94faf3n	2hdl687l575dt0vg1i	2g43j83a271g9	562jj60:0i	t	00:05:00	1969-12-31 17:13:08.647-07
uk74dsudpgd94faf3n	2hdl687l575dt0vg1i	3t09dyzubc9zp	562jj60:0i	t	00:05:00	1969-12-31 17:13:08.647-07
uk74dsudpgd94faf3n	2hdl687l575dt0vg1i	3unh7411ka0tz	562jj60:0i	t	00:05:00	1969-12-31 17:13:08.647-07
uk74dsudpgd94faf3n	2hdl687l575dt0vg1i	817el2k23zdp	562jj60:0i	t	00:05:00	1969-12-31 17:13:08.647-07
uk74dsudpgd94faf3n	2hdl687l575dt0vg1i	e2hz9kajle2s	562jj60:0i	t	00:05:00	1969-12-31 17:13:08.647-07
uk74dsudpgd94faf3n	laplgdmq4s8me6c1ua	2g43j83a271g9	562jj60:0j	t	00:05:00	1969-12-31 17:13:15.79-07
uk74dsudpgd94faf3n	laplgdmq4s8me6c1ua	3t09dyzubc9zp	562jj60:0j	t	00:05:00	1969-12-31 17:13:15.79-07
uk74dsudpgd94faf3n	laplgdmq4s8me6c1ua	3unh7411ka0tz	562jj60:0j	t	00:05:00	1969-12-31 17:13:15.79-07
uk74dsudpgd94faf3n	laplgdmq4s8me6c1ua	817el2k23zdp	562jj60:0j	t	00:05:00	1969-12-31 17:13:15.79-07
uk74dsudpgd94faf3n	laplgdmq4s8me6c1ua	e2hz9kajle2s	562jj60:0j	t	00:05:00	1969-12-31 17:13:15.79-07
uk74dsudpgd94faf3n	aciikvcpj777q734v5	2g43j83a271g9	562jj60:0k	t	00:05:00	1969-12-31 17:13:15.835-07
uk74dsudpgd94faf3n	aciikvcpj777q734v5	3t09dyzubc9zp	562jj60:0k	t	00:05:00	1969-12-31 17:13:15.835-07
uk74dsudpgd94faf3n	aciikvcpj777q734v5	3unh7411ka0tz	562jj60:0k	t	00:05:00	1969-12-31 17:13:15.835-07
uk74dsudpgd94faf3n	aciikvcpj777q734v5	817el2k23zdp	562jj60:0k	t	00:05:00	1969-12-31 17:13:15.835-07
uk74dsudpgd94faf3n	aciikvcpj777q734v5	e2hz9kajle2s	562jj60:0k	t	00:05:00	1969-12-31 17:13:15.835-07
uk74dsudpgd94faf3n	sj5oo6hqripmdb8og2	2g43j83a271g9	562jj60:0m	t	00:05:00	1969-12-31 17:13:31.724-07
uk74dsudpgd94faf3n	sj5oo6hqripmdb8og2	3t09dyzubc9zp	562jj60:0m	t	00:05:00	1969-12-31 17:13:31.724-07
uk74dsudpgd94faf3n	sj5oo6hqripmdb8og2	3unh7411ka0tz	562jj60:0m	t	00:05:00	1969-12-31 17:13:31.724-07
uk74dsudpgd94faf3n	sj5oo6hqripmdb8og2	817el2k23zdp	562jj60:0m	t	00:05:00	1969-12-31 17:13:31.724-07
uk74dsudpgd94faf3n	sj5oo6hqripmdb8og2	e2hz9kajle2s	562jj60:0m	t	00:05:00	1969-12-31 17:13:31.724-07
uk74dsudpgd94faf3n	qht7653bjrn2bf5knv	2g43j83a271g9	562jj60:0n	t	00:05:00	1969-12-31 17:13:37.961-07
uk74dsudpgd94faf3n	qht7653bjrn2bf5knv	3t09dyzubc9zp	562jj60:0n	t	00:05:00	1969-12-31 17:13:37.961-07
uk74dsudpgd94faf3n	qht7653bjrn2bf5knv	3unh7411ka0tz	562jj60:0n	t	00:05:00	1969-12-31 17:13:37.961-07
uk74dsudpgd94faf3n	qht7653bjrn2bf5knv	817el2k23zdp	562jj60:0n	t	00:05:00	1969-12-31 17:13:37.961-07
uk74dsudpgd94faf3n	qht7653bjrn2bf5knv	e2hz9kajle2s	562jj60:0n	t	00:05:00	1969-12-31 17:13:37.961-07
uk74dsudpgd94faf3n	bbijlprrcf04aisl4r	2g43j83a271g9	562jj60:0o	t	00:05:00	1969-12-31 17:13:38.11-07
uk74dsudpgd94faf3n	bbijlprrcf04aisl4r	3t09dyzubc9zp	562jj60:0o	t	00:05:00	1969-12-31 17:13:38.11-07
uk74dsudpgd94faf3n	bbijlprrcf04aisl4r	3unh7411ka0tz	562jj60:0o	t	00:05:00	1969-12-31 17:13:38.11-07
uk74dsudpgd94faf3n	bbijlprrcf04aisl4r	817el2k23zdp	562jj60:0o	t	00:05:00	1969-12-31 17:13:38.11-07
uk74dsudpgd94faf3n	bbijlprrcf04aisl4r	e2hz9kajle2s	562jj60:0o	t	00:05:00	1969-12-31 17:13:38.11-07
uk74dsudpgd94faf3n	jb2laih6753f577ab8	2g43j83a271g9	562jj60:0p	t	00:05:00	1969-12-31 17:13:46.512-07
uk74dsudpgd94faf3n	bm72r758qbsaroaqnn	2g43j83a271g9	562jj60:0q	t	00:05:00	1969-12-31 17:13:54.197-07
uk74dsudpgd94faf3n	bm72r758qbsaroaqnn	3t09dyzubc9zp	562jj60:0q	t	00:05:00	1969-12-31 17:13:54.197-07
uk74dsudpgd94faf3n	bm72r758qbsaroaqnn	3unh7411ka0tz	562jj60:0q	t	00:05:00	1969-12-31 17:13:54.197-07
uk74dsudpgd94faf3n	bm72r758qbsaroaqnn	817el2k23zdp	562jj60:0q	t	00:05:00	1969-12-31 17:13:54.197-07
88nh1g3umqn4ia48q0	no5jmk1qhpbvl8lmf8	2g43j83a271g9	56bncow:06	t	00:05:00	1969-12-31 17:16:55.471-07
uk74dsudpgd94faf3n	4dqmckj4i271sbi95i	2g43j83a271g9	562fnnc:01	t	00:05:00	1969-12-31 17:10:57.492-07
uk74dsudpgd94faf3n	9rj4o2rqssuonkuj0f	2g43j83a271g9	563o7s8:12x	t	00:05:00	1969-12-31 17:29:18.376-07
uk74dsudpgd94faf3n	9rj4o2rqssuonkuj0f	caqm13mxzbdr	563o7s8:12x	t	00:05:00	1969-12-31 17:29:18.376-07
uk74dsudpgd94faf3n	9rj4o2rqssuonkuj0f	2blc6xwom46ss	563o7s8:12x	t	00:05:00	1969-12-31 17:29:18.376-07
uk74dsudpgd94faf3n	9rj4o2rqssuonkuj0f	3se2qu476j7tg	563o7s8:12x	t	00:05:00	1969-12-31 17:29:18.376-07
88nh1g3umqn4ia48q0	no5jmk1qhpbvl8lmf8	3t09dyzubc9zp	56bncow:06	t	00:05:00	1969-12-31 17:16:55.471-07
88nh1g3umqn4ia48q0	no5jmk1qhpbvl8lmf8	3unh7411ka0tz	56bncow:06	t	00:05:00	1969-12-31 17:16:55.471-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	re8susfyu4m4	55oncwg:0j	t	00:05:00	1969-12-31 17:41:09.16-07
uk74dsudpgd94faf3n	5i9aqac79af041v00l	2g43j83a271g9	562fnnc:03	t	00:05:00	1969-12-31 17:11:09.829-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	i50mbufn38bb	55loqzs:02	t	00:05:00	1969-12-31 17:25:18.77-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	1057y377uomio	55oncwg:0j	t	00:05:00	1969-12-31 17:41:09.16-07
lananaqcj6js8htau4	mivq5mac14gbcp1b3k	2g43j83a271g9	55fy3mg:02	t	00:05:00	1969-12-31 17:08:40.875-07
lananaqcj6js8htau4	mivq5mac14gbcp1b3k	3t09dyzubc9zp	55fy3mg:02	t	00:05:00	1969-12-31 17:08:40.875-07
lananaqcj6js8htau4	mivq5mac14gbcp1b3k	3unh7411ka0tz	55fy3mg:02	t	00:05:00	1969-12-31 17:08:40.875-07
lananaqcj6js8htau4	mivq5mac14gbcp1b3k	817el2k23zdp	55fy3mg:02	t	00:05:00	1969-12-31 17:08:40.875-07
lananaqcj6js8htau4	hdrdmseolph8egshlg	817el2k23zdp	55fy3mg:03	t	00:05:00	1969-12-31 17:08:46.816-07
lananaqcj6js8htau4	kg5i2r7uvhe1k58r2a	2g43j83a271g9	55jiju0:01	t	00:05:00	1969-12-31 17:17:56.027-07
lananaqcj6js8htau4	kg5i2r7uvhe1k58r2a	gt8yfqbqc7ca	55jiju0:01	t	00:05:00	1969-12-31 17:17:56.027-07
lananaqcj6js8htau4	kg5i2r7uvhe1k58r2a	2blc6xwom46ss	55jiju0:01	t	00:05:00	1969-12-31 17:17:56.027-07
88nh1g3umqn4ia48q0	aed44i8ro2hq5gp1c3	2g43j83a271g9	56bncow:08	t	00:05:00	1969-12-31 17:17:04.413-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	37ysvekgvup14	55h4dzs:04	t	00:05:00	1969-12-31 17:14:06.559-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	1grmw7h98yohl	55h4dzs:04	t	00:05:00	1969-12-31 17:14:06.559-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	343u9rvx540f6	55h4dzs:04	t	00:05:00	1969-12-31 17:14:06.559-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	v6o0pjus1qzv	55h67bk:01	t	00:05:00	1969-12-31 17:14:11.61-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	3chlooy6k8yna	55h67bk:01	t	00:05:00	1969-12-31 17:14:11.61-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	2p7kal6uehti8	55h67bk:01	t	00:05:00	1969-12-31 17:14:11.61-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	3se2qu476j7tg	55h67bk:03	t	00:05:00	1969-12-31 17:14:14.6-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	caqm13mxzbdr	55h67bk:03	t	00:05:00	1969-12-31 17:14:14.6-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	817el2k23zdp	55h67bk:05	t	00:05:00	1969-12-31 17:14:18.63-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	2g43j83a271g9	55hb91k:05	t	00:05:00	1969-12-31 17:14:33.453-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	gt8yfqbqc7ca	55hb91k:05	t	00:05:00	1969-12-31 17:14:33.453-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	2blc6xwom46ss	55hb91k:05	t	00:05:00	1969-12-31 17:14:33.453-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	3rnpsi5qegpt3	55hb91k:05	t	00:05:00	1969-12-31 17:14:33.453-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	37ysvekgvup14	55hb91k:05	t	00:05:00	1969-12-31 17:14:33.453-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	1grmw7h98yohl	55hb91k:05	t	00:05:00	1969-12-31 17:14:33.453-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	343u9rvx540f6	55hb91k:05	t	00:05:00	1969-12-31 17:14:33.453-07
lananaqcj6js8htau4	pvmuh41b26msf331mr	15h1mxjr1phlc	55hb91k:0b	t	00:05:00	1969-12-31 17:14:57.089-07
lananaqcj6js8htau4	pvmuh41b26msf331mr	817el2k23zdp	55hb91k:0e	t	00:05:00	1969-12-31 17:15:06.104-07
lananaqcj6js8htau4	etr9iir1vq30srochj	2g43j83a271g9	55hb91k:0f	t	00:05:00	1969-12-31 17:15:14.034-07
lananaqcj6js8htau4	etr9iir1vq30srochj	gt8yfqbqc7ca	55hb91k:0f	t	00:05:00	1969-12-31 17:15:14.034-07
lananaqcj6js8htau4	etr9iir1vq30srochj	2blc6xwom46ss	55hb91k:0f	t	00:05:00	1969-12-31 17:15:14.034-07
lananaqcj6js8htau4	etr9iir1vq30srochj	3rnpsi5qegpt3	55hb91k:0f	t	00:05:00	1969-12-31 17:15:14.034-07
lananaqcj6js8htau4	etr9iir1vq30srochj	817el2k23zdp	55hb91k:0f	t	00:05:00	1969-12-31 17:15:14.034-07
lananaqcj6js8htau4	4mb17ktrdu5u1aptj1	2g43j83a271g9	55hb91k:0g	t	00:05:00	1969-12-31 17:15:20.081-07
lananaqcj6js8htau4	4mb17ktrdu5u1aptj1	gt8yfqbqc7ca	55hb91k:0g	t	00:05:00	1969-12-31 17:15:20.081-07
lananaqcj6js8htau4	4mb17ktrdu5u1aptj1	2blc6xwom46ss	55hb91k:0g	t	00:05:00	1969-12-31 17:15:20.081-07
lananaqcj6js8htau4	4mb17ktrdu5u1aptj1	3rnpsi5qegpt3	55hb91k:0g	t	00:05:00	1969-12-31 17:15:20.081-07
lananaqcj6js8htau4	4mb17ktrdu5u1aptj1	817el2k23zdp	55hb91k:0g	t	00:05:00	1969-12-31 17:15:20.081-07
lananaqcj6js8htau4	nldpgoo6pkgqnegh5v	817el2k23zdp	55hb91k:0i	t	00:05:00	1969-12-31 17:15:20.452-07
lananaqcj6js8htau4	nldpgoo6pkgqnegh5v	2g43j83a271g9	55hb91k:0j	t	00:05:00	1969-12-31 17:15:33.316-07
lananaqcj6js8htau4	nldpgoo6pkgqnegh5v	gt8yfqbqc7ca	55hb91k:0j	t	00:05:00	1969-12-31 17:15:33.316-07
lananaqcj6js8htau4	nldpgoo6pkgqnegh5v	2blc6xwom46ss	55hb91k:0j	t	00:05:00	1969-12-31 17:15:33.316-07
lananaqcj6js8htau4	nldpgoo6pkgqnegh5v	3rnpsi5qegpt3	55hb91k:0j	t	00:05:00	1969-12-31 17:15:33.316-07
lananaqcj6js8htau4	nldpgoo6pkgqnegh5v	37ysvekgvup14	55hb91k:0j	t	00:05:00	1969-12-31 17:15:33.316-07
lananaqcj6js8htau4	nldpgoo6pkgqnegh5v	1grmw7h98yohl	55hb91k:0j	t	00:05:00	1969-12-31 17:15:33.316-07
lananaqcj6js8htau4	nldpgoo6pkgqnegh5v	343u9rvx540f6	55hb91k:0j	t	00:05:00	1969-12-31 17:15:33.316-07
lananaqcj6js8htau4	4snodhil2u1getab18	1grmw7h98yohl	55hhs8g:01	t	00:05:00	1969-12-31 17:15:35.321-07
lananaqcj6js8htau4	4snodhil2u1getab18	2blc6xwom46ss	55hhs8g:01	t	00:05:00	1969-12-31 17:15:35.321-07
lananaqcj6js8htau4	4snodhil2u1getab18	2g43j83a271g9	55hhs8g:01	t	00:05:00	1969-12-31 17:15:35.321-07
lananaqcj6js8htau4	4snodhil2u1getab18	343u9rvx540f6	55hhs8g:01	t	00:05:00	1969-12-31 17:15:35.321-07
lananaqcj6js8htau4	4snodhil2u1getab18	37ysvekgvup14	55hhs8g:01	t	00:05:00	1969-12-31 17:15:35.321-07
lananaqcj6js8htau4	4snodhil2u1getab18	3rnpsi5qegpt3	55hhs8g:01	t	00:05:00	1969-12-31 17:15:35.321-07
lananaqcj6js8htau4	4snodhil2u1getab18	gt8yfqbqc7ca	55hhs8g:01	t	00:05:00	1969-12-31 17:15:35.321-07
lananaqcj6js8htau4	rpgsm6ukbpg8k608eg	15h1mxjr1phlc	55hhs8g:05	t	00:05:00	1969-12-31 17:15:37.488-07
lananaqcj6js8htau4	rpgsm6ukbpg8k608eg	1grmw7h98yohl	55hhs8g:08	t	00:05:00	1969-12-31 17:16:19.105-07
lananaqcj6js8htau4	rpgsm6ukbpg8k608eg	37ysvekgvup14	55hhs8g:08	t	00:05:00	1969-12-31 17:16:19.105-07
lananaqcj6js8htau4	rpgsm6ukbpg8k608eg	343u9rvx540f6	55hhs8g:08	t	00:05:00	1969-12-31 17:16:19.105-07
lananaqcj6js8htau4	rpgsm6ukbpg8k608eg	2g43j83a271g9	55hhs8g:09	t	00:05:00	1969-12-31 17:16:19.144-07
lananaqcj6js8htau4	rpgsm6ukbpg8k608eg	gt8yfqbqc7ca	55hhs8g:09	t	00:05:00	1969-12-31 17:16:19.144-07
lananaqcj6js8htau4	rpgsm6ukbpg8k608eg	2blc6xwom46ss	55hhs8g:09	t	00:05:00	1969-12-31 17:16:19.144-07
lananaqcj6js8htau4	rpgsm6ukbpg8k608eg	3rnpsi5qegpt3	55hhs8g:09	t	00:05:00	1969-12-31 17:16:19.144-07
lananaqcj6js8htau4	rpgsm6ukbpg8k608eg	817el2k23zdp	55hhs8g:09	t	00:05:00	1969-12-31 17:16:19.144-07
lananaqcj6js8htau4	eo76tps2hfn125qnqm	2blc6xwom46ss	55hhs8g:0b	t	00:05:00	1969-12-31 17:16:27.203-07
lananaqcj6js8htau4	4u93sla95qngpp0k6c	2g43j83a271g9	55htyxs:05	t	00:05:00	1969-12-31 17:16:43.621-07
lananaqcj6js8htau4	hdrdmseolph8egshlg	2g43j83a271g9	55fy3mg:03	t	00:05:00	1969-12-31 17:08:46.816-07
lananaqcj6js8htau4	hdrdmseolph8egshlg	3t09dyzubc9zp	55fy3mg:03	t	00:05:00	1969-12-31 17:08:46.816-07
lananaqcj6js8htau4	hdrdmseolph8egshlg	3unh7411ka0tz	55fy3mg:03	t	00:05:00	1969-12-31 17:08:46.816-07
88nh1g3umqn4ia48q0	1o8p9s5a43h1oh9eu6	2g43j83a271g9	56bncow:07	t	00:05:00	1969-12-31 17:16:56.27-07
88nh1g3umqn4ia48q0	1o8p9s5a43h1oh9eu6	3t09dyzubc9zp	56bncow:07	t	00:05:00	1969-12-31 17:16:56.27-07
88nh1g3umqn4ia48q0	1o8p9s5a43h1oh9eu6	3unh7411ka0tz	56bncow:07	t	00:05:00	1969-12-31 17:16:56.27-07
88nh1g3umqn4ia48q0	aed44i8ro2hq5gp1c3	3t09dyzubc9zp	56bncow:08	t	00:05:00	1969-12-31 17:17:04.413-07
88nh1g3umqn4ia48q0	aed44i8ro2hq5gp1c3	3unh7411ka0tz	56bncow:08	t	00:05:00	1969-12-31 17:17:04.413-07
88nh1g3umqn4ia48q0	sjpg1vhirjkki7vtee	2g43j83a271g9	56bncow:09	t	00:05:00	1969-12-31 17:17:04.431-07
88nh1g3umqn4ia48q0	sjpg1vhirjkki7vtee	3t09dyzubc9zp	56bncow:09	t	00:05:00	1969-12-31 17:17:04.431-07
88nh1g3umqn4ia48q0	sjpg1vhirjkki7vtee	3unh7411ka0tz	56bncow:09	t	00:05:00	1969-12-31 17:17:04.431-07
88nh1g3umqn4ia48q0	s4cii7b1scl3cloob5	2g43j83a271g9	56bncow:0c	t	00:05:00	1969-12-31 17:17:20.123-07
88nh1g3umqn4ia48q0	s4cii7b1scl3cloob5	3t09dyzubc9zp	56bncow:0c	t	00:05:00	1969-12-31 17:17:20.123-07
88nh1g3umqn4ia48q0	s4cii7b1scl3cloob5	3unh7411ka0tz	56bncow:0c	t	00:05:00	1969-12-31 17:17:20.123-07
88nh1g3umqn4ia48q0	rtjfstk968hi1dmb0e	2g43j83a271g9	56bncow:0d	t	00:05:00	1969-12-31 17:17:20.727-07
88nh1g3umqn4ia48q0	rtjfstk968hi1dmb0e	3t09dyzubc9zp	56bncow:0d	t	00:05:00	1969-12-31 17:17:20.727-07
88nh1g3umqn4ia48q0	rtjfstk968hi1dmb0e	3unh7411ka0tz	56bncow:0d	t	00:05:00	1969-12-31 17:17:20.727-07
88nh1g3umqn4ia48q0	rtjfstk968hi1dmb0e	817el2k23zdp	56bncow:0d	t	00:05:00	1969-12-31 17:17:20.727-07
88nh1g3umqn4ia48q0	fd4gqca5dr4phabv6c	2g43j83a271g9	56bncow:0e	t	00:05:00	1969-12-31 17:17:32.845-07
88nh1g3umqn4ia48q0	fd4gqca5dr4phabv6c	3t09dyzubc9zp	56bncow:0e	t	00:05:00	1969-12-31 17:17:32.845-07
88nh1g3umqn4ia48q0	fd4gqca5dr4phabv6c	3unh7411ka0tz	56bncow:0e	t	00:05:00	1969-12-31 17:17:32.845-07
88nh1g3umqn4ia48q0	fd4gqca5dr4phabv6c	817el2k23zdp	56bncow:0e	t	00:05:00	1969-12-31 17:17:32.845-07
lananaqcj6js8htau4	4i9cdc5iqn7oou61pv	caqm13mxzbdr	559ybag:05	t	00:05:00	1969-12-31 17:00:01.662-07
lananaqcj6js8htau4	4i9cdc5iqn7oou61pv	2g43j83a271g9	559ybag:06	t	00:05:00	1969-12-31 17:00:26.27-07
lananaqcj6js8htau4	4i9cdc5iqn7oou61pv	3t09dyzubc9zp	559ybag:06	t	00:05:00	1969-12-31 17:00:26.27-07
lananaqcj6js8htau4	4i9cdc5iqn7oou61pv	3unh7411ka0tz	559ybag:06	t	00:05:00	1969-12-31 17:00:26.27-07
lananaqcj6js8htau4	4i9cdc5iqn7oou61pv	817el2k23zdp	559ybag:06	t	00:05:00	1969-12-31 17:00:26.27-07
88nh1g3umqn4ia48q0	6gom6vjsvd94l2mhnt	2g43j83a271g9	56bncow:0f	t	00:05:00	1969-12-31 17:17:33.682-07
88nh1g3umqn4ia48q0	6gom6vjsvd94l2mhnt	3t09dyzubc9zp	56bncow:0f	t	00:05:00	1969-12-31 17:17:33.682-07
88nh1g3umqn4ia48q0	6gom6vjsvd94l2mhnt	3unh7411ka0tz	56bncow:0f	t	00:05:00	1969-12-31 17:17:33.682-07
88nh1g3umqn4ia48q0	6gom6vjsvd94l2mhnt	817el2k23zdp	56bncow:0f	t	00:05:00	1969-12-31 17:17:33.682-07
88nh1g3umqn4ia48q0	dq9ir58umjhje2vthb	2g43j83a271g9	56bncow:0g	t	00:05:00	1969-12-31 17:17:41.535-07
88nh1g3umqn4ia48q0	dq9ir58umjhje2vthb	3t09dyzubc9zp	56bncow:0g	t	00:05:00	1969-12-31 17:17:41.535-07
88nh1g3umqn4ia48q0	dq9ir58umjhje2vthb	3unh7411ka0tz	56bncow:0g	t	00:05:00	1969-12-31 17:17:41.535-07
88nh1g3umqn4ia48q0	dq9ir58umjhje2vthb	817el2k23zdp	56bncow:0g	t	00:05:00	1969-12-31 17:17:41.535-07
88nh1g3umqn4ia48q0	soinoj1rrjh03om0qh	2g43j83a271g9	56bncow:0h	t	00:05:00	1969-12-31 17:17:53.809-07
88nh1g3umqn4ia48q0	soinoj1rrjh03om0qh	3t09dyzubc9zp	56bncow:0h	t	00:05:00	1969-12-31 17:17:53.809-07
88nh1g3umqn4ia48q0	soinoj1rrjh03om0qh	3unh7411ka0tz	56bncow:0h	t	00:05:00	1969-12-31 17:17:53.809-07
88nh1g3umqn4ia48q0	soinoj1rrjh03om0qh	817el2k23zdp	56bncow:0h	t	00:05:00	1969-12-31 17:17:53.809-07
88nh1g3umqn4ia48q0	gmb3a5e3eq9hdln84s	2g43j83a271g9	56bncow:0i	t	00:05:00	1969-12-31 17:18:00.3-07
88nh1g3umqn4ia48q0	gmb3a5e3eq9hdln84s	3t09dyzubc9zp	56bncow:0i	t	00:05:00	1969-12-31 17:18:00.3-07
88nh1g3umqn4ia48q0	gmb3a5e3eq9hdln84s	3unh7411ka0tz	56bncow:0i	t	00:05:00	1969-12-31 17:18:00.3-07
88nh1g3umqn4ia48q0	gmb3a5e3eq9hdln84s	817el2k23zdp	56bncow:0i	t	00:05:00	1969-12-31 17:18:00.3-07
lananaqcj6js8htau4	s25ps44o0jabichjl1	2g43j83a271g9	559ybag:08	t	00:05:00	1969-12-31 17:00:31.163-07
lananaqcj6js8htau4	s25ps44o0jabichjl1	3t09dyzubc9zp	559ybag:08	t	00:05:00	1969-12-31 17:00:31.163-07
lananaqcj6js8htau4	s25ps44o0jabichjl1	3unh7411ka0tz	559ybag:08	t	00:05:00	1969-12-31 17:00:31.163-07
lananaqcj6js8htau4	s25ps44o0jabichjl1	817el2k23zdp	559ybag:08	t	00:05:00	1969-12-31 17:00:31.163-07
lananaqcj6js8htau4	rssq4eaqjju3a56gdr	2g43j83a271g9	55ar208:03	t	00:05:00	1969-12-31 17:00:46.492-07
lananaqcj6js8htau4	rssq4eaqjju3a56gdr	caqm13mxzbdr	55ar208:03	t	00:05:00	1969-12-31 17:00:46.492-07
lananaqcj6js8htau4	rssq4eaqjju3a56gdr	gt8yfqbqc7ca	55ar208:03	t	00:05:00	1969-12-31 17:00:46.492-07
lananaqcj6js8htau4	kg5i2r7uvhe1k58r2a	3rnpsi5qegpt3	55jiju0:01	t	00:05:00	1969-12-31 17:17:56.027-07
lananaqcj6js8htau4	kg5i2r7uvhe1k58r2a	3e5j0so81l0e9	55jiju0:01	t	00:05:00	1969-12-31 17:17:56.027-07
lananaqcj6js8htau4	kg5i2r7uvhe1k58r2a	nz4m5nccr9f8	55jiju0:01	t	00:05:00	1969-12-31 17:17:56.027-07
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	817el2k23zdp	55jrpug:05	t	00:05:00	1969-12-31 17:18:00.133-07
lananaqcj6js8htau4	rssq4eaqjju3a56gdr	2blc6xwom46ss	55ar208:03	t	00:05:00	1969-12-31 17:00:46.492-07
lananaqcj6js8htau4	rssq4eaqjju3a56gdr	3rnpsi5qegpt3	55ar208:03	t	00:05:00	1969-12-31 17:00:46.492-07
lananaqcj6js8htau4	rssq4eaqjju3a56gdr	3se2qu476j7tg	55ar208:03	t	00:05:00	1969-12-31 17:00:46.492-07
lananaqcj6js8htau4	rssq4eaqjju3a56gdr	817el2k23zdp	55ar208:03	t	00:05:00	1969-12-31 17:00:46.492-07
lananaqcj6js8htau4	e5430ajvhf2punji3a	2blc6xwom46ss	55ar208:04	t	00:05:00	1969-12-31 17:00:47.51-07
lananaqcj6js8htau4	e5430ajvhf2punji3a	2g43j83a271g9	55ar208:04	t	00:05:00	1969-12-31 17:00:47.51-07
lananaqcj6js8htau4	e5430ajvhf2punji3a	3rnpsi5qegpt3	55ar208:04	t	00:05:00	1969-12-31 17:00:47.51-07
lananaqcj6js8htau4	e5430ajvhf2punji3a	3se2qu476j7tg	55ar208:04	t	00:05:00	1969-12-31 17:00:47.51-07
lananaqcj6js8htau4	e5430ajvhf2punji3a	817el2k23zdp	55ar208:04	t	00:05:00	1969-12-31 17:00:47.51-07
lananaqcj6js8htau4	e5430ajvhf2punji3a	caqm13mxzbdr	55ar208:04	t	00:05:00	1969-12-31 17:00:47.51-07
lananaqcj6js8htau4	e5430ajvhf2punji3a	gt8yfqbqc7ca	55ar208:04	t	00:05:00	1969-12-31 17:00:47.51-07
lananaqcj6js8htau4	ddtob94avrr0pda83a	2blc6xwom46ss	55ar208:05	t	00:05:00	1969-12-31 17:00:53.388-07
lananaqcj6js8htau4	ddtob94avrr0pda83a	2g43j83a271g9	55ar208:05	t	00:05:00	1969-12-31 17:00:53.388-07
lananaqcj6js8htau4	ddtob94avrr0pda83a	3rnpsi5qegpt3	55ar208:05	t	00:05:00	1969-12-31 17:00:53.388-07
lananaqcj6js8htau4	ddtob94avrr0pda83a	3se2qu476j7tg	55ar208:05	t	00:05:00	1969-12-31 17:00:53.388-07
lananaqcj6js8htau4	ddtob94avrr0pda83a	817el2k23zdp	55ar208:05	t	00:05:00	1969-12-31 17:00:53.388-07
lananaqcj6js8htau4	ddtob94avrr0pda83a	caqm13mxzbdr	55ar208:05	t	00:05:00	1969-12-31 17:00:53.388-07
lananaqcj6js8htau4	ddtob94avrr0pda83a	gt8yfqbqc7ca	55ar208:05	t	00:05:00	1969-12-31 17:00:53.388-07
lananaqcj6js8htau4	ntcc0hsmgir4ok4mlj	2g43j83a271g9	55ar208:06	t	00:05:00	1969-12-31 17:00:54.817-07
lananaqcj6js8htau4	ntcc0hsmgir4ok4mlj	caqm13mxzbdr	55ar208:06	t	00:05:00	1969-12-31 17:00:54.817-07
lananaqcj6js8htau4	a1lolq6bak9285r8u3	2g43j83a271g9	55ar208:08	t	00:05:00	1969-12-31 17:01:11.559-07
lananaqcj6js8htau4	a1lolq6bak9285r8u3	caqm13mxzbdr	55ar208:08	t	00:05:00	1969-12-31 17:01:11.559-07
lananaqcj6js8htau4	q96b094bpnhm59iqhv	2g43j83a271g9	55ar208:0a	t	00:05:00	1969-12-31 17:01:14.238-07
lananaqcj6js8htau4	q96b094bpnhm59iqhv	caqm13mxzbdr	55ar208:0a	t	00:05:00	1969-12-31 17:01:14.238-07
lananaqcj6js8htau4	7rkrb2v190ai986hrr	2g43j83a271g9	55ar208:0b	t	00:05:00	1969-12-31 17:01:14.427-07
lananaqcj6js8htau4	7rkrb2v190ai986hrr	caqm13mxzbdr	55ar208:0b	t	00:05:00	1969-12-31 17:01:14.427-07
lananaqcj6js8htau4	791osm5vfi48k4605s	2g43j83a271g9	55ar208:0d	t	00:05:00	1969-12-31 17:01:21.509-07
lananaqcj6js8htau4	791osm5vfi48k4605s	caqm13mxzbdr	55ar208:0d	t	00:05:00	1969-12-31 17:01:21.509-07
lananaqcj6js8htau4	7hs6ns0aj3adjkct26	2g43j83a271g9	55ar208:0f	t	00:05:00	1969-12-31 17:01:24.956-07
lananaqcj6js8htau4	7hs6ns0aj3adjkct26	caqm13mxzbdr	55ar208:0f	t	00:05:00	1969-12-31 17:01:24.956-07
lananaqcj6js8htau4	6u6vuc5omihnqip3v5	2g43j83a271g9	55ar208:0h	t	00:05:00	1969-12-31 17:01:34.403-07
lananaqcj6js8htau4	6u6vuc5omihnqip3v5	caqm13mxzbdr	55ar208:0h	t	00:05:00	1969-12-31 17:01:34.403-07
lananaqcj6js8htau4	s7ggu0312ko18jm3am	2g43j83a271g9	55ar208:0i	t	00:05:00	1969-12-31 17:01:47.461-07
lananaqcj6js8htau4	s7ggu0312ko18jm3am	3t09dyzubc9zp	55ar208:0i	t	00:05:00	1969-12-31 17:01:47.461-07
lananaqcj6js8htau4	s7ggu0312ko18jm3am	3unh7411ka0tz	55ar208:0i	t	00:05:00	1969-12-31 17:01:47.461-07
lananaqcj6js8htau4	s7ggu0312ko18jm3am	817el2k23zdp	55ar208:0i	t	00:05:00	1969-12-31 17:01:47.461-07
lananaqcj6js8htau4	va5ja7m9tc8taggr6j	2g43j83a271g9	55ar208:0j	t	00:05:00	1969-12-31 17:01:48.952-07
lananaqcj6js8htau4	va5ja7m9tc8taggr6j	3t09dyzubc9zp	55ar208:0j	t	00:05:00	1969-12-31 17:01:48.952-07
lananaqcj6js8htau4	va5ja7m9tc8taggr6j	3unh7411ka0tz	55ar208:0j	t	00:05:00	1969-12-31 17:01:48.952-07
lananaqcj6js8htau4	va5ja7m9tc8taggr6j	817el2k23zdp	55ar208:0j	t	00:05:00	1969-12-31 17:01:48.952-07
lananaqcj6js8htau4	0gtpd64olt0htrcrd7	2g43j83a271g9	55ar208:0k	t	00:05:00	1969-12-31 17:01:49.918-07
lananaqcj6js8htau4	0gtpd64olt0htrcrd7	3t09dyzubc9zp	55ar208:0k	t	00:05:00	1969-12-31 17:01:49.918-07
lananaqcj6js8htau4	0gtpd64olt0htrcrd7	3unh7411ka0tz	55ar208:0k	t	00:05:00	1969-12-31 17:01:49.918-07
lananaqcj6js8htau4	0gtpd64olt0htrcrd7	817el2k23zdp	55ar208:0k	t	00:05:00	1969-12-31 17:01:49.918-07
lananaqcj6js8htau4	q53h1vmkt11vl1n97j	2g43j83a271g9	55ar208:0l	t	00:05:00	1969-12-31 17:01:52.351-07
lananaqcj6js8htau4	q53h1vmkt11vl1n97j	3t09dyzubc9zp	55ar208:0l	t	00:05:00	1969-12-31 17:01:52.351-07
lananaqcj6js8htau4	q53h1vmkt11vl1n97j	3unh7411ka0tz	55ar208:0l	t	00:05:00	1969-12-31 17:01:52.351-07
lananaqcj6js8htau4	q53h1vmkt11vl1n97j	817el2k23zdp	55ar208:0l	t	00:05:00	1969-12-31 17:01:52.351-07
lananaqcj6js8htau4	j9qdd2duc6sj9vebkd	817el2k23zdp	55ar208:0o	t	00:05:00	1969-12-31 17:01:54.881-07
lananaqcj6js8htau4	j9qdd2duc6sj9vebkd	3t09dyzubc9zp	55ar208:0o	t	00:05:00	1969-12-31 17:01:54.881-07
lananaqcj6js8htau4	j9qdd2duc6sj9vebkd	3unh7411ka0tz	55ar208:0o	t	00:05:00	1969-12-31 17:01:54.881-07
lananaqcj6js8htau4	j9qdd2duc6sj9vebkd	2g43j83a271g9	55ar208:0p	t	00:05:00	1969-12-31 17:01:57.166-07
lananaqcj6js8htau4	j9qdd2duc6sj9vebkd	caqm13mxzbdr	55ar208:0p	t	00:05:00	1969-12-31 17:01:57.166-07
lananaqcj6js8htau4	mjfqa1faco3irrou1c	2g43j83a271g9	55ar208:0s	t	00:05:00	1969-12-31 17:02:16.817-07
lananaqcj6js8htau4	mjfqa1faco3irrou1c	caqm13mxzbdr	55ar208:0s	t	00:05:00	1969-12-31 17:02:16.817-07
lananaqcj6js8htau4	mjfqa1faco3irrou1c	3t09dyzubc9zp	55ar208:0s	t	00:05:00	1969-12-31 17:02:16.817-07
lananaqcj6js8htau4	mjfqa1faco3irrou1c	3unh7411ka0tz	55ar208:0s	t	00:05:00	1969-12-31 17:02:16.817-07
lananaqcj6js8htau4	mjfqa1faco3irrou1c	817el2k23zdp	55ar208:0s	t	00:05:00	1969-12-31 17:02:16.817-07
lananaqcj6js8htau4	19curdj612c60qbinv	2g43j83a271g9	55ar208:0t	t	00:05:00	1969-12-31 17:02:18.903-07
lananaqcj6js8htau4	19curdj612c60qbinv	3t09dyzubc9zp	55ar208:0t	t	00:05:00	1969-12-31 17:02:18.903-07
lananaqcj6js8htau4	19curdj612c60qbinv	3unh7411ka0tz	55ar208:0t	t	00:05:00	1969-12-31 17:02:18.903-07
lananaqcj6js8htau4	19curdj612c60qbinv	817el2k23zdp	55ar208:0t	t	00:05:00	1969-12-31 17:02:18.903-07
lananaqcj6js8htau4	94pc1iso9m54fuh0uh	2g43j83a271g9	55ar208:0v	t	00:05:00	1969-12-31 17:02:29.142-07
lananaqcj6js8htau4	94pc1iso9m54fuh0uh	3t09dyzubc9zp	55ar208:0v	t	00:05:00	1969-12-31 17:02:29.142-07
lananaqcj6js8htau4	66n997q0omm3c7mg1i	2g43j83a271g9	55g2beg:01	t	00:05:00	1969-12-31 17:09:25.397-07
lananaqcj6js8htau4	66n997q0omm3c7mg1i	3t09dyzubc9zp	55g2beg:01	t	00:05:00	1969-12-31 17:09:25.397-07
lananaqcj6js8htau4	66n997q0omm3c7mg1i	3unh7411ka0tz	55g2beg:01	t	00:05:00	1969-12-31 17:09:25.397-07
lananaqcj6js8htau4	66n997q0omm3c7mg1i	817el2k23zdp	55g2beg:01	t	00:05:00	1969-12-31 17:09:25.397-07
lananaqcj6js8htau4	94pc1iso9m54fuh0uh	3unh7411ka0tz	55ar208:0v	t	00:05:00	1969-12-31 17:02:29.142-07
lananaqcj6js8htau4	94pc1iso9m54fuh0uh	817el2k23zdp	55ar208:0v	t	00:05:00	1969-12-31 17:02:29.142-07
lananaqcj6js8htau4	dut7uiapsve3nlcafe	2g43j83a271g9	55ar208:0w	t	00:05:00	1969-12-31 17:02:37.371-07
lananaqcj6js8htau4	dut7uiapsve3nlcafe	3t09dyzubc9zp	55ar208:0w	t	00:05:00	1969-12-31 17:02:37.371-07
lananaqcj6js8htau4	dut7uiapsve3nlcafe	3unh7411ka0tz	55ar208:0w	t	00:05:00	1969-12-31 17:02:37.371-07
lananaqcj6js8htau4	dut7uiapsve3nlcafe	817el2k23zdp	55ar208:0w	t	00:05:00	1969-12-31 17:02:37.371-07
lananaqcj6js8htau4	952b4690knudbmit1l	2g43j83a271g9	55oncwg:0v	t	00:05:00	1969-12-31 17:42:07.203-07
lananaqcj6js8htau4	q6nn4anq1ollumgndb	2g43j83a271g9	55gew7s:01	t	00:05:00	1969-12-31 17:10:13.54-07
lananaqcj6js8htau4	q6nn4anq1ollumgndb	3t09dyzubc9zp	55gew7s:01	t	00:05:00	1969-12-31 17:10:13.54-07
lananaqcj6js8htau4	m3pkucn32nfnh8vgc6	2g43j83a271g9	55cnqg8:01	t	00:05:00	1969-12-31 17:04:10.148-07
lananaqcj6js8htau4	m3pkucn32nfnh8vgc6	3t09dyzubc9zp	55cnqg8:01	t	00:05:00	1969-12-31 17:04:10.148-07
lananaqcj6js8htau4	m3pkucn32nfnh8vgc6	3unh7411ka0tz	55cnqg8:01	t	00:05:00	1969-12-31 17:04:10.148-07
lananaqcj6js8htau4	m3pkucn32nfnh8vgc6	817el2k23zdp	55cnqg8:01	t	00:05:00	1969-12-31 17:04:10.148-07
lananaqcj6js8htau4	q6nn4anq1ollumgndb	3unh7411ka0tz	55gew7s:01	t	00:05:00	1969-12-31 17:10:13.54-07
lananaqcj6js8htau4	q6nn4anq1ollumgndb	817el2k23zdp	55gew7s:01	t	00:05:00	1969-12-31 17:10:13.54-07
lananaqcj6js8htau4	0rre3j1oar5lpgj3kn	2g43j83a271g9	55gew7s:02	t	00:05:00	1969-12-31 17:10:38.535-07
lananaqcj6js8htau4	0rre3j1oar5lpgj3kn	3t09dyzubc9zp	55gew7s:02	t	00:05:00	1969-12-31 17:10:38.535-07
lananaqcj6js8htau4	0rre3j1oar5lpgj3kn	3unh7411ka0tz	55gew7s:02	t	00:05:00	1969-12-31 17:10:38.535-07
lananaqcj6js8htau4	0rre3j1oar5lpgj3kn	817el2k23zdp	55gew7s:02	t	00:05:00	1969-12-31 17:10:38.535-07
lananaqcj6js8htau4	5gdpnnqrevlv8t0pnn	3t09dyzubc9zp	55dbv7k:03	t	00:05:00	1969-12-31 17:04:52.933-07
lananaqcj6js8htau4	5gdpnnqrevlv8t0pnn	3unh7411ka0tz	55dbv7k:03	t	00:05:00	1969-12-31 17:04:52.933-07
lananaqcj6js8htau4	5gdpnnqrevlv8t0pnn	817el2k23zdp	55dbv7k:03	t	00:05:00	1969-12-31 17:04:52.933-07
lananaqcj6js8htau4	t2p96iu4rd3gcl72kr	2g43j83a271g9	55dumkw:01	t	00:05:00	1969-12-31 17:05:09.733-07
lananaqcj6js8htau4	t2p96iu4rd3gcl72kr	3t09dyzubc9zp	55dumkw:01	t	00:05:00	1969-12-31 17:05:09.733-07
lananaqcj6js8htau4	t2p96iu4rd3gcl72kr	3unh7411ka0tz	55dumkw:01	t	00:05:00	1969-12-31 17:05:09.733-07
lananaqcj6js8htau4	t2p96iu4rd3gcl72kr	817el2k23zdp	55dumkw:01	t	00:05:00	1969-12-31 17:05:09.733-07
lananaqcj6js8htau4	l6f9g82d2p612bqh0u	15h1mxjr1phlc	55hb91k:04	t	00:05:00	1969-12-31 17:14:30.6-07
lananaqcj6js8htau4	v2dtlalj5c3l67l6fa	3t09dyzubc9zp	55dumkw:03	t	00:05:00	1969-12-31 17:05:12.553-07
lananaqcj6js8htau4	v2dtlalj5c3l67l6fa	3unh7411ka0tz	55dumkw:03	t	00:05:00	1969-12-31 17:05:12.553-07
lananaqcj6js8htau4	v2dtlalj5c3l67l6fa	817el2k23zdp	55dumkw:03	t	00:05:00	1969-12-31 17:05:12.553-07
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	2g43j83a271g9	55ju828:06	t	00:05:00	1969-12-31 17:18:13.011-07
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	gt8yfqbqc7ca	55ju828:06	t	00:05:00	1969-12-31 17:18:13.011-07
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	2blc6xwom46ss	55ju828:06	t	00:05:00	1969-12-31 17:18:13.011-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	caqm13mxzbdr	55loqzs:03	t	00:05:00	1969-12-31 17:25:24.406-07
lananaqcj6js8htau4	jgetc06dpmmbqdprfq	2g43j83a271g9	55hhs8g:0a	t	00:05:00	1969-12-31 17:16:26.176-07
lananaqcj6js8htau4	jgetc06dpmmbqdprfq	gt8yfqbqc7ca	55hhs8g:0a	t	00:05:00	1969-12-31 17:16:26.176-07
lananaqcj6js8htau4	jgetc06dpmmbqdprfq	2blc6xwom46ss	55hhs8g:0a	t	00:05:00	1969-12-31 17:16:26.176-07
lananaqcj6js8htau4	jgetc06dpmmbqdprfq	3rnpsi5qegpt3	55hhs8g:0a	t	00:05:00	1969-12-31 17:16:26.176-07
lananaqcj6js8htau4	jgetc06dpmmbqdprfq	817el2k23zdp	55hhs8g:0a	t	00:05:00	1969-12-31 17:16:26.176-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	817el2k23zdp	55loqzs:03	t	00:05:00	1969-12-31 17:25:24.406-07
lananaqcj6js8htau4	eo76tps2hfn125qnqm	2g43j83a271g9	55hhs8g:0b	t	00:05:00	1969-12-31 17:16:27.203-07
lananaqcj6js8htau4	eo76tps2hfn125qnqm	3rnpsi5qegpt3	55hhs8g:0b	t	00:05:00	1969-12-31 17:16:27.203-07
lananaqcj6js8htau4	eo76tps2hfn125qnqm	817el2k23zdp	55hhs8g:0b	t	00:05:00	1969-12-31 17:16:27.203-07
lananaqcj6js8htau4	eo76tps2hfn125qnqm	gt8yfqbqc7ca	55hhs8g:0b	t	00:05:00	1969-12-31 17:16:27.203-07
lananaqcj6js8htau4	v9jlcbn6mdlsfr6a0v	2blc6xwom46ss	55hhs8g:0c	t	00:05:00	1969-12-31 17:16:27.529-07
lananaqcj6js8htau4	v9jlcbn6mdlsfr6a0v	2g43j83a271g9	55hhs8g:0c	t	00:05:00	1969-12-31 17:16:27.529-07
lananaqcj6js8htau4	v9jlcbn6mdlsfr6a0v	3rnpsi5qegpt3	55hhs8g:0c	t	00:05:00	1969-12-31 17:16:27.529-07
lananaqcj6js8htau4	v9jlcbn6mdlsfr6a0v	817el2k23zdp	55hhs8g:0c	t	00:05:00	1969-12-31 17:16:27.529-07
lananaqcj6js8htau4	v9jlcbn6mdlsfr6a0v	gt8yfqbqc7ca	55hhs8g:0c	t	00:05:00	1969-12-31 17:16:27.529-07
lananaqcj6js8htau4	4u93sla95qngpp0k6c	817el2k23zdp	55hhs8g:0f	t	00:05:00	1969-12-31 17:16:28.549-07
lananaqcj6js8htau4	4u93sla95qngpp0k6c	15h1mxjr1phlc	55htyxs:04	t	00:05:00	1969-12-31 17:16:34.616-07
lananaqcj6js8htau4	4u93sla95qngpp0k6c	gt8yfqbqc7ca	55htyxs:05	t	00:05:00	1969-12-31 17:16:43.621-07
lananaqcj6js8htau4	4u93sla95qngpp0k6c	2blc6xwom46ss	55htyxs:05	t	00:05:00	1969-12-31 17:16:43.621-07
lananaqcj6js8htau4	4u93sla95qngpp0k6c	3rnpsi5qegpt3	55htyxs:05	t	00:05:00	1969-12-31 17:16:43.621-07
lananaqcj6js8htau4	4u93sla95qngpp0k6c	37ysvekgvup14	55htyxs:05	t	00:05:00	1969-12-31 17:16:43.621-07
lananaqcj6js8htau4	4u93sla95qngpp0k6c	1grmw7h98yohl	55htyxs:05	t	00:05:00	1969-12-31 17:16:43.621-07
lananaqcj6js8htau4	4u93sla95qngpp0k6c	343u9rvx540f6	55htyxs:05	t	00:05:00	1969-12-31 17:16:43.621-07
lananaqcj6js8htau4	55itlc0hsfk3b2dtvs	2g43j83a271g9	55htyxs:06	t	00:05:00	1969-12-31 17:16:50.109-07
lananaqcj6js8htau4	hq92relec7ocfd20f4	2g43j83a271g9	55htyxs:07	t	00:05:00	1969-12-31 17:16:50.111-07
lananaqcj6js8htau4	hq92relec7ocfd20f4	gt8yfqbqc7ca	55htyxs:07	t	00:05:00	1969-12-31 17:16:50.111-07
lananaqcj6js8htau4	hq92relec7ocfd20f4	2blc6xwom46ss	55htyxs:07	t	00:05:00	1969-12-31 17:16:50.111-07
lananaqcj6js8htau4	hq92relec7ocfd20f4	3rnpsi5qegpt3	55htyxs:07	t	00:05:00	1969-12-31 17:16:50.111-07
lananaqcj6js8htau4	hq92relec7ocfd20f4	37ysvekgvup14	55htyxs:07	t	00:05:00	1969-12-31 17:16:50.111-07
lananaqcj6js8htau4	hq92relec7ocfd20f4	1grmw7h98yohl	55htyxs:07	t	00:05:00	1969-12-31 17:16:50.111-07
lananaqcj6js8htau4	1f2q6kfet6fg4ovdvc	2blc6xwom46ss	55jrpug:01	t	00:05:00	1969-12-31 17:17:57.358-07
lananaqcj6js8htau4	1f2q6kfet6fg4ovdvc	2g43j83a271g9	55jrpug:01	t	00:05:00	1969-12-31 17:17:57.358-07
lananaqcj6js8htau4	1f2q6kfet6fg4ovdvc	343u9rvx540f6	55jrpug:01	t	00:05:00	1969-12-31 17:17:57.358-07
lananaqcj6js8htau4	1f2q6kfet6fg4ovdvc	3e5j0so81l0e9	55jrpug:01	t	00:05:00	1969-12-31 17:17:57.358-07
lananaqcj6js8htau4	8nn7eg1gh0vlt8335e	2g43j83a271g9	55ar208:0x	t	00:05:00	1969-12-31 17:03:07.135-07
lananaqcj6js8htau4	8nn7eg1gh0vlt8335e	3t09dyzubc9zp	55ar208:0x	t	00:05:00	1969-12-31 17:03:07.135-07
lananaqcj6js8htau4	8nn7eg1gh0vlt8335e	3unh7411ka0tz	55ar208:0x	t	00:05:00	1969-12-31 17:03:07.135-07
lananaqcj6js8htau4	8nn7eg1gh0vlt8335e	817el2k23zdp	55ar208:0x	t	00:05:00	1969-12-31 17:03:07.135-07
lananaqcj6js8htau4	u15o02hfp1c5i5m1tt	2g43j83a271g9	55ar208:0y	t	00:05:00	1969-12-31 17:03:07.384-07
lananaqcj6js8htau4	u15o02hfp1c5i5m1tt	3t09dyzubc9zp	55ar208:0y	t	00:05:00	1969-12-31 17:03:07.384-07
lananaqcj6js8htau4	u15o02hfp1c5i5m1tt	3unh7411ka0tz	55ar208:0y	t	00:05:00	1969-12-31 17:03:07.384-07
lananaqcj6js8htau4	u15o02hfp1c5i5m1tt	817el2k23zdp	55ar208:0y	t	00:05:00	1969-12-31 17:03:07.384-07
lananaqcj6js8htau4	1f2q6kfet6fg4ovdvc	3rnpsi5qegpt3	55jrpug:01	t	00:05:00	1969-12-31 17:17:57.358-07
lananaqcj6js8htau4	1f2q6kfet6fg4ovdvc	gt8yfqbqc7ca	55jrpug:01	t	00:05:00	1969-12-31 17:17:57.358-07
lananaqcj6js8htau4	csh9uelgnl93ib9pdm	2g43j83a271g9	55ar208:111	t	00:05:00	1969-12-31 17:03:18.864-07
lananaqcj6js8htau4	csh9uelgnl93ib9pdm	3t09dyzubc9zp	55ar208:111	t	00:05:00	1969-12-31 17:03:18.864-07
lananaqcj6js8htau4	csh9uelgnl93ib9pdm	3unh7411ka0tz	55ar208:111	t	00:05:00	1969-12-31 17:03:18.864-07
lananaqcj6js8htau4	csh9uelgnl93ib9pdm	817el2k23zdp	55ar208:111	t	00:05:00	1969-12-31 17:03:18.864-07
lananaqcj6js8htau4	0qkfjr0hdsjsfmli9e	2g43j83a271g9	55gew7s:03	t	00:05:00	1969-12-31 17:10:39.588-07
lananaqcj6js8htau4	0qkfjr0hdsjsfmli9e	3t09dyzubc9zp	55gew7s:03	t	00:05:00	1969-12-31 17:10:39.588-07
lananaqcj6js8htau4	0qkfjr0hdsjsfmli9e	3unh7411ka0tz	55gew7s:03	t	00:05:00	1969-12-31 17:10:39.588-07
lananaqcj6js8htau4	0qkfjr0hdsjsfmli9e	817el2k23zdp	55gew7s:03	t	00:05:00	1969-12-31 17:10:39.588-07
lananaqcj6js8htau4	21r9jku31bccs5dh2l	2g43j83a271g9	55gob9k:01	t	00:05:00	1969-12-31 17:11:08.514-07
lananaqcj6js8htau4	21r9jku31bccs5dh2l	3t09dyzubc9zp	55gob9k:01	t	00:05:00	1969-12-31 17:11:08.514-07
lananaqcj6js8htau4	21r9jku31bccs5dh2l	3unh7411ka0tz	55gob9k:01	t	00:05:00	1969-12-31 17:11:08.514-07
lananaqcj6js8htau4	21r9jku31bccs5dh2l	817el2k23zdp	55gob9k:01	t	00:05:00	1969-12-31 17:11:08.514-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	3t09dyzubc9zp	55gob9k:04	t	00:05:00	1969-12-31 17:11:09.327-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	3unh7411ka0tz	55gob9k:04	t	00:05:00	1969-12-31 17:11:09.327-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	3se2qu476j7tg	55gob9k:07	t	00:05:00	1969-12-31 17:11:10.737-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	caqm13mxzbdr	55gob9k:07	t	00:05:00	1969-12-31 17:11:10.737-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	817el2k23zdp	55gob9k:07	t	00:05:00	1969-12-31 17:11:10.737-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	2g43j83a271g9	55gob9k:08	t	00:05:00	1969-12-31 17:11:13.786-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	gt8yfqbqc7ca	55gob9k:08	t	00:05:00	1969-12-31 17:11:13.786-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	2blc6xwom46ss	55gob9k:08	t	00:05:00	1969-12-31 17:11:13.786-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	3rnpsi5qegpt3	55gob9k:08	t	00:05:00	1969-12-31 17:11:13.786-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	3panrcehejw2b	55gob9k:08	t	00:05:00	1969-12-31 17:11:13.786-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	2a3fejmu1ysvb	55gob9k:08	t	00:05:00	1969-12-31 17:11:13.786-07
lananaqcj6js8htau4	19vi8rp98vjbes9voh	343u9rvx540f6	55gob9k:08	t	00:05:00	1969-12-31 17:11:13.786-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	2p7kal6uehti8	55gob9k:0d	t	00:05:00	1969-12-31 17:11:23.577-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	3chlooy6k8yna	55gob9k:0d	t	00:05:00	1969-12-31 17:11:23.577-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	3panrcehejw2b	55gob9k:0f	t	00:05:00	1969-12-31 17:11:24.494-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	2a3fejmu1ysvb	55gob9k:0f	t	00:05:00	1969-12-31 17:11:24.494-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	343u9rvx540f6	55gob9k:0f	t	00:05:00	1969-12-31 17:11:24.494-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	2g43j83a271g9	55gob9k:0g	t	00:05:00	1969-12-31 17:11:26.777-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	gt8yfqbqc7ca	55gob9k:0g	t	00:05:00	1969-12-31 17:11:26.777-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	2blc6xwom46ss	55gob9k:0g	t	00:05:00	1969-12-31 17:11:26.777-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	3rnpsi5qegpt3	55gob9k:0g	t	00:05:00	1969-12-31 17:11:26.777-07
lananaqcj6js8htau4	1n7hiu9mrirg87ri11	2g43j83a271g9	55hb91k:06	t	00:05:00	1969-12-31 17:14:41.21-07
lananaqcj6js8htau4	1n7hiu9mrirg87ri11	gt8yfqbqc7ca	55hb91k:06	t	00:05:00	1969-12-31 17:14:41.21-07
lananaqcj6js8htau4	1n7hiu9mrirg87ri11	2blc6xwom46ss	55hb91k:06	t	00:05:00	1969-12-31 17:14:41.21-07
lananaqcj6js8htau4	1n7hiu9mrirg87ri11	3rnpsi5qegpt3	55hb91k:06	t	00:05:00	1969-12-31 17:14:41.21-07
lananaqcj6js8htau4	1n7hiu9mrirg87ri11	37ysvekgvup14	55hb91k:06	t	00:05:00	1969-12-31 17:14:41.21-07
lananaqcj6js8htau4	1n7hiu9mrirg87ri11	1grmw7h98yohl	55hb91k:06	t	00:05:00	1969-12-31 17:14:41.21-07
lananaqcj6js8htau4	1n7hiu9mrirg87ri11	343u9rvx540f6	55hb91k:06	t	00:05:00	1969-12-31 17:14:41.21-07
lananaqcj6js8htau4	pgs62g6idn547prrnv	1grmw7h98yohl	55hb91k:07	t	00:05:00	1969-12-31 17:14:42.345-07
lananaqcj6js8htau4	pgs62g6idn547prrnv	2blc6xwom46ss	55hb91k:07	t	00:05:00	1969-12-31 17:14:42.345-07
lananaqcj6js8htau4	pgs62g6idn547prrnv	2g43j83a271g9	55hb91k:07	t	00:05:00	1969-12-31 17:14:42.345-07
lananaqcj6js8htau4	pgs62g6idn547prrnv	343u9rvx540f6	55hb91k:07	t	00:05:00	1969-12-31 17:14:42.345-07
lananaqcj6js8htau4	pgs62g6idn547prrnv	37ysvekgvup14	55hb91k:07	t	00:05:00	1969-12-31 17:14:42.345-07
lananaqcj6js8htau4	pgs62g6idn547prrnv	3rnpsi5qegpt3	55hb91k:07	t	00:05:00	1969-12-31 17:14:42.345-07
lananaqcj6js8htau4	pgs62g6idn547prrnv	gt8yfqbqc7ca	55hb91k:07	t	00:05:00	1969-12-31 17:14:42.345-07
lananaqcj6js8htau4	pvmuh41b26msf331mr	1grmw7h98yohl	55hb91k:0d	t	00:05:00	1969-12-31 17:14:57.693-07
lananaqcj6js8htau4	pvmuh41b26msf331mr	37ysvekgvup14	55hb91k:0d	t	00:05:00	1969-12-31 17:14:57.693-07
lananaqcj6js8htau4	pvmuh41b26msf331mr	343u9rvx540f6	55hb91k:0d	t	00:05:00	1969-12-31 17:14:57.693-07
lananaqcj6js8htau4	pvmuh41b26msf331mr	2g43j83a271g9	55hb91k:0e	t	00:05:00	1969-12-31 17:15:06.104-07
lananaqcj6js8htau4	pvmuh41b26msf331mr	gt8yfqbqc7ca	55hb91k:0e	t	00:05:00	1969-12-31 17:15:06.104-07
lananaqcj6js8htau4	pvmuh41b26msf331mr	2blc6xwom46ss	55hb91k:0e	t	00:05:00	1969-12-31 17:15:06.104-07
lananaqcj6js8htau4	pvmuh41b26msf331mr	3rnpsi5qegpt3	55hb91k:0e	t	00:05:00	1969-12-31 17:15:06.104-07
lananaqcj6js8htau4	1f2q6kfet6fg4ovdvc	nz4m5nccr9f8	55jrpug:01	t	00:05:00	1969-12-31 17:17:57.358-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	3panrcehejw2b	55leiu0:07	t	00:05:00	1969-12-31 17:25:08.72-07
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	2m5c2t3mg17an	55ju828:05	t	00:05:00	1969-12-31 17:18:10.382-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	2a3fejmu1ysvb	55leiu0:07	t	00:05:00	1969-12-31 17:25:08.72-07
lananaqcj6js8htau4	cv5mf01aael294cc4e	2g43j83a271g9	55ar208:0z	t	00:05:00	1969-12-31 17:03:07.506-07
lananaqcj6js8htau4	cv5mf01aael294cc4e	3t09dyzubc9zp	55ar208:0z	t	00:05:00	1969-12-31 17:03:07.506-07
lananaqcj6js8htau4	cv5mf01aael294cc4e	3unh7411ka0tz	55ar208:0z	t	00:05:00	1969-12-31 17:03:07.506-07
lananaqcj6js8htau4	cv5mf01aael294cc4e	817el2k23zdp	55ar208:0z	t	00:05:00	1969-12-31 17:03:07.506-07
lananaqcj6js8htau4	823j6noa155stqnjnc	3t09dyzubc9zp	55s721c:0j	t	00:05:00	1969-12-31 18:03:35.232-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	1h040veoau8up	55leiu0:07	t	00:05:00	1969-12-31 17:25:08.72-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	3se2qu476j7tg	55gob9k:0g	t	00:05:00	1969-12-31 17:11:26.777-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	caqm13mxzbdr	55gob9k:0g	t	00:05:00	1969-12-31 17:11:26.777-07
lananaqcj6js8htau4	lf8iv48hcaf1g6lsbc	817el2k23zdp	55gob9k:0g	t	00:05:00	1969-12-31 17:11:26.777-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	2p7kal6uehti8	55gvsjk:02	t	00:05:00	1969-12-31 17:11:47.17-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	3chlooy6k8yna	55gvsjk:02	t	00:05:00	1969-12-31 17:11:47.17-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	343u9rvx540f6	55gvsjk:02	t	00:05:00	1969-12-31 17:11:47.17-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	2g43j83a271g9	55gvsjk:03	t	00:05:00	1969-12-31 17:11:49.069-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	gt8yfqbqc7ca	55gvsjk:03	t	00:05:00	1969-12-31 17:11:49.069-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	2blc6xwom46ss	55gvsjk:03	t	00:05:00	1969-12-31 17:11:49.069-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	3rnpsi5qegpt3	55gvsjk:03	t	00:05:00	1969-12-31 17:11:49.069-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	3se2qu476j7tg	55gvsjk:03	t	00:05:00	1969-12-31 17:11:49.069-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	caqm13mxzbdr	55gvsjk:03	t	00:05:00	1969-12-31 17:11:49.069-07
lananaqcj6js8htau4	7u971bioer1kd6qsmv	817el2k23zdp	55gvsjk:03	t	00:05:00	1969-12-31 17:11:49.069-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	2p7kal6uehti8	55gvsjk:08	t	00:05:00	1969-12-31 17:11:56.606-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	3chlooy6k8yna	55gvsjk:08	t	00:05:00	1969-12-31 17:11:56.606-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	3panrcehejw2b	55gvsjk:0c	t	00:05:00	1969-12-31 17:12:00.216-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	2a3fejmu1ysvb	55gvsjk:0c	t	00:05:00	1969-12-31 17:12:00.216-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	343u9rvx540f6	55gvsjk:0c	t	00:05:00	1969-12-31 17:12:00.216-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	2g43j83a271g9	55gvsjk:0d	t	00:05:00	1969-12-31 17:12:40.437-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	gt8yfqbqc7ca	55gvsjk:0d	t	00:05:00	1969-12-31 17:12:40.437-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	2blc6xwom46ss	55gvsjk:0d	t	00:05:00	1969-12-31 17:12:40.437-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	3rnpsi5qegpt3	55gvsjk:0d	t	00:05:00	1969-12-31 17:12:40.437-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	3se2qu476j7tg	55gvsjk:0d	t	00:05:00	1969-12-31 17:12:40.437-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	caqm13mxzbdr	55gvsjk:0d	t	00:05:00	1969-12-31 17:12:40.437-07
lananaqcj6js8htau4	rt2tvhvmj0dkme39d0	817el2k23zdp	55gvsjk:0d	t	00:05:00	1969-12-31 17:12:40.437-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	3se2qu476j7tg	55gvsjk:0f	t	00:05:00	1969-12-31 17:13:14.038-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	caqm13mxzbdr	55gvsjk:0f	t	00:05:00	1969-12-31 17:13:14.038-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	817el2k23zdp	55gvsjk:0f	t	00:05:00	1969-12-31 17:13:14.038-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	v6o0pjus1qzv	55gvsjk:0k	t	00:05:00	1969-12-31 17:13:17.863-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	2g43j83a271g9	55gvsjk:0l	t	00:05:00	1969-12-31 17:13:26.233-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	gt8yfqbqc7ca	55gvsjk:0l	t	00:05:00	1969-12-31 17:13:26.233-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	2blc6xwom46ss	55gvsjk:0l	t	00:05:00	1969-12-31 17:13:26.233-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	3rnpsi5qegpt3	55gvsjk:0l	t	00:05:00	1969-12-31 17:13:26.233-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	3chlooy6k8yna	55gvsjk:0l	t	00:05:00	1969-12-31 17:13:26.233-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	2p7kal6uehti8	55gvsjk:0l	t	00:05:00	1969-12-31 17:13:26.233-07
lananaqcj6js8htau4	lo4emecd0pne7k6bdv	343u9rvx540f6	55gvsjk:0l	t	00:05:00	1969-12-31 17:13:26.233-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	2p7kal6uehti8	55gzmv4:02	t	00:05:00	1969-12-31 17:13:31.449-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	3chlooy6k8yna	55gzmv4:02	t	00:05:00	1969-12-31 17:13:31.449-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	343u9rvx540f6	55gzmv4:02	t	00:05:00	1969-12-31 17:13:31.449-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	2g43j83a271g9	55gzmv4:03	t	00:05:00	1969-12-31 17:13:39.543-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	gt8yfqbqc7ca	55gzmv4:03	t	00:05:00	1969-12-31 17:13:39.543-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	2blc6xwom46ss	55gzmv4:03	t	00:05:00	1969-12-31 17:13:39.543-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	3rnpsi5qegpt3	55gzmv4:03	t	00:05:00	1969-12-31 17:13:39.543-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	3se2qu476j7tg	55gzmv4:03	t	00:05:00	1969-12-31 17:13:39.543-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	caqm13mxzbdr	55gzmv4:03	t	00:05:00	1969-12-31 17:13:39.543-07
lananaqcj6js8htau4	h4bo0t0mmpjj76mvr7	817el2k23zdp	55gzmv4:03	t	00:05:00	1969-12-31 17:13:39.543-07
lananaqcj6js8htau4	dtasvqhig9stomk12v	2blc6xwom46ss	55gzmv4:04	t	00:05:00	1969-12-31 17:13:40.637-07
lananaqcj6js8htau4	dtasvqhig9stomk12v	2g43j83a271g9	55gzmv4:04	t	00:05:00	1969-12-31 17:13:40.637-07
lananaqcj6js8htau4	dtasvqhig9stomk12v	3rnpsi5qegpt3	55gzmv4:04	t	00:05:00	1969-12-31 17:13:40.637-07
lananaqcj6js8htau4	dtasvqhig9stomk12v	3se2qu476j7tg	55gzmv4:04	t	00:05:00	1969-12-31 17:13:40.637-07
lananaqcj6js8htau4	dtasvqhig9stomk12v	817el2k23zdp	55gzmv4:04	t	00:05:00	1969-12-31 17:13:40.637-07
lananaqcj6js8htau4	dtasvqhig9stomk12v	caqm13mxzbdr	55gzmv4:04	t	00:05:00	1969-12-31 17:13:40.637-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	3se2qu476j7tg	55gzmv4:05	t	00:05:00	1969-12-31 17:13:42.123-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	2g43j83a271g9	55h4dzs:04	t	00:05:00	1969-12-31 17:14:06.559-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	gt8yfqbqc7ca	55h4dzs:04	t	00:05:00	1969-12-31 17:14:06.559-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	2blc6xwom46ss	55h4dzs:04	t	00:05:00	1969-12-31 17:14:06.559-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	3rnpsi5qegpt3	55h4dzs:04	t	00:05:00	1969-12-31 17:14:06.559-07
lananaqcj6js8htau4	3bkagpsggn3slf2iqh	2g43j83a271g9	55f15wg:0j	t	00:05:00	1969-12-31 17:08:31.26-07
lananaqcj6js8htau4	3bkagpsggn3slf2iqh	3t09dyzubc9zp	55f15wg:0j	t	00:05:00	1969-12-31 17:08:31.26-07
lananaqcj6js8htau4	3bkagpsggn3slf2iqh	3unh7411ka0tz	55f15wg:0j	t	00:05:00	1969-12-31 17:08:31.26-07
lananaqcj6js8htau4	3bkagpsggn3slf2iqh	817el2k23zdp	55f15wg:0j	t	00:05:00	1969-12-31 17:08:31.26-07
lananaqcj6js8htau4	ptcrae1v1i3h99hs4i	2g43j83a271g9	55ar208:110	t	00:05:00	1969-12-31 17:03:15.659-07
lananaqcj6js8htau4	ptcrae1v1i3h99hs4i	3t09dyzubc9zp	55ar208:110	t	00:05:00	1969-12-31 17:03:15.659-07
lananaqcj6js8htau4	ptcrae1v1i3h99hs4i	3unh7411ka0tz	55ar208:110	t	00:05:00	1969-12-31 17:03:15.659-07
lananaqcj6js8htau4	ptcrae1v1i3h99hs4i	817el2k23zdp	55ar208:110	t	00:05:00	1969-12-31 17:03:15.659-07
lananaqcj6js8htau4	vi2b2qad97gu9gudo2	2g43j83a271g9	55dbv7k:01	t	00:05:00	1969-12-31 17:04:47.711-07
lananaqcj6js8htau4	vi2b2qad97gu9gudo2	3t09dyzubc9zp	55dbv7k:01	t	00:05:00	1969-12-31 17:04:47.711-07
lananaqcj6js8htau4	vi2b2qad97gu9gudo2	3unh7411ka0tz	55dbv7k:01	t	00:05:00	1969-12-31 17:04:47.711-07
lananaqcj6js8htau4	vi2b2qad97gu9gudo2	817el2k23zdp	55dbv7k:01	t	00:05:00	1969-12-31 17:04:47.711-07
lananaqcj6js8htau4	5gdpnnqrevlv8t0pnn	2g43j83a271g9	55dbv7k:03	t	00:05:00	1969-12-31 17:04:52.933-07
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	3rnpsi5qegpt3	55ju828:06	t	00:05:00	1969-12-31 17:18:13.011-07
lananaqcj6js8htau4	v2dtlalj5c3l67l6fa	2g43j83a271g9	55dumkw:03	t	00:05:00	1969-12-31 17:05:12.553-07
lananaqcj6js8htau4	dtasvqhig9stomk12v	gt8yfqbqc7ca	55gzmv4:04	t	00:05:00	1969-12-31 17:13:40.637-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	caqm13mxzbdr	55gzmv4:05	t	00:05:00	1969-12-31 17:13:42.123-07
lananaqcj6js8htau4	m9obru4gjo2ntuadud	817el2k23zdp	55h4dzs:03	t	00:05:00	1969-12-31 17:14:04.764-07
lananaqcj6js8htau4	dfipfsll3649bad863	2g43j83a271g9	55eek68:02	t	00:05:00	1969-12-31 17:06:01.052-07
lananaqcj6js8htau4	dfipfsll3649bad863	3t09dyzubc9zp	55eek68:02	t	00:05:00	1969-12-31 17:06:01.052-07
lananaqcj6js8htau4	dfipfsll3649bad863	3unh7411ka0tz	55eek68:02	t	00:05:00	1969-12-31 17:06:01.052-07
lananaqcj6js8htau4	dfipfsll3649bad863	817el2k23zdp	55eek68:02	t	00:05:00	1969-12-31 17:06:01.052-07
lananaqcj6js8htau4	eabmcuik4r5qhpjqfl	2g43j83a271g9	55f15wg:01	t	00:05:00	1969-12-31 17:06:05.987-07
lananaqcj6js8htau4	eabmcuik4r5qhpjqfl	3t09dyzubc9zp	55f15wg:01	t	00:05:00	1969-12-31 17:06:05.987-07
lananaqcj6js8htau4	eabmcuik4r5qhpjqfl	3unh7411ka0tz	55f15wg:01	t	00:05:00	1969-12-31 17:06:05.987-07
lananaqcj6js8htau4	eabmcuik4r5qhpjqfl	817el2k23zdp	55f15wg:01	t	00:05:00	1969-12-31 17:06:05.987-07
lananaqcj6js8htau4	s1a9ujejm47ll7shrk	2g43j83a271g9	55f15wg:02	t	00:05:00	1969-12-31 17:06:55.525-07
lananaqcj6js8htau4	eg5b9pceedms51o2ob	2g43j83a271g9	55f15wg:03	t	00:05:00	1969-12-31 17:07:03.619-07
lananaqcj6js8htau4	sm95a38b78khk651o7	2g43j83a271g9	55f15wg:06	t	00:05:00	1969-12-31 17:07:22.737-07
lananaqcj6js8htau4	sm95a38b78khk651o7	3t09dyzubc9zp	55f15wg:06	t	00:05:00	1969-12-31 17:07:22.737-07
lananaqcj6js8htau4	sm95a38b78khk651o7	3unh7411ka0tz	55f15wg:06	t	00:05:00	1969-12-31 17:07:22.737-07
lananaqcj6js8htau4	sm95a38b78khk651o7	817el2k23zdp	55f15wg:06	t	00:05:00	1969-12-31 17:07:22.737-07
lananaqcj6js8htau4	jbkpfetbpba1pl9rou	2g43j83a271g9	55f15wg:07	t	00:05:00	1969-12-31 17:07:23.744-07
lananaqcj6js8htau4	jbkpfetbpba1pl9rou	3t09dyzubc9zp	55f15wg:07	t	00:05:00	1969-12-31 17:07:23.744-07
lananaqcj6js8htau4	jbkpfetbpba1pl9rou	3unh7411ka0tz	55f15wg:07	t	00:05:00	1969-12-31 17:07:23.744-07
lananaqcj6js8htau4	jbkpfetbpba1pl9rou	817el2k23zdp	55f15wg:07	t	00:05:00	1969-12-31 17:07:23.744-07
lananaqcj6js8htau4	me7bq28bj3i8rg3v2j	2g43j83a271g9	55f15wg:08	t	00:05:00	1969-12-31 17:07:39.022-07
lananaqcj6js8htau4	me7bq28bj3i8rg3v2j	3t09dyzubc9zp	55f15wg:08	t	00:05:00	1969-12-31 17:07:39.022-07
lananaqcj6js8htau4	me7bq28bj3i8rg3v2j	3unh7411ka0tz	55f15wg:08	t	00:05:00	1969-12-31 17:07:39.022-07
lananaqcj6js8htau4	me7bq28bj3i8rg3v2j	817el2k23zdp	55f15wg:08	t	00:05:00	1969-12-31 17:07:39.022-07
lananaqcj6js8htau4	7s0oos3jorlfqh0j8n	2g43j83a271g9	55f15wg:09	t	00:05:00	1969-12-31 17:07:39.855-07
lananaqcj6js8htau4	7s0oos3jorlfqh0j8n	3t09dyzubc9zp	55f15wg:09	t	00:05:00	1969-12-31 17:07:39.855-07
lananaqcj6js8htau4	7s0oos3jorlfqh0j8n	3unh7411ka0tz	55f15wg:09	t	00:05:00	1969-12-31 17:07:39.855-07
lananaqcj6js8htau4	7s0oos3jorlfqh0j8n	817el2k23zdp	55f15wg:09	t	00:05:00	1969-12-31 17:07:39.855-07
lananaqcj6js8htau4	oa2qjvli3532do7qk3	2g43j83a271g9	55f15wg:0b	t	00:05:00	1969-12-31 17:07:49.502-07
lananaqcj6js8htau4	oa2qjvli3532do7qk3	3t09dyzubc9zp	55f15wg:0b	t	00:05:00	1969-12-31 17:07:49.502-07
lananaqcj6js8htau4	oa2qjvli3532do7qk3	3unh7411ka0tz	55f15wg:0b	t	00:05:00	1969-12-31 17:07:49.502-07
lananaqcj6js8htau4	oa2qjvli3532do7qk3	817el2k23zdp	55f15wg:0b	t	00:05:00	1969-12-31 17:07:49.502-07
lananaqcj6js8htau4	3l4gcfr9n9no32tghf	2g43j83a271g9	55f15wg:0c	t	00:05:00	1969-12-31 17:08:06.098-07
lananaqcj6js8htau4	3l4gcfr9n9no32tghf	3t09dyzubc9zp	55f15wg:0c	t	00:05:00	1969-12-31 17:08:06.098-07
lananaqcj6js8htau4	3l4gcfr9n9no32tghf	3unh7411ka0tz	55f15wg:0c	t	00:05:00	1969-12-31 17:08:06.098-07
lananaqcj6js8htau4	3l4gcfr9n9no32tghf	817el2k23zdp	55f15wg:0c	t	00:05:00	1969-12-31 17:08:06.098-07
lananaqcj6js8htau4	9b51d9ntsfei4s9bdt	2g43j83a271g9	55f15wg:0e	t	00:05:00	1969-12-31 17:08:14.185-07
lananaqcj6js8htau4	9b51d9ntsfei4s9bdt	3t09dyzubc9zp	55f15wg:0e	t	00:05:00	1969-12-31 17:08:14.185-07
lananaqcj6js8htau4	9b51d9ntsfei4s9bdt	3unh7411ka0tz	55f15wg:0e	t	00:05:00	1969-12-31 17:08:14.185-07
lananaqcj6js8htau4	9b51d9ntsfei4s9bdt	817el2k23zdp	55f15wg:0e	t	00:05:00	1969-12-31 17:08:14.185-07
lananaqcj6js8htau4	1l7gv23onum0vv863s	2g43j83a271g9	55f15wg:0f	t	00:05:00	1969-12-31 17:08:15.275-07
lananaqcj6js8htau4	1l7gv23onum0vv863s	3t09dyzubc9zp	55f15wg:0f	t	00:05:00	1969-12-31 17:08:15.275-07
lananaqcj6js8htau4	1l7gv23onum0vv863s	3unh7411ka0tz	55f15wg:0f	t	00:05:00	1969-12-31 17:08:15.275-07
lananaqcj6js8htau4	1l7gv23onum0vv863s	817el2k23zdp	55f15wg:0f	t	00:05:00	1969-12-31 17:08:15.275-07
lananaqcj6js8htau4	hplli25ms3igags4ab	2g43j83a271g9	55f15wg:0g	t	00:05:00	1969-12-31 17:08:16.319-07
lananaqcj6js8htau4	hplli25ms3igags4ab	3t09dyzubc9zp	55f15wg:0g	t	00:05:00	1969-12-31 17:08:16.319-07
lananaqcj6js8htau4	hplli25ms3igags4ab	3unh7411ka0tz	55f15wg:0g	t	00:05:00	1969-12-31 17:08:16.319-07
lananaqcj6js8htau4	hplli25ms3igags4ab	817el2k23zdp	55f15wg:0g	t	00:05:00	1969-12-31 17:08:16.319-07
lananaqcj6js8htau4	fp5ir6endlfgtuc4ua	2g43j83a271g9	55f15wg:0i	t	00:05:00	1969-12-31 17:08:17.665-07
lananaqcj6js8htau4	fp5ir6endlfgtuc4ua	3t09dyzubc9zp	55f15wg:0i	t	00:05:00	1969-12-31 17:08:17.665-07
lananaqcj6js8htau4	fp5ir6endlfgtuc4ua	3unh7411ka0tz	55f15wg:0i	t	00:05:00	1969-12-31 17:08:17.665-07
lananaqcj6js8htau4	fp5ir6endlfgtuc4ua	817el2k23zdp	55f15wg:0i	t	00:05:00	1969-12-31 17:08:17.665-07
lananaqcj6js8htau4	55itlc0hsfk3b2dtvs	gt8yfqbqc7ca	55htyxs:06	t	00:05:00	1969-12-31 17:16:50.109-07
lananaqcj6js8htau4	55itlc0hsfk3b2dtvs	2blc6xwom46ss	55htyxs:06	t	00:05:00	1969-12-31 17:16:50.109-07
lananaqcj6js8htau4	55itlc0hsfk3b2dtvs	3rnpsi5qegpt3	55htyxs:06	t	00:05:00	1969-12-31 17:16:50.109-07
lananaqcj6js8htau4	55itlc0hsfk3b2dtvs	37ysvekgvup14	55htyxs:06	t	00:05:00	1969-12-31 17:16:50.109-07
lananaqcj6js8htau4	55itlc0hsfk3b2dtvs	1grmw7h98yohl	55htyxs:06	t	00:05:00	1969-12-31 17:16:50.109-07
lananaqcj6js8htau4	55itlc0hsfk3b2dtvs	343u9rvx540f6	55htyxs:06	t	00:05:00	1969-12-31 17:16:50.109-07
lananaqcj6js8htau4	f38a6m2d84go31q2ll	2g43j83a271g9	55jhtug:01	t	00:05:00	1969-12-31 17:17:38.297-07
lananaqcj6js8htau4	f38a6m2d84go31q2ll	gt8yfqbqc7ca	55jhtug:01	t	00:05:00	1969-12-31 17:17:38.297-07
lananaqcj6js8htau4	f38a6m2d84go31q2ll	2blc6xwom46ss	55jhtug:01	t	00:05:00	1969-12-31 17:17:38.297-07
lananaqcj6js8htau4	f38a6m2d84go31q2ll	3rnpsi5qegpt3	55jhtug:01	t	00:05:00	1969-12-31 17:17:38.297-07
lananaqcj6js8htau4	f38a6m2d84go31q2ll	817el2k23zdp	55jhtug:01	t	00:05:00	1969-12-31 17:17:38.297-07
lananaqcj6js8htau4	823j6noa155stqnjnc	3unh7411ka0tz	55s721c:0j	t	00:05:00	1969-12-31 18:03:35.232-07
lananaqcj6js8htau4	823j6noa155stqnjnc	817el2k23zdp	55s721c:0j	t	00:05:00	1969-12-31 18:03:35.232-07
lananaqcj6js8htau4	hq92relec7ocfd20f4	343u9rvx540f6	55htyxs:07	t	00:05:00	1969-12-31 17:16:50.111-07
um9oencbpuv57ete7t	f49oikpmnmocucjeqb	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	2wha4nxhfryk5	55loqzs:02	t	00:05:00	1969-12-31 17:25:18.77-07
lananaqcj6js8htau4	reg1b7hmvnihep2663	1grmw7h98yohl	55htyxs:08	t	00:05:00	1969-12-31 17:16:52.335-07
lananaqcj6js8htau4	reg1b7hmvnihep2663	2blc6xwom46ss	55htyxs:08	t	00:05:00	1969-12-31 17:16:52.335-07
lananaqcj6js8htau4	reg1b7hmvnihep2663	2g43j83a271g9	55htyxs:08	t	00:05:00	1969-12-31 17:16:52.335-07
lananaqcj6js8htau4	reg1b7hmvnihep2663	343u9rvx540f6	55htyxs:08	t	00:05:00	1969-12-31 17:16:52.335-07
lananaqcj6js8htau4	reg1b7hmvnihep2663	37ysvekgvup14	55htyxs:08	t	00:05:00	1969-12-31 17:16:52.335-07
lananaqcj6js8htau4	reg1b7hmvnihep2663	3rnpsi5qegpt3	55htyxs:08	t	00:05:00	1969-12-31 17:16:52.335-07
lananaqcj6js8htau4	reg1b7hmvnihep2663	gt8yfqbqc7ca	55htyxs:08	t	00:05:00	1969-12-31 17:16:52.335-07
lananaqcj6js8htau4	6anb5j6dpd67ha40e9	2blc6xwom46ss	55htyxs:09	t	00:05:00	1969-12-31 17:16:53.323-07
lananaqcj6js8htau4	6anb5j6dpd67ha40e9	2g43j83a271g9	55htyxs:09	t	00:05:00	1969-12-31 17:16:53.323-07
lananaqcj6js8htau4	6anb5j6dpd67ha40e9	3rnpsi5qegpt3	55htyxs:09	t	00:05:00	1969-12-31 17:16:53.323-07
lananaqcj6js8htau4	6anb5j6dpd67ha40e9	817el2k23zdp	55htyxs:09	t	00:05:00	1969-12-31 17:16:53.323-07
lananaqcj6js8htau4	6anb5j6dpd67ha40e9	gt8yfqbqc7ca	55htyxs:09	t	00:05:00	1969-12-31 17:16:53.323-07
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	3e5j0so81l0e9	55ju828:06	t	00:05:00	1969-12-31 17:18:13.011-07
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	nz4m5nccr9f8	55ju828:06	t	00:05:00	1969-12-31 17:18:13.011-07
lananaqcj6js8htau4	iat7hq4lma4h3sljh7	343u9rvx540f6	55ju828:06	t	00:05:00	1969-12-31 17:18:13.011-07
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	817el2k23zdp	55htyxs:0c	t	00:05:00	1969-12-31 17:16:54.154-07
lananaqcj6js8htau4	kol92elp5mrobf5e9d	2g43j83a271g9	55jwofs:01	t	00:05:00	1969-12-31 17:18:26.708-07
lananaqcj6js8htau4	kol92elp5mrobf5e9d	gt8yfqbqc7ca	55jwofs:01	t	00:05:00	1969-12-31 17:18:26.708-07
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	15h1mxjr1phlc	55jaxig:04	t	00:05:00	1969-12-31 17:16:59.599-07
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	2g43j83a271g9	55jaxig:06	t	00:05:00	1969-12-31 17:17:23.985-07
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	gt8yfqbqc7ca	55jaxig:06	t	00:05:00	1969-12-31 17:17:23.985-07
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	2blc6xwom46ss	55jaxig:06	t	00:05:00	1969-12-31 17:17:23.985-07
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	3rnpsi5qegpt3	55jaxig:06	t	00:05:00	1969-12-31 17:17:23.985-07
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	37ysvekgvup14	55jaxig:06	t	00:05:00	1969-12-31 17:17:23.985-07
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	1grmw7h98yohl	55jaxig:06	t	00:05:00	1969-12-31 17:17:23.985-07
lananaqcj6js8htau4	72sdu94cu76hbp1jvi	343u9rvx540f6	55jaxig:06	t	00:05:00	1969-12-31 17:17:23.985-07
lananaqcj6js8htau4	kol92elp5mrobf5e9d	2blc6xwom46ss	55jwofs:01	t	00:05:00	1969-12-31 17:18:26.708-07
lananaqcj6js8htau4	kol92elp5mrobf5e9d	3rnpsi5qegpt3	55jwofs:01	t	00:05:00	1969-12-31 17:18:26.708-07
lananaqcj6js8htau4	kol92elp5mrobf5e9d	817el2k23zdp	55jwofs:01	t	00:05:00	1969-12-31 17:18:26.708-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	2m5c2t3mg17an	55jzj5s:01	t	00:05:00	1969-12-31 17:18:43.004-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	3e5j0so81l0e9	55jzj5s:01	t	00:05:00	1969-12-31 17:18:43.004-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	nz4m5nccr9f8	55jzj5s:01	t	00:05:00	1969-12-31 17:18:43.004-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	3se2qu476j7tg	55jzj5s:02	t	00:05:00	1969-12-31 17:18:45.711-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	caqm13mxzbdr	55jzj5s:02	t	00:05:00	1969-12-31 17:18:45.711-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	15sxcxu95clcy	55jzj5s:09	t	00:05:00	1969-12-31 17:18:49.912-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	1z5v4i1u68m1j	55jzj5s:0b	t	00:05:00	1969-12-31 17:18:50.517-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	1cpvv22ompl1s	55jzj5s:0b	t	00:05:00	1969-12-31 17:18:50.517-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	343u9rvx540f6	55jzj5s:0b	t	00:05:00	1969-12-31 17:18:50.517-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	2g43j83a271g9	55jzj5s:0c	t	00:05:00	1969-12-31 17:18:57.615-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	gt8yfqbqc7ca	55jzj5s:0c	t	00:05:00	1969-12-31 17:18:57.615-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	2blc6xwom46ss	55jzj5s:0c	t	00:05:00	1969-12-31 17:18:57.615-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	3rnpsi5qegpt3	55jzj5s:0c	t	00:05:00	1969-12-31 17:18:57.615-07
lananaqcj6js8htau4	eo0qugng3mpspb58as	817el2k23zdp	55jzj5s:0c	t	00:05:00	1969-12-31 17:18:57.615-07
lananaqcj6js8htau4	6tp9hvqfs74359v7nm	2blc6xwom46ss	55jzj5s:0d	t	00:05:00	1969-12-31 17:18:58.745-07
lananaqcj6js8htau4	6tp9hvqfs74359v7nm	2g43j83a271g9	55jzj5s:0d	t	00:05:00	1969-12-31 17:18:58.745-07
lananaqcj6js8htau4	6tp9hvqfs74359v7nm	3rnpsi5qegpt3	55jzj5s:0d	t	00:05:00	1969-12-31 17:18:58.745-07
lananaqcj6js8htau4	6tp9hvqfs74359v7nm	817el2k23zdp	55jzj5s:0d	t	00:05:00	1969-12-31 17:18:58.745-07
lananaqcj6js8htau4	6tp9hvqfs74359v7nm	gt8yfqbqc7ca	55jzj5s:0d	t	00:05:00	1969-12-31 17:18:58.745-07
lananaqcj6js8htau4	2qj9nohs5kci8qa8et	2g43j83a271g9	55jzj5s:0g	t	00:05:00	1969-12-31 17:19:04.027-07
lananaqcj6js8htau4	2qj9nohs5kci8qa8et	gt8yfqbqc7ca	55jzj5s:0g	t	00:05:00	1969-12-31 17:19:04.027-07
lananaqcj6js8htau4	2qj9nohs5kci8qa8et	2blc6xwom46ss	55jzj5s:0g	t	00:05:00	1969-12-31 17:19:04.027-07
lananaqcj6js8htau4	2qj9nohs5kci8qa8et	3rnpsi5qegpt3	55jzj5s:0g	t	00:05:00	1969-12-31 17:19:04.027-07
j7bhrg08dkl0ut6f8e	egl20ve48hbelk85t2	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	2g43j83a271g9	55loqzs:03	t	00:05:00	1969-12-31 17:25:24.406-07
lananaqcj6js8htau4	2qj9nohs5kci8qa8et	817el2k23zdp	55jzj5s:0f	t	00:05:00	1969-12-31 17:18:59.757-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	gt8yfqbqc7ca	55loqzs:03	t	00:05:00	1969-12-31 17:25:24.406-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	2blc6xwom46ss	55loqzs:03	t	00:05:00	1969-12-31 17:25:24.406-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	2g43j83a271g9	55lqt88:03	t	00:05:00	1969-12-31 17:25:45.802-07
lananaqcj6js8htau4	2qj9nohs5kci8qa8et	1cpvv22ompl1s	55jzj5s:0g	t	00:05:00	1969-12-31 17:19:04.027-07
lananaqcj6js8htau4	2qj9nohs5kci8qa8et	1z5v4i1u68m1j	55jzj5s:0g	t	00:05:00	1969-12-31 17:19:04.027-07
lananaqcj6js8htau4	2qj9nohs5kci8qa8et	343u9rvx540f6	55jzj5s:0g	t	00:05:00	1969-12-31 17:19:04.027-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	15sxcxu95clcy	55k8lns:01	t	00:05:00	1969-12-31 17:19:30.868-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	1cpvv22ompl1s	55k8lns:01	t	00:05:00	1969-12-31 17:19:30.868-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	1z5v4i1u68m1j	55k8lns:01	t	00:05:00	1969-12-31 17:19:30.868-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	15h1mxjr1phlc	55k9ve0:01	t	00:05:00	1969-12-31 17:19:35.197-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	1grmw7h98yohl	55k9ve0:01	t	00:05:00	1969-12-31 17:19:35.197-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	37ysvekgvup14	55k9ve0:01	t	00:05:00	1969-12-31 17:19:35.197-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	343u9rvx540f6	55k9ve0:01	t	00:05:00	1969-12-31 17:19:35.197-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	2g43j83a271g9	55k9ve0:03	t	00:05:00	1969-12-31 17:19:47.281-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	gt8yfqbqc7ca	55k9ve0:03	t	00:05:00	1969-12-31 17:19:47.281-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	2blc6xwom46ss	55k9ve0:03	t	00:05:00	1969-12-31 17:19:47.281-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	3rnpsi5qegpt3	55k9ve0:03	t	00:05:00	1969-12-31 17:19:47.281-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	817el2k23zdp	55k9ve0:03	t	00:05:00	1969-12-31 17:19:47.281-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	3se2qu476j7tg	55k9ve0:03	t	00:05:00	1969-12-31 17:19:47.281-07
lananaqcj6js8htau4	gsjih8rvbt4bfsbn97	caqm13mxzbdr	55k9ve0:03	t	00:05:00	1969-12-31 17:19:47.281-07
lananaqcj6js8htau4	3plo0g26kdo1cfj97q	2blc6xwom46ss	55k9ve0:04	t	00:05:00	1969-12-31 17:19:48.368-07
lananaqcj6js8htau4	3plo0g26kdo1cfj97q	2g43j83a271g9	55k9ve0:04	t	00:05:00	1969-12-31 17:19:48.368-07
lananaqcj6js8htau4	3plo0g26kdo1cfj97q	3rnpsi5qegpt3	55k9ve0:04	t	00:05:00	1969-12-31 17:19:48.368-07
lananaqcj6js8htau4	3plo0g26kdo1cfj97q	3se2qu476j7tg	55k9ve0:04	t	00:05:00	1969-12-31 17:19:48.368-07
lananaqcj6js8htau4	3plo0g26kdo1cfj97q	817el2k23zdp	55k9ve0:04	t	00:05:00	1969-12-31 17:19:48.368-07
lananaqcj6js8htau4	3plo0g26kdo1cfj97q	caqm13mxzbdr	55k9ve0:04	t	00:05:00	1969-12-31 17:19:48.368-07
lananaqcj6js8htau4	3plo0g26kdo1cfj97q	gt8yfqbqc7ca	55k9ve0:04	t	00:05:00	1969-12-31 17:19:48.368-07
lananaqcj6js8htau4	qkhr7raed6ths7fd5i	2g43j83a271g9	55kc2o8:01	t	00:05:00	1969-12-31 17:20:00.506-07
lananaqcj6js8htau4	qkhr7raed6ths7fd5i	gt8yfqbqc7ca	55kc2o8:01	t	00:05:00	1969-12-31 17:20:00.506-07
lananaqcj6js8htau4	qkhr7raed6ths7fd5i	2blc6xwom46ss	55kc2o8:01	t	00:05:00	1969-12-31 17:20:00.506-07
lananaqcj6js8htau4	qkhr7raed6ths7fd5i	3rnpsi5qegpt3	55kc2o8:01	t	00:05:00	1969-12-31 17:20:00.506-07
lananaqcj6js8htau4	qkhr7raed6ths7fd5i	3se2qu476j7tg	55kc2o8:01	t	00:05:00	1969-12-31 17:20:00.506-07
lananaqcj6js8htau4	qkhr7raed6ths7fd5i	caqm13mxzbdr	55kc2o8:01	t	00:05:00	1969-12-31 17:20:00.506-07
lananaqcj6js8htau4	qkhr7raed6ths7fd5i	817el2k23zdp	55kc2o8:01	t	00:05:00	1969-12-31 17:20:00.506-07
lananaqcj6js8htau4	jdgbeiu346qanb80uu	2g43j83a271g9	55kc2o8:02	t	00:05:00	1969-12-31 17:20:13.848-07
lananaqcj6js8htau4	jdgbeiu346qanb80uu	gt8yfqbqc7ca	55kc2o8:02	t	00:05:00	1969-12-31 17:20:13.848-07
lananaqcj6js8htau4	jdgbeiu346qanb80uu	2blc6xwom46ss	55kc2o8:02	t	00:05:00	1969-12-31 17:20:13.848-07
lananaqcj6js8htau4	jdgbeiu346qanb80uu	3rnpsi5qegpt3	55kc2o8:02	t	00:05:00	1969-12-31 17:20:13.848-07
lananaqcj6js8htau4	jdgbeiu346qanb80uu	3se2qu476j7tg	55kc2o8:02	t	00:05:00	1969-12-31 17:20:13.848-07
lananaqcj6js8htau4	jdgbeiu346qanb80uu	caqm13mxzbdr	55kc2o8:02	t	00:05:00	1969-12-31 17:20:13.848-07
lananaqcj6js8htau4	jdgbeiu346qanb80uu	817el2k23zdp	55kc2o8:02	t	00:05:00	1969-12-31 17:20:13.848-07
lananaqcj6js8htau4	s3bllslrn8c8m70eep	2blc6xwom46ss	55kc2o8:03	t	00:05:00	1969-12-31 17:20:16.205-07
lananaqcj6js8htau4	s3bllslrn8c8m70eep	2g43j83a271g9	55kc2o8:03	t	00:05:00	1969-12-31 17:20:16.205-07
lananaqcj6js8htau4	s3bllslrn8c8m70eep	3rnpsi5qegpt3	55kc2o8:03	t	00:05:00	1969-12-31 17:20:16.205-07
lananaqcj6js8htau4	s3bllslrn8c8m70eep	3se2qu476j7tg	55kc2o8:03	t	00:05:00	1969-12-31 17:20:16.205-07
lananaqcj6js8htau4	s3bllslrn8c8m70eep	817el2k23zdp	55kc2o8:03	t	00:05:00	1969-12-31 17:20:16.205-07
lananaqcj6js8htau4	s3bllslrn8c8m70eep	caqm13mxzbdr	55kc2o8:03	t	00:05:00	1969-12-31 17:20:16.205-07
lananaqcj6js8htau4	s3bllslrn8c8m70eep	gt8yfqbqc7ca	55kc2o8:03	t	00:05:00	1969-12-31 17:20:16.205-07
lananaqcj6js8htau4	s9fhf2qrlsljqgr48e	2blc6xwom46ss	55kc2o8:04	t	00:05:00	1969-12-31 17:20:17.288-07
lananaqcj6js8htau4	s9fhf2qrlsljqgr48e	2g43j83a271g9	55kc2o8:04	t	00:05:00	1969-12-31 17:20:17.288-07
lananaqcj6js8htau4	s9fhf2qrlsljqgr48e	3rnpsi5qegpt3	55kc2o8:04	t	00:05:00	1969-12-31 17:20:17.288-07
lananaqcj6js8htau4	s9fhf2qrlsljqgr48e	3se2qu476j7tg	55kc2o8:04	t	00:05:00	1969-12-31 17:20:17.288-07
lananaqcj6js8htau4	s9fhf2qrlsljqgr48e	817el2k23zdp	55kc2o8:04	t	00:05:00	1969-12-31 17:20:17.288-07
lananaqcj6js8htau4	s9fhf2qrlsljqgr48e	caqm13mxzbdr	55kc2o8:04	t	00:05:00	1969-12-31 17:20:17.288-07
lananaqcj6js8htau4	s9fhf2qrlsljqgr48e	gt8yfqbqc7ca	55kc2o8:04	t	00:05:00	1969-12-31 17:20:17.288-07
lananaqcj6js8htau4	71os01irlgg9120h0b	3panrcehejw2b	55kg6kg:04	t	00:05:00	1969-12-31 17:20:36.453-07
lananaqcj6js8htau4	71os01irlgg9120h0b	2a3fejmu1ysvb	55kg6kg:04	t	00:05:00	1969-12-31 17:20:36.453-07
lananaqcj6js8htau4	71os01irlgg9120h0b	gt8yfqbqc7ca	55kg6kg:05	t	00:05:00	1969-12-31 17:20:44.623-07
lananaqcj6js8htau4	71os01irlgg9120h0b	3rnpsi5qegpt3	55kg6kg:05	t	00:05:00	1969-12-31 17:20:44.623-07
lananaqcj6js8htau4	71os01irlgg9120h0b	3se2qu476j7tg	55kg6kg:05	t	00:05:00	1969-12-31 17:20:44.623-07
lananaqcj6js8htau4	71os01irlgg9120h0b	817el2k23zdp	55kg6kg:05	t	00:05:00	1969-12-31 17:20:44.623-07
lananaqcj6js8htau4	71os01irlgg9120h0b	2blc6xwom46ss	55kg6kg:05	t	00:05:00	1969-12-31 17:20:44.623-07
lananaqcj6js8htau4	71os01irlgg9120h0b	2g43j83a271g9	55kg6kg:06	t	00:05:00	1969-12-31 17:20:55.25-07
lananaqcj6js8htau4	71os01irlgg9120h0b	caqm13mxzbdr	55kg6kg:06	t	00:05:00	1969-12-31 17:20:55.25-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	343u9rvx540f6	55loqzs:02	t	00:05:00	1969-12-31 17:25:18.77-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	a9fx3bveruwk	55loqzs:02	t	00:05:00	1969-12-31 17:25:18.77-07
5ph82kuone893qddig	snituid2946m59pin6	2g43j83a271g9	00:01	f	00:05:00	\N
287ctj7acmbh2aediu	tihh0oq3jm73sblr43	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	71os01irlgg9120h0b	1h040veoau8up	55kg6kg:02	t	00:05:00	1969-12-31 17:20:35.8-07
lananaqcj6js8htau4	71os01irlgg9120h0b	343u9rvx540f6	55kg6kg:04	t	00:05:00	1969-12-31 17:20:36.453-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	2wha4nxhfryk5	55lqt88:02	t	00:05:00	1969-12-31 17:25:33.913-07
lananaqcj6js8htau4	952b4690knudbmit1l	3t09dyzubc9zp	55oncwg:0r	t	00:05:00	1969-12-31 17:41:54.811-07
lananaqcj6js8htau4	e6m174121u719smeh4	2g43j83a271g9	55kg6kg:07	t	00:05:00	1969-12-31 17:20:56.344-07
lananaqcj6js8htau4	e6m174121u719smeh4	caqm13mxzbdr	55kg6kg:07	t	00:05:00	1969-12-31 17:20:56.344-07
lananaqcj6js8htau4	952b4690knudbmit1l	3unh7411ka0tz	55oncwg:0r	t	00:05:00	1969-12-31 17:41:54.811-07
lananaqcj6js8htau4	al72hdtl9iu7131gbq	caqm13mxzbdr	55kg6kg:0a	t	00:05:00	1969-12-31 17:20:58.069-07
lananaqcj6js8htau4	al72hdtl9iu7131gbq	2g43j83a271g9	55kg6kg:0b	t	00:05:00	1969-12-31 17:21:06.217-07
lananaqcj6js8htau4	al72hdtl9iu7131gbq	3t09dyzubc9zp	55kg6kg:0b	t	00:05:00	1969-12-31 17:21:06.217-07
lananaqcj6js8htau4	al72hdtl9iu7131gbq	3unh7411ka0tz	55kg6kg:0b	t	00:05:00	1969-12-31 17:21:06.217-07
lananaqcj6js8htau4	al72hdtl9iu7131gbq	817el2k23zdp	55kg6kg:0b	t	00:05:00	1969-12-31 17:21:06.217-07
lananaqcj6js8htau4	rt6qdh1diee04s1nek	2g43j83a271g9	55kg6kg:0c	t	00:05:00	1969-12-31 17:21:07.272-07
lananaqcj6js8htau4	rt6qdh1diee04s1nek	3t09dyzubc9zp	55kg6kg:0c	t	00:05:00	1969-12-31 17:21:07.272-07
lananaqcj6js8htau4	rt6qdh1diee04s1nek	3unh7411ka0tz	55kg6kg:0c	t	00:05:00	1969-12-31 17:21:07.272-07
lananaqcj6js8htau4	rt6qdh1diee04s1nek	817el2k23zdp	55kg6kg:0c	t	00:05:00	1969-12-31 17:21:07.272-07
lananaqcj6js8htau4	i77pfi0vq89p9ealhp	3t09dyzubc9zp	55kg6kg:0e	t	00:05:00	1969-12-31 17:21:08.266-07
lananaqcj6js8htau4	i77pfi0vq89p9ealhp	3unh7411ka0tz	55kg6kg:0e	t	00:05:00	1969-12-31 17:21:08.266-07
lananaqcj6js8htau4	i77pfi0vq89p9ealhp	2g43j83a271g9	55kg6kg:0f	t	00:05:00	1969-12-31 17:21:21.179-07
lananaqcj6js8htau4	i77pfi0vq89p9ealhp	817el2k23zdp	55kg6kg:0f	t	00:05:00	1969-12-31 17:21:21.179-07
lananaqcj6js8htau4	i77pfi0vq89p9ealhp	gt8yfqbqc7ca	55kg6kg:0f	t	00:05:00	1969-12-31 17:21:21.179-07
lananaqcj6js8htau4	i77pfi0vq89p9ealhp	2blc6xwom46ss	55kg6kg:0f	t	00:05:00	1969-12-31 17:21:21.179-07
lananaqcj6js8htau4	i77pfi0vq89p9ealhp	3rnpsi5qegpt3	55kg6kg:0f	t	00:05:00	1969-12-31 17:21:21.179-07
lananaqcj6js8htau4	i77pfi0vq89p9ealhp	3se2qu476j7tg	55kg6kg:0f	t	00:05:00	1969-12-31 17:21:21.179-07
lananaqcj6js8htau4	i77pfi0vq89p9ealhp	caqm13mxzbdr	55kg6kg:0f	t	00:05:00	1969-12-31 17:21:21.179-07
lananaqcj6js8htau4	9ka5tsp3c048mig8tg	2blc6xwom46ss	55kg6kg:0g	t	00:05:00	1969-12-31 17:21:22.11-07
lananaqcj6js8htau4	9ka5tsp3c048mig8tg	2g43j83a271g9	55kg6kg:0g	t	00:05:00	1969-12-31 17:21:22.11-07
lananaqcj6js8htau4	9ka5tsp3c048mig8tg	3rnpsi5qegpt3	55kg6kg:0g	t	00:05:00	1969-12-31 17:21:22.11-07
lananaqcj6js8htau4	9ka5tsp3c048mig8tg	3se2qu476j7tg	55kg6kg:0g	t	00:05:00	1969-12-31 17:21:22.11-07
lananaqcj6js8htau4	9ka5tsp3c048mig8tg	817el2k23zdp	55kg6kg:0g	t	00:05:00	1969-12-31 17:21:22.11-07
lananaqcj6js8htau4	9ka5tsp3c048mig8tg	caqm13mxzbdr	55kg6kg:0g	t	00:05:00	1969-12-31 17:21:22.11-07
lananaqcj6js8htau4	9ka5tsp3c048mig8tg	gt8yfqbqc7ca	55kg6kg:0g	t	00:05:00	1969-12-31 17:21:22.11-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	2g43j83a271g9	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	gt8yfqbqc7ca	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	2blc6xwom46ss	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	3rnpsi5qegpt3	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	2v7ryv0j5xwcn	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	36n5xz3rdvj0m	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	343u9rvx540f6	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	1gmg8bwlrxcds	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	3se2qu476j7tg	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	caqm13mxzbdr	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	c4de9q8r3a1lvj911t	817el2k23zdp	55kpwzs:02	t	00:05:00	1969-12-31 17:21:27.749-07
lananaqcj6js8htau4	1bkr55bf89pbskl460	2blc6xwom46ss	55kqkt4:01	t	00:05:00	1969-12-31 17:21:30.252-07
lananaqcj6js8htau4	1bkr55bf89pbskl460	2g43j83a271g9	55kqkt4:01	t	00:05:00	1969-12-31 17:21:30.252-07
lananaqcj6js8htau4	1bkr55bf89pbskl460	3rnpsi5qegpt3	55kqkt4:01	t	00:05:00	1969-12-31 17:21:30.252-07
lananaqcj6js8htau4	1bkr55bf89pbskl460	3se2qu476j7tg	55kqkt4:01	t	00:05:00	1969-12-31 17:21:30.252-07
lananaqcj6js8htau4	1bkr55bf89pbskl460	817el2k23zdp	55kqkt4:01	t	00:05:00	1969-12-31 17:21:30.252-07
lananaqcj6js8htau4	1bkr55bf89pbskl460	caqm13mxzbdr	55kqkt4:01	t	00:05:00	1969-12-31 17:21:30.252-07
lananaqcj6js8htau4	1bkr55bf89pbskl460	gt8yfqbqc7ca	55kqkt4:01	t	00:05:00	1969-12-31 17:21:30.252-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	2vp6wa4hseasz	55ku2fc:02	t	00:05:00	1969-12-31 17:21:53.075-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	30cgn5q2a6wny	55ku2fc:02	t	00:05:00	1969-12-31 17:21:53.075-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	343u9rvx540f6	55ku2fc:02	t	00:05:00	1969-12-31 17:21:53.075-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	2g43j83a271g9	55ku2fc:03	t	00:05:00	1969-12-31 17:22:19.489-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	gt8yfqbqc7ca	55ku2fc:03	t	00:05:00	1969-12-31 17:22:19.489-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	2blc6xwom46ss	55ku2fc:03	t	00:05:00	1969-12-31 17:22:19.489-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	3rnpsi5qegpt3	55ku2fc:03	t	00:05:00	1969-12-31 17:22:19.489-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	3se2qu476j7tg	55ku2fc:03	t	00:05:00	1969-12-31 17:22:19.489-07
lananaqcj6js8htau4	7h5c5k24r0hs46g9or	2blc6xwom46ss	55ku2fc:04	t	00:05:00	1969-12-31 17:22:20.56-07
lananaqcj6js8htau4	7h5c5k24r0hs46g9or	2g43j83a271g9	55ku2fc:04	t	00:05:00	1969-12-31 17:22:20.56-07
lananaqcj6js8htau4	7h5c5k24r0hs46g9or	3rnpsi5qegpt3	55ku2fc:04	t	00:05:00	1969-12-31 17:22:20.56-07
lananaqcj6js8htau4	7h5c5k24r0hs46g9or	3se2qu476j7tg	55ku2fc:04	t	00:05:00	1969-12-31 17:22:20.56-07
lananaqcj6js8htau4	7h5c5k24r0hs46g9or	817el2k23zdp	55ku2fc:04	t	00:05:00	1969-12-31 17:22:20.56-07
lananaqcj6js8htau4	7h5c5k24r0hs46g9or	caqm13mxzbdr	55ku2fc:04	t	00:05:00	1969-12-31 17:22:20.56-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	caqm13mxzbdr	55ku2fc:03	t	00:05:00	1969-12-31 17:22:19.489-07
lananaqcj6js8htau4	16ol7hd4hg0bkf72hb	817el2k23zdp	55ku2fc:03	t	00:05:00	1969-12-31 17:22:19.489-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	3rnpsi5qegpt3	55loqzs:03	t	00:05:00	1969-12-31 17:25:24.406-07
lananaqcj6js8htau4	mtbthk7ig1ai9bgq36	3se2qu476j7tg	55loqzs:03	t	00:05:00	1969-12-31 17:25:24.406-07
lananaqcj6js8htau4	oiiqb3i78fif9c3l28	2g43j83a271g9	55s721c:0k	t	00:05:00	1969-12-31 18:03:43.428-07
lananaqcj6js8htau4	oiiqb3i78fif9c3l28	3t09dyzubc9zp	55s721c:0k	t	00:05:00	1969-12-31 18:03:43.428-07
lananaqcj6js8htau4	lvpf42ev6b3jadc3g9	2g43j83a271g9	55ku2fc:0b	t	00:05:00	1969-12-31 17:22:34.979-07
lananaqcj6js8htau4	lvpf42ev6b3jadc3g9	caqm13mxzbdr	55ku2fc:0b	t	00:05:00	1969-12-31 17:22:34.979-07
lananaqcj6js8htau4	oiiqb3i78fif9c3l28	3unh7411ka0tz	55s721c:0k	t	00:05:00	1969-12-31 18:03:43.428-07
lananaqcj6js8htau4	952b4690knudbmit1l	gt8yfqbqc7ca	55oncwg:0u	t	00:05:00	1969-12-31 17:41:58.544-07
lananaqcj6js8htau4	952b4690knudbmit1l	3rnpsi5qegpt3	55oncwg:0u	t	00:05:00	1969-12-31 17:41:58.544-07
lananaqcj6js8htau4	952b4690knudbmit1l	2blc6xwom46ss	55oncwg:0v	t	00:05:00	1969-12-31 17:42:07.203-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	i50mbufn38bb	55lqt88:02	t	00:05:00	1969-12-31 17:25:33.913-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	343u9rvx540f6	55lqt88:02	t	00:05:00	1969-12-31 17:25:33.913-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	a9fx3bveruwk	55lqt88:02	t	00:05:00	1969-12-31 17:25:33.913-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	gt8yfqbqc7ca	55lqt88:03	t	00:05:00	1969-12-31 17:25:45.802-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	2blc6xwom46ss	55lqt88:03	t	00:05:00	1969-12-31 17:25:45.802-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	3rnpsi5qegpt3	55lqt88:03	t	00:05:00	1969-12-31 17:25:45.802-07
lananaqcj6js8htau4	bttd93f463cda80l4c	3panrcehejw2b	55ku2fc:0h	t	00:05:00	1969-12-31 17:23:04.755-07
lananaqcj6js8htau4	bttd93f463cda80l4c	2a3fejmu1ysvb	55ku2fc:0h	t	00:05:00	1969-12-31 17:23:04.755-07
lananaqcj6js8htau4	bttd93f463cda80l4c	343u9rvx540f6	55ku2fc:0h	t	00:05:00	1969-12-31 17:23:04.755-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	3se2qu476j7tg	55lqt88:03	t	00:05:00	1969-12-31 17:25:45.802-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	caqm13mxzbdr	55lqt88:03	t	00:05:00	1969-12-31 17:25:45.802-07
lananaqcj6js8htau4	g3v8jlqgk4g2630tse	817el2k23zdp	55lqt88:03	t	00:05:00	1969-12-31 17:25:45.802-07
lananaqcj6js8htau4	bttd93f463cda80l4c	2g43j83a271g9	55ku2fc:0i	t	00:05:00	1969-12-31 17:23:09.788-07
lananaqcj6js8htau4	bttd93f463cda80l4c	gt8yfqbqc7ca	55ku2fc:0i	t	00:05:00	1969-12-31 17:23:09.788-07
lananaqcj6js8htau4	bttd93f463cda80l4c	2blc6xwom46ss	55ku2fc:0i	t	00:05:00	1969-12-31 17:23:09.788-07
lananaqcj6js8htau4	bttd93f463cda80l4c	3rnpsi5qegpt3	55ku2fc:0i	t	00:05:00	1969-12-31 17:23:09.788-07
lananaqcj6js8htau4	bttd93f463cda80l4c	3se2qu476j7tg	55ku2fc:0i	t	00:05:00	1969-12-31 17:23:09.788-07
lananaqcj6js8htau4	bttd93f463cda80l4c	caqm13mxzbdr	55ku2fc:0i	t	00:05:00	1969-12-31 17:23:09.788-07
lananaqcj6js8htau4	bttd93f463cda80l4c	817el2k23zdp	55ku2fc:0i	t	00:05:00	1969-12-31 17:23:09.788-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	a9fx3bveruwk	55lv9m8:01	t	00:05:00	1969-12-31 17:25:49.753-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	i50mbufn38bb	55lv9m8:01	t	00:05:00	1969-12-31 17:25:49.753-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	2wha4nxhfryk5	55lv9m8:01	t	00:05:00	1969-12-31 17:25:49.753-07
lananaqcj6js8htau4	m7jgbbefjmtatqh9sj	2g43j83a271g9	55ku2fc:0j	t	00:05:00	1969-12-31 17:23:21.333-07
lananaqcj6js8htau4	m7jgbbefjmtatqh9sj	gt8yfqbqc7ca	55ku2fc:0j	t	00:05:00	1969-12-31 17:23:21.333-07
lananaqcj6js8htau4	m7jgbbefjmtatqh9sj	2blc6xwom46ss	55ku2fc:0j	t	00:05:00	1969-12-31 17:23:21.333-07
lananaqcj6js8htau4	m7jgbbefjmtatqh9sj	3rnpsi5qegpt3	55ku2fc:0j	t	00:05:00	1969-12-31 17:23:21.333-07
lananaqcj6js8htau4	m7jgbbefjmtatqh9sj	3se2qu476j7tg	55ku2fc:0j	t	00:05:00	1969-12-31 17:23:21.333-07
lananaqcj6js8htau4	m7jgbbefjmtatqh9sj	caqm13mxzbdr	55ku2fc:0j	t	00:05:00	1969-12-31 17:23:21.333-07
lananaqcj6js8htau4	m7jgbbefjmtatqh9sj	817el2k23zdp	55ku2fc:0j	t	00:05:00	1969-12-31 17:23:21.333-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	32m30za7qqkmt	55lwjg8:01	t	00:05:00	1969-12-31 17:25:54.337-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	5fznhcfgml00	55lwjg8:01	t	00:05:00	1969-12-31 17:25:54.337-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	343u9rvx540f6	55lwjg8:01	t	00:05:00	1969-12-31 17:25:54.337-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	17pe85lz3g2fv	55lwjg8:01	t	00:05:00	1969-12-31 17:25:54.337-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	2g43j83a271g9	55lwjg8:02	t	00:05:00	1969-12-31 17:25:55.834-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	gt8yfqbqc7ca	55lwjg8:02	t	00:05:00	1969-12-31 17:25:55.834-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	2blc6xwom46ss	55lwjg8:02	t	00:05:00	1969-12-31 17:25:55.834-07
lananaqcj6js8htau4	0on89uat46f1boko9t	2vp6wa4hseasz	55l0pe8:02	t	00:05:00	1969-12-31 17:23:27.288-07
lananaqcj6js8htau4	0on89uat46f1boko9t	30cgn5q2a6wny	55l0pe8:02	t	00:05:00	1969-12-31 17:23:27.288-07
lananaqcj6js8htau4	0on89uat46f1boko9t	343u9rvx540f6	55l0pe8:02	t	00:05:00	1969-12-31 17:23:27.288-07
lananaqcj6js8htau4	0on89uat46f1boko9t	2g43j83a271g9	55l0pe8:03	t	00:05:00	1969-12-31 17:23:36.057-07
lananaqcj6js8htau4	0on89uat46f1boko9t	gt8yfqbqc7ca	55l0pe8:03	t	00:05:00	1969-12-31 17:23:36.057-07
lananaqcj6js8htau4	0on89uat46f1boko9t	2blc6xwom46ss	55l0pe8:03	t	00:05:00	1969-12-31 17:23:36.057-07
lananaqcj6js8htau4	0on89uat46f1boko9t	3rnpsi5qegpt3	55l0pe8:03	t	00:05:00	1969-12-31 17:23:36.057-07
lananaqcj6js8htau4	0on89uat46f1boko9t	3se2qu476j7tg	55l0pe8:03	t	00:05:00	1969-12-31 17:23:36.057-07
lananaqcj6js8htau4	0on89uat46f1boko9t	caqm13mxzbdr	55l0pe8:03	t	00:05:00	1969-12-31 17:23:36.057-07
lananaqcj6js8htau4	0on89uat46f1boko9t	817el2k23zdp	55l0pe8:03	t	00:05:00	1969-12-31 17:23:36.057-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	3rnpsi5qegpt3	55lwjg8:02	t	00:05:00	1969-12-31 17:25:55.834-07
lananaqcj6js8htau4	f2se7lpv46uv1bf5dm	2g43j83a271g9	55lwjg8:04	t	00:05:00	1969-12-31 17:26:04.352-07
lananaqcj6js8htau4	f2se7lpv46uv1bf5dm	gt8yfqbqc7ca	55lwjg8:04	t	00:05:00	1969-12-31 17:26:04.352-07
lananaqcj6js8htau4	f2se7lpv46uv1bf5dm	2blc6xwom46ss	55lwjg8:04	t	00:05:00	1969-12-31 17:26:04.352-07
lananaqcj6js8htau4	f2se7lpv46uv1bf5dm	3rnpsi5qegpt3	55lwjg8:04	t	00:05:00	1969-12-31 17:26:04.352-07
lananaqcj6js8htau4	f2se7lpv46uv1bf5dm	3se2qu476j7tg	55lwjg8:04	t	00:05:00	1969-12-31 17:26:04.352-07
lananaqcj6js8htau4	f2se7lpv46uv1bf5dm	caqm13mxzbdr	55lwjg8:04	t	00:05:00	1969-12-31 17:26:04.352-07
lananaqcj6js8htau4	f2se7lpv46uv1bf5dm	817el2k23zdp	55lwjg8:04	t	00:05:00	1969-12-31 17:26:04.352-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	3panrcehejw2b	55lwjg8:08	t	00:05:00	1969-12-31 17:26:06.517-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	2a3fejmu1ysvb	55lwjg8:08	t	00:05:00	1969-12-31 17:26:06.517-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	343u9rvx540f6	55m0xcg:05	t	00:05:00	1969-12-31 17:26:44.704-07
lananaqcj6js8htau4	oiiqb3i78fif9c3l28	817el2k23zdp	55s721c:0k	t	00:05:00	1969-12-31 18:03:43.428-07
lananaqcj6js8htau4	952b4690knudbmit1l	caqm13mxzbdr	55oncwg:0v	t	00:05:00	1969-12-31 17:42:07.203-07
lananaqcj6js8htau4	7h5c5k24r0hs46g9or	gt8yfqbqc7ca	55ku2fc:04	t	00:05:00	1969-12-31 17:22:20.56-07
lananaqcj6js8htau4	201hhgs7l4q7dbitig	gt8yfqbqc7ca	55ku2fc:05	t	00:05:00	1969-12-31 17:22:22.356-07
lananaqcj6js8htau4	201hhgs7l4q7dbitig	3rnpsi5qegpt3	55ku2fc:05	t	00:05:00	1969-12-31 17:22:22.356-07
lananaqcj6js8htau4	201hhgs7l4q7dbitig	3se2qu476j7tg	55ku2fc:05	t	00:05:00	1969-12-31 17:22:22.356-07
lananaqcj6js8htau4	201hhgs7l4q7dbitig	817el2k23zdp	55ku2fc:05	t	00:05:00	1969-12-31 17:22:22.356-07
lananaqcj6js8htau4	201hhgs7l4q7dbitig	2blc6xwom46ss	55ku2fc:05	t	00:05:00	1969-12-31 17:22:22.356-07
lananaqcj6js8htau4	201hhgs7l4q7dbitig	2g43j83a271g9	55ku2fc:06	t	00:05:00	1969-12-31 17:22:24.683-07
lananaqcj6js8htau4	201hhgs7l4q7dbitig	caqm13mxzbdr	55ku2fc:06	t	00:05:00	1969-12-31 17:22:24.683-07
lananaqcj6js8htau4	952b4690knudbmit1l	3se2qu476j7tg	55oncwg:0v	t	00:05:00	1969-12-31 17:42:07.203-07
lananaqcj6js8htau4	lvpf42ev6b3jadc3g9	3t09dyzubc9zp	55ku2fc:0a	t	00:05:00	1969-12-31 17:22:30.45-07
lananaqcj6js8htau4	lvpf42ev6b3jadc3g9	3unh7411ka0tz	55ku2fc:0a	t	00:05:00	1969-12-31 17:22:30.45-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	3se2qu476j7tg	55lwjg8:02	t	00:05:00	1969-12-31 17:25:55.834-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	caqm13mxzbdr	55lwjg8:02	t	00:05:00	1969-12-31 17:25:55.834-07
lananaqcj6js8htau4	k8icf8eeol5oa364ki	817el2k23zdp	55lwjg8:02	t	00:05:00	1969-12-31 17:25:55.834-07
lananaqcj6js8htau4	lvpf42ev6b3jadc3g9	817el2k23zdp	55ku2fc:0b	t	00:05:00	1969-12-31 17:22:34.979-07
lananaqcj6js8htau4	lvpf42ev6b3jadc3g9	gt8yfqbqc7ca	55ku2fc:0b	t	00:05:00	1969-12-31 17:22:34.979-07
lananaqcj6js8htau4	lvpf42ev6b3jadc3g9	2blc6xwom46ss	55ku2fc:0b	t	00:05:00	1969-12-31 17:22:34.979-07
lananaqcj6js8htau4	lvpf42ev6b3jadc3g9	3rnpsi5qegpt3	55ku2fc:0b	t	00:05:00	1969-12-31 17:22:34.979-07
lananaqcj6js8htau4	lvpf42ev6b3jadc3g9	3se2qu476j7tg	55ku2fc:0b	t	00:05:00	1969-12-31 17:22:34.979-07
lananaqcj6js8htau4	cs2ia66j2octitb2p5	2g43j83a271g9	55ku2fc:0c	t	00:05:00	1969-12-31 17:22:45.624-07
lananaqcj6js8htau4	cs2ia66j2octitb2p5	gt8yfqbqc7ca	55ku2fc:0c	t	00:05:00	1969-12-31 17:22:45.624-07
lananaqcj6js8htau4	cs2ia66j2octitb2p5	2blc6xwom46ss	55ku2fc:0c	t	00:05:00	1969-12-31 17:22:45.624-07
lananaqcj6js8htau4	cs2ia66j2octitb2p5	3rnpsi5qegpt3	55ku2fc:0c	t	00:05:00	1969-12-31 17:22:45.624-07
lananaqcj6js8htau4	cs2ia66j2octitb2p5	3se2qu476j7tg	55ku2fc:0c	t	00:05:00	1969-12-31 17:22:45.624-07
lananaqcj6js8htau4	cs2ia66j2octitb2p5	caqm13mxzbdr	55ku2fc:0c	t	00:05:00	1969-12-31 17:22:45.624-07
lananaqcj6js8htau4	cs2ia66j2octitb2p5	817el2k23zdp	55ku2fc:0c	t	00:05:00	1969-12-31 17:22:45.624-07
lananaqcj6js8htau4	da9qkgv8e1quqifebt	2g43j83a271g9	55ku2fc:0d	t	00:05:00	1969-12-31 17:22:58.486-07
lananaqcj6js8htau4	da9qkgv8e1quqifebt	gt8yfqbqc7ca	55ku2fc:0d	t	00:05:00	1969-12-31 17:22:58.486-07
lananaqcj6js8htau4	da9qkgv8e1quqifebt	2blc6xwom46ss	55ku2fc:0d	t	00:05:00	1969-12-31 17:22:58.486-07
lananaqcj6js8htau4	da9qkgv8e1quqifebt	3rnpsi5qegpt3	55ku2fc:0d	t	00:05:00	1969-12-31 17:22:58.486-07
lananaqcj6js8htau4	da9qkgv8e1quqifebt	3se2qu476j7tg	55ku2fc:0d	t	00:05:00	1969-12-31 17:22:58.486-07
lananaqcj6js8htau4	da9qkgv8e1quqifebt	caqm13mxzbdr	55ku2fc:0d	t	00:05:00	1969-12-31 17:22:58.486-07
lananaqcj6js8htau4	da9qkgv8e1quqifebt	817el2k23zdp	55ku2fc:0d	t	00:05:00	1969-12-31 17:22:58.486-07
lananaqcj6js8htau4	s09rrqfe9drrgig5s1	2blc6xwom46ss	55l0pe8:04	t	00:05:00	1969-12-31 17:23:37.296-07
lananaqcj6js8htau4	s09rrqfe9drrgig5s1	2g43j83a271g9	55l0pe8:04	t	00:05:00	1969-12-31 17:23:37.296-07
lananaqcj6js8htau4	s09rrqfe9drrgig5s1	3rnpsi5qegpt3	55l0pe8:04	t	00:05:00	1969-12-31 17:23:37.296-07
lananaqcj6js8htau4	s09rrqfe9drrgig5s1	3se2qu476j7tg	55l0pe8:04	t	00:05:00	1969-12-31 17:23:37.296-07
lananaqcj6js8htau4	s09rrqfe9drrgig5s1	817el2k23zdp	55l0pe8:04	t	00:05:00	1969-12-31 17:23:37.296-07
lananaqcj6js8htau4	s09rrqfe9drrgig5s1	caqm13mxzbdr	55l0pe8:04	t	00:05:00	1969-12-31 17:23:37.296-07
lananaqcj6js8htau4	s09rrqfe9drrgig5s1	gt8yfqbqc7ca	55l0pe8:04	t	00:05:00	1969-12-31 17:23:37.296-07
lananaqcj6js8htau4	b3tpblgutqkp5mgpvk	2g43j83a271g9	55l0pe8:08	t	00:05:00	1969-12-31 17:23:45.741-07
lananaqcj6js8htau4	b3tpblgutqkp5mgpvk	gt8yfqbqc7ca	55l0pe8:08	t	00:05:00	1969-12-31 17:23:45.741-07
lananaqcj6js8htau4	b3tpblgutqkp5mgpvk	2blc6xwom46ss	55l0pe8:08	t	00:05:00	1969-12-31 17:23:45.741-07
lananaqcj6js8htau4	b3tpblgutqkp5mgpvk	3rnpsi5qegpt3	55l0pe8:08	t	00:05:00	1969-12-31 17:23:45.741-07
lananaqcj6js8htau4	b3tpblgutqkp5mgpvk	817el2k23zdp	55l0pe8:08	t	00:05:00	1969-12-31 17:23:45.741-07
lananaqcj6js8htau4	b3tpblgutqkp5mgpvk	3se2qu476j7tg	55l0pe8:08	t	00:05:00	1969-12-31 17:23:45.741-07
lananaqcj6js8htau4	b3tpblgutqkp5mgpvk	caqm13mxzbdr	55l0pe8:08	t	00:05:00	1969-12-31 17:23:45.741-07
lananaqcj6js8htau4	2gmnvt358q00fb6gfu	2g43j83a271g9	55l0pe8:09	t	00:05:00	1969-12-31 17:23:52.554-07
lananaqcj6js8htau4	2gmnvt358q00fb6gfu	gt8yfqbqc7ca	55l0pe8:09	t	00:05:00	1969-12-31 17:23:52.554-07
lananaqcj6js8htau4	2gmnvt358q00fb6gfu	2blc6xwom46ss	55l0pe8:09	t	00:05:00	1969-12-31 17:23:52.554-07
lananaqcj6js8htau4	2gmnvt358q00fb6gfu	3rnpsi5qegpt3	55l0pe8:09	t	00:05:00	1969-12-31 17:23:52.554-07
lananaqcj6js8htau4	2gmnvt358q00fb6gfu	3se2qu476j7tg	55l0pe8:09	t	00:05:00	1969-12-31 17:23:52.554-07
lananaqcj6js8htau4	2gmnvt358q00fb6gfu	caqm13mxzbdr	55l0pe8:09	t	00:05:00	1969-12-31 17:23:52.554-07
lananaqcj6js8htau4	2gmnvt358q00fb6gfu	817el2k23zdp	55l0pe8:09	t	00:05:00	1969-12-31 17:23:52.554-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	2vp6wa4hseasz	55l9bhk:01	t	00:05:00	1969-12-31 17:24:01.945-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	30cgn5q2a6wny	55l9bhk:01	t	00:05:00	1969-12-31 17:24:01.945-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	343u9rvx540f6	55l9bhk:01	t	00:05:00	1969-12-31 17:24:01.945-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	1vk9itlfaultr	55l9bhk:01	t	00:05:00	1969-12-31 17:24:01.945-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	2g43j83a271g9	55l9bhk:02	t	00:05:00	1969-12-31 17:24:02.325-07
lananaqcj6js8htau4	jgofms6244rvorgnbo	2blc6xwom46ss	55l9bhk:03	t	00:05:00	1969-12-31 17:24:03.855-07
lananaqcj6js8htau4	jgofms6244rvorgnbo	2g43j83a271g9	55l9bhk:03	t	00:05:00	1969-12-31 17:24:03.855-07
lananaqcj6js8htau4	jgofms6244rvorgnbo	3rnpsi5qegpt3	55l9bhk:03	t	00:05:00	1969-12-31 17:24:03.855-07
lananaqcj6js8htau4	jgofms6244rvorgnbo	3se2qu476j7tg	55l9bhk:03	t	00:05:00	1969-12-31 17:24:03.855-07
lananaqcj6js8htau4	jgofms6244rvorgnbo	817el2k23zdp	55l9bhk:03	t	00:05:00	1969-12-31 17:24:03.855-07
lananaqcj6js8htau4	jgofms6244rvorgnbo	caqm13mxzbdr	55l9bhk:03	t	00:05:00	1969-12-31 17:24:03.855-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	gt8yfqbqc7ca	55l9bhk:02	t	00:05:00	1969-12-31 17:24:02.325-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	2blc6xwom46ss	55l9bhk:02	t	00:05:00	1969-12-31 17:24:02.325-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	3rnpsi5qegpt3	55l9bhk:02	t	00:05:00	1969-12-31 17:24:02.325-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	3se2qu476j7tg	55l9bhk:02	t	00:05:00	1969-12-31 17:24:02.325-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	caqm13mxzbdr	55l9bhk:02	t	00:05:00	1969-12-31 17:24:02.325-07
lananaqcj6js8htau4	7bo3q5o6oi0f6hl7v3	817el2k23zdp	55l9bhk:02	t	00:05:00	1969-12-31 17:24:02.325-07
lananaqcj6js8htau4	952b4690knudbmit1l	817el2k23zdp	55oncwg:0u	t	00:05:00	1969-12-31 17:41:58.544-07
lananaqcj6js8htau4	jgofms6244rvorgnbo	gt8yfqbqc7ca	55l9bhk:03	t	00:05:00	1969-12-31 17:24:03.855-07
s7a0o435h2ri4c12g5	bcvsofqv4rvlkktnh2	2g43j83a271g9	00:01	f	00:05:00	\N
amdndj578iksr3ndab	riv4miuulodnelhiu9	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	cm6jjihhc9g4ssujmo	2g43j83a271g9	55s721c:12i	t	00:05:00	1969-12-31 18:12:48.757-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	2g43j83a271g9	55leiu0:03	t	00:05:00	1969-12-31 17:24:54.975-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	gt8yfqbqc7ca	55leiu0:03	t	00:05:00	1969-12-31 17:24:54.975-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	2blc6xwom46ss	55leiu0:03	t	00:05:00	1969-12-31 17:24:54.975-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	3rnpsi5qegpt3	55leiu0:03	t	00:05:00	1969-12-31 17:24:54.975-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	3se2qu476j7tg	55leiu0:03	t	00:05:00	1969-12-31 17:24:54.975-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	caqm13mxzbdr	55leiu0:03	t	00:05:00	1969-12-31 17:24:54.975-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	817el2k23zdp	55leiu0:03	t	00:05:00	1969-12-31 17:24:54.975-07
lananaqcj6js8htau4	ie9tqme6890kpjpp2c	2g43j83a271g9	55s721c:0l	t	00:05:00	1969-12-31 18:03:44.445-07
lananaqcj6js8htau4	8ntj5fdsd9634iuahc	2g43j83a271g9	55oncwg:0w	t	00:05:00	1969-12-31 17:42:13.04-07
lananaqcj6js8htau4	8ntj5fdsd9634iuahc	caqm13mxzbdr	55oncwg:0w	t	00:05:00	1969-12-31 17:42:13.04-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	2wha4nxhfryk5	55lcleo:02	t	00:05:00	1969-12-31 17:24:20.663-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	i50mbufn38bb	55lcleo:02	t	00:05:00	1969-12-31 17:24:20.663-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	a9fx3bveruwk	55lcleo:02	t	00:05:00	1969-12-31 17:24:20.663-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	1h040veoau8up	55lwjg8:08	t	00:05:00	1969-12-31 17:26:06.517-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	32m30za7qqkmt	55leiu0:02	t	00:05:00	1969-12-31 17:24:47.867-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	5fznhcfgml00	55leiu0:02	t	00:05:00	1969-12-31 17:24:47.867-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	343u9rvx540f6	55leiu0:02	t	00:05:00	1969-12-31 17:24:47.867-07
lananaqcj6js8htau4	q6bjf8tb1f4b6ab4r1	17pe85lz3g2fv	55leiu0:02	t	00:05:00	1969-12-31 17:24:47.867-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	3se2qu476j7tg	55m0xcg:04	t	00:05:00	1969-12-31 17:26:36.221-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	caqm13mxzbdr	55m0xcg:04	t	00:05:00	1969-12-31 17:26:36.221-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	817el2k23zdp	55m0xcg:04	t	00:05:00	1969-12-31 17:26:36.221-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	2g43j83a271g9	55m0xcg:05	t	00:05:00	1969-12-31 17:26:44.704-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	gt8yfqbqc7ca	55m0xcg:05	t	00:05:00	1969-12-31 17:26:44.704-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	2blc6xwom46ss	55m0xcg:05	t	00:05:00	1969-12-31 17:26:44.704-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	3rnpsi5qegpt3	55m0xcg:05	t	00:05:00	1969-12-31 17:26:44.704-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	1oisugrazbrw2	55m0xcg:05	t	00:05:00	1969-12-31 17:26:44.704-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	3kpx9tkeqc8r2	55m0xcg:05	t	00:05:00	1969-12-31 17:26:44.704-07
lananaqcj6js8htau4	vfcpojdc6fjogbffe3	310t54w26gnab	55m0xcg:05	t	00:05:00	1969-12-31 17:26:44.704-07
lananaqcj6js8htau4	ouk41lk03p0mpanhpu	1oisugrazbrw2	55m0xcg:06	t	00:05:00	1969-12-31 17:26:45.745-07
lananaqcj6js8htau4	ouk41lk03p0mpanhpu	2blc6xwom46ss	55m0xcg:06	t	00:05:00	1969-12-31 17:26:45.745-07
lananaqcj6js8htau4	ouk41lk03p0mpanhpu	2g43j83a271g9	55m0xcg:06	t	00:05:00	1969-12-31 17:26:45.745-07
lananaqcj6js8htau4	ouk41lk03p0mpanhpu	310t54w26gnab	55m0xcg:06	t	00:05:00	1969-12-31 17:26:45.745-07
lananaqcj6js8htau4	ouk41lk03p0mpanhpu	343u9rvx540f6	55m0xcg:06	t	00:05:00	1969-12-31 17:26:45.745-07
lananaqcj6js8htau4	ouk41lk03p0mpanhpu	3kpx9tkeqc8r2	55m0xcg:06	t	00:05:00	1969-12-31 17:26:45.745-07
lananaqcj6js8htau4	ouk41lk03p0mpanhpu	3rnpsi5qegpt3	55m0xcg:06	t	00:05:00	1969-12-31 17:26:45.745-07
lananaqcj6js8htau4	ouk41lk03p0mpanhpu	gt8yfqbqc7ca	55m0xcg:06	t	00:05:00	1969-12-31 17:26:45.745-07
lananaqcj6js8htau4	bbrmu84bnr2an5kh3p	2g43j83a271g9	55m0xcg:07	t	00:05:00	1969-12-31 17:26:53.153-07
lananaqcj6js8htau4	bbrmu84bnr2an5kh3p	gt8yfqbqc7ca	55m0xcg:07	t	00:05:00	1969-12-31 17:26:53.153-07
lananaqcj6js8htau4	bbrmu84bnr2an5kh3p	2blc6xwom46ss	55m0xcg:07	t	00:05:00	1969-12-31 17:26:53.153-07
lananaqcj6js8htau4	bbrmu84bnr2an5kh3p	3rnpsi5qegpt3	55m0xcg:07	t	00:05:00	1969-12-31 17:26:53.153-07
lananaqcj6js8htau4	bbrmu84bnr2an5kh3p	1oisugrazbrw2	55m0xcg:07	t	00:05:00	1969-12-31 17:26:53.153-07
lananaqcj6js8htau4	bbrmu84bnr2an5kh3p	3kpx9tkeqc8r2	55m0xcg:07	t	00:05:00	1969-12-31 17:26:53.153-07
lananaqcj6js8htau4	bbrmu84bnr2an5kh3p	343u9rvx540f6	55m0xcg:07	t	00:05:00	1969-12-31 17:26:53.153-07
lananaqcj6js8htau4	bbrmu84bnr2an5kh3p	310t54w26gnab	55m0xcg:07	t	00:05:00	1969-12-31 17:26:53.153-07
lananaqcj6js8htau4	riip4or7uvip2gq4cv	2g43j83a271g9	55m0xcg:08	t	00:05:00	1969-12-31 17:27:01.189-07
lananaqcj6js8htau4	riip4or7uvip2gq4cv	gt8yfqbqc7ca	55m0xcg:08	t	00:05:00	1969-12-31 17:27:01.189-07
lananaqcj6js8htau4	riip4or7uvip2gq4cv	2blc6xwom46ss	55m0xcg:08	t	00:05:00	1969-12-31 17:27:01.189-07
lananaqcj6js8htau4	riip4or7uvip2gq4cv	3rnpsi5qegpt3	55m0xcg:08	t	00:05:00	1969-12-31 17:27:01.189-07
lananaqcj6js8htau4	riip4or7uvip2gq4cv	1oisugrazbrw2	55m0xcg:08	t	00:05:00	1969-12-31 17:27:01.189-07
lananaqcj6js8htau4	15usa5jc4iulg0gl12	gt8yfqbqc7ca	55m0xcg:0a	t	00:05:00	1969-12-31 17:27:12.137-07
lananaqcj6js8htau4	15usa5jc4iulg0gl12	2blc6xwom46ss	55m0xcg:0a	t	00:05:00	1969-12-31 17:27:12.137-07
lananaqcj6js8htau4	15usa5jc4iulg0gl12	3kpx9tkeqc8r2	55m0xcg:0a	t	00:05:00	1969-12-31 17:27:12.137-07
lananaqcj6js8htau4	15usa5jc4iulg0gl12	3rnpsi5qegpt3	55m0xcg:0a	t	00:05:00	1969-12-31 17:27:12.137-07
lananaqcj6js8htau4	15usa5jc4iulg0gl12	1oisugrazbrw2	55m0xcg:0a	t	00:05:00	1969-12-31 17:27:12.137-07
lananaqcj6js8htau4	15usa5jc4iulg0gl12	343u9rvx540f6	55m0xcg:0a	t	00:05:00	1969-12-31 17:27:12.137-07
lananaqcj6js8htau4	15usa5jc4iulg0gl12	310t54w26gnab	55m0xcg:0a	t	00:05:00	1969-12-31 17:27:12.137-07
lananaqcj6js8htau4	15usa5jc4iulg0gl12	2g43j83a271g9	55m0xcg:0b	t	00:05:00	1969-12-31 17:27:12.645-07
lananaqcj6js8htau4	riip4or7uvip2gq4cv	3kpx9tkeqc8r2	55m0xcg:08	t	00:05:00	1969-12-31 17:27:01.189-07
lananaqcj6js8htau4	riip4or7uvip2gq4cv	343u9rvx540f6	55m0xcg:08	t	00:05:00	1969-12-31 17:27:01.189-07
lananaqcj6js8htau4	riip4or7uvip2gq4cv	310t54w26gnab	55m0xcg:08	t	00:05:00	1969-12-31 17:27:01.189-07
lananaqcj6js8htau4	ie9tqme6890kpjpp2c	3t09dyzubc9zp	55s721c:0l	t	00:05:00	1969-12-31 18:03:44.445-07
lananaqcj6js8htau4	ie9tqme6890kpjpp2c	3unh7411ka0tz	55s721c:0l	t	00:05:00	1969-12-31 18:03:44.445-07
lananaqcj6js8htau4	15usa5jc4iulg0gl12	caqm13mxzbdr	55m0xcg:0b	t	00:05:00	1969-12-31 17:27:12.645-07
lananaqcj6js8htau4	m2l1f2a7dheolpvrng	2g43j83a271g9	55m0xcg:0c	t	00:05:00	1969-12-31 17:27:20.831-07
lananaqcj6js8htau4	m2l1f2a7dheolpvrng	caqm13mxzbdr	55m0xcg:0c	t	00:05:00	1969-12-31 17:27:20.831-07
lananaqcj6js8htau4	9dmuonrgeuuuao60pi	2g43j83a271g9	55m0xcg:0e	t	00:05:00	1969-12-31 17:27:36.812-07
lananaqcj6js8htau4	9dmuonrgeuuuao60pi	caqm13mxzbdr	55m0xcg:0e	t	00:05:00	1969-12-31 17:27:36.812-07
lananaqcj6js8htau4	ro9so7vrerl1p6m3od	2g43j83a271g9	55m0xcg:0f	t	00:05:00	1969-12-31 17:27:50.057-07
lananaqcj6js8htau4	ro9so7vrerl1p6m3od	caqm13mxzbdr	55m0xcg:0f	t	00:05:00	1969-12-31 17:27:50.057-07
lananaqcj6js8htau4	3v79b31b6bt1dn7hsm	2g43j83a271g9	55m0xcg:0g	t	00:05:00	1969-12-31 17:27:51.075-07
lananaqcj6js8htau4	3v79b31b6bt1dn7hsm	caqm13mxzbdr	55m0xcg:0g	t	00:05:00	1969-12-31 17:27:51.075-07
lananaqcj6js8htau4	iktj8ep0gg9r9qmvna	2g43j83a271g9	55m0xcg:0h	t	00:05:00	1969-12-31 17:28:16.332-07
lananaqcj6js8htau4	iktj8ep0gg9r9qmvna	caqm13mxzbdr	55m0xcg:0h	t	00:05:00	1969-12-31 17:28:16.332-07
lananaqcj6js8htau4	hqp2t8ti1gamsb0k37	2g43j83a271g9	55m0xcg:0i	t	00:05:00	1969-12-31 17:29:01.795-07
lananaqcj6js8htau4	hqp2t8ti1gamsb0k37	caqm13mxzbdr	55m0xcg:0i	t	00:05:00	1969-12-31 17:29:01.795-07
lananaqcj6js8htau4	25oro7n3s47pmgp0qt	2g43j83a271g9	55m0xcg:0k	t	00:05:00	1969-12-31 17:29:52.08-07
lananaqcj6js8htau4	25oro7n3s47pmgp0qt	caqm13mxzbdr	55m0xcg:0k	t	00:05:00	1969-12-31 17:29:52.08-07
lananaqcj6js8htau4	02hiehv4pv3mru5830	2g43j83a271g9	55m0xcg:0l	t	00:05:00	1969-12-31 17:30:22-07
lananaqcj6js8htau4	02hiehv4pv3mru5830	caqm13mxzbdr	55m0xcg:0l	t	00:05:00	1969-12-31 17:30:22-07
lananaqcj6js8htau4	jfsj7vf5j72kcnv1vg	2g43j83a271g9	55m0xcg:0n	t	00:05:00	1969-12-31 17:30:32.617-07
lananaqcj6js8htau4	jfsj7vf5j72kcnv1vg	caqm13mxzbdr	55m0xcg:0n	t	00:05:00	1969-12-31 17:30:32.617-07
lananaqcj6js8htau4	jfsj7vf5j72kcnv1vg	2blc6xwom46ss	55m0xcg:0n	t	00:05:00	1969-12-31 17:30:32.617-07
lananaqcj6js8htau4	jfsj7vf5j72kcnv1vg	3rnpsi5qegpt3	55m0xcg:0n	t	00:05:00	1969-12-31 17:30:32.617-07
lananaqcj6js8htau4	5susjm7dfm4kt7n7nq	2g43j83a271g9	55m0xcg:0o	t	00:05:00	1969-12-31 17:30:37.605-07
lananaqcj6js8htau4	5susjm7dfm4kt7n7nq	caqm13mxzbdr	55m0xcg:0o	t	00:05:00	1969-12-31 17:30:37.605-07
lananaqcj6js8htau4	5susjm7dfm4kt7n7nq	2blc6xwom46ss	55m0xcg:0o	t	00:05:00	1969-12-31 17:30:37.605-07
lananaqcj6js8htau4	5susjm7dfm4kt7n7nq	3rnpsi5qegpt3	55m0xcg:0o	t	00:05:00	1969-12-31 17:30:37.605-07
lananaqcj6js8htau4	g44btnco5m6lskp8kh	2blc6xwom46ss	55m0xcg:0p	t	00:05:00	1969-12-31 17:30:38.586-07
lananaqcj6js8htau4	g44btnco5m6lskp8kh	2g43j83a271g9	55m0xcg:0p	t	00:05:00	1969-12-31 17:30:38.586-07
lananaqcj6js8htau4	g44btnco5m6lskp8kh	3rnpsi5qegpt3	55m0xcg:0p	t	00:05:00	1969-12-31 17:30:38.586-07
lananaqcj6js8htau4	g44btnco5m6lskp8kh	caqm13mxzbdr	55m0xcg:0p	t	00:05:00	1969-12-31 17:30:38.586-07
lananaqcj6js8htau4	4041somun2s4cg3t1l	2blc6xwom46ss	55m0xcg:0q	t	00:05:00	1969-12-31 17:30:39.223-07
lananaqcj6js8htau4	4041somun2s4cg3t1l	2g43j83a271g9	55m0xcg:0q	t	00:05:00	1969-12-31 17:30:39.223-07
lananaqcj6js8htau4	4041somun2s4cg3t1l	3rnpsi5qegpt3	55m0xcg:0q	t	00:05:00	1969-12-31 17:30:39.223-07
lananaqcj6js8htau4	4041somun2s4cg3t1l	caqm13mxzbdr	55m0xcg:0q	t	00:05:00	1969-12-31 17:30:39.223-07
lananaqcj6js8htau4	pfmb2eijo685i2eod4	2g43j83a271g9	55m0xcg:0s	t	00:05:00	1969-12-31 17:30:42.884-07
lananaqcj6js8htau4	pfmb2eijo685i2eod4	caqm13mxzbdr	55m0xcg:0s	t	00:05:00	1969-12-31 17:30:42.884-07
lananaqcj6js8htau4	pfmb2eijo685i2eod4	2blc6xwom46ss	55m0xcg:0s	t	00:05:00	1969-12-31 17:30:42.884-07
lananaqcj6js8htau4	pfmb2eijo685i2eod4	3rnpsi5qegpt3	55m0xcg:0s	t	00:05:00	1969-12-31 17:30:42.884-07
lananaqcj6js8htau4	2ab7cklmjcil8potel	2blc6xwom46ss	55m0xcg:0t	t	00:05:00	1969-12-31 17:30:43.692-07
lananaqcj6js8htau4	2ab7cklmjcil8potel	2g43j83a271g9	55m0xcg:0t	t	00:05:00	1969-12-31 17:30:43.692-07
lananaqcj6js8htau4	2ab7cklmjcil8potel	3rnpsi5qegpt3	55m0xcg:0t	t	00:05:00	1969-12-31 17:30:43.692-07
lananaqcj6js8htau4	2ab7cklmjcil8potel	caqm13mxzbdr	55m0xcg:0t	t	00:05:00	1969-12-31 17:30:43.692-07
lananaqcj6js8htau4	8oibor2g40jg9rcdkf	2g43j83a271g9	55n1lqw:03	t	00:05:00	1969-12-31 17:31:07.589-07
lananaqcj6js8htau4	8oibor2g40jg9rcdkf	caqm13mxzbdr	55n1lqw:03	t	00:05:00	1969-12-31 17:31:07.589-07
lananaqcj6js8htau4	8oibor2g40jg9rcdkf	2blc6xwom46ss	55n1lqw:03	t	00:05:00	1969-12-31 17:31:07.589-07
lananaqcj6js8htau4	8oibor2g40jg9rcdkf	3rnpsi5qegpt3	55n1lqw:03	t	00:05:00	1969-12-31 17:31:07.589-07
lananaqcj6js8htau4	1bjda2rltl573077e8	2g43j83a271g9	55n1lqw:04	t	00:05:00	1969-12-31 17:31:14.854-07
lananaqcj6js8htau4	1bjda2rltl573077e8	caqm13mxzbdr	55n1lqw:04	t	00:05:00	1969-12-31 17:31:14.854-07
lananaqcj6js8htau4	1bjda2rltl573077e8	2blc6xwom46ss	55n1lqw:04	t	00:05:00	1969-12-31 17:31:14.854-07
lananaqcj6js8htau4	1bjda2rltl573077e8	3rnpsi5qegpt3	55n1lqw:04	t	00:05:00	1969-12-31 17:31:14.854-07
lananaqcj6js8htau4	heitkqae25llifrcgn	2blc6xwom46ss	55n1lqw:05	t	00:05:00	1969-12-31 17:31:15.895-07
lananaqcj6js8htau4	heitkqae25llifrcgn	2g43j83a271g9	55n1lqw:05	t	00:05:00	1969-12-31 17:31:15.895-07
lananaqcj6js8htau4	heitkqae25llifrcgn	3rnpsi5qegpt3	55n1lqw:05	t	00:05:00	1969-12-31 17:31:15.895-07
lananaqcj6js8htau4	heitkqae25llifrcgn	caqm13mxzbdr	55n1lqw:05	t	00:05:00	1969-12-31 17:31:15.895-07
lananaqcj6js8htau4	ip1g8694d5f48ddhsk	2g43j83a271g9	55n1lqw:08	t	00:05:00	1969-12-31 17:31:30.626-07
lananaqcj6js8htau4	ip1g8694d5f48ddhsk	caqm13mxzbdr	55n1lqw:08	t	00:05:00	1969-12-31 17:31:30.626-07
lananaqcj6js8htau4	ip1g8694d5f48ddhsk	2blc6xwom46ss	55n1lqw:08	t	00:05:00	1969-12-31 17:31:30.626-07
lananaqcj6js8htau4	ip1g8694d5f48ddhsk	3rnpsi5qegpt3	55n1lqw:08	t	00:05:00	1969-12-31 17:31:30.626-07
lananaqcj6js8htau4	g9q25t6hlaguvuj8nc	2blc6xwom46ss	55n1lqw:0a	t	00:05:00	1969-12-31 17:31:36.288-07
lananaqcj6js8htau4	g9q25t6hlaguvuj8nc	3rnpsi5qegpt3	55n1lqw:0a	t	00:05:00	1969-12-31 17:31:36.288-07
lananaqcj6js8htau4	g9q25t6hlaguvuj8nc	2g43j83a271g9	55n1lqw:0b	t	00:05:00	1969-12-31 17:31:39.844-07
lananaqcj6js8htau4	g9q25t6hlaguvuj8nc	caqm13mxzbdr	55n1lqw:0b	t	00:05:00	1969-12-31 17:31:39.844-07
lananaqcj6js8htau4	8a84hi1tqmqgugdd4p	2g43j83a271g9	55n1lqw:0c	t	00:05:00	1969-12-31 17:31:46.185-07
lananaqcj6js8htau4	3l3jpj692gjntq7sf8	2g43j83a271g9	55n1lqw:0i	t	00:05:00	1969-12-31 17:32:36.818-07
lananaqcj6js8htau4	8a84hi1tqmqgugdd4p	caqm13mxzbdr	55n1lqw:0c	t	00:05:00	1969-12-31 17:31:46.185-07
lananaqcj6js8htau4	ie9tqme6890kpjpp2c	817el2k23zdp	55s721c:0l	t	00:05:00	1969-12-31 18:03:44.445-07
lananaqcj6js8htau4	nqufvhpv0o76o42rgr	2g43j83a271g9	55s721c:11b	t	00:05:00	1969-12-31 18:07:56.499-07
lananaqcj6js8htau4	8ntj5fdsd9634iuahc	2blc6xwom46ss	55oncwg:0w	t	00:05:00	1969-12-31 17:42:13.04-07
lananaqcj6js8htau4	8ntj5fdsd9634iuahc	3se2qu476j7tg	55oncwg:0w	t	00:05:00	1969-12-31 17:42:13.04-07
lananaqcj6js8htau4	8r9pnr7uotgs9iupcj	2blc6xwom46ss	55oncwg:0x	t	00:05:00	1969-12-31 17:42:13.095-07
lananaqcj6js8htau4	8r9pnr7uotgs9iupcj	3se2qu476j7tg	55oncwg:0x	t	00:05:00	1969-12-31 17:42:13.095-07
lananaqcj6js8htau4	nqufvhpv0o76o42rgr	3t09dyzubc9zp	55s721c:11b	t	00:05:00	1969-12-31 18:07:56.499-07
lananaqcj6js8htau4	nqufvhpv0o76o42rgr	3unh7411ka0tz	55s721c:11b	t	00:05:00	1969-12-31 18:07:56.499-07
lananaqcj6js8htau4	kol2ak1mo2autbpij9	gt8yfqbqc7ca	55oncwg:11n	t	00:05:00	1969-12-31 17:42:37.924-07
lananaqcj6js8htau4	kol2ak1mo2autbpij9	351uuya4pj2ql	55oncwg:11n	t	00:05:00	1969-12-31 17:42:37.924-07
lananaqcj6js8htau4	kol2ak1mo2autbpij9	3rnpsi5qegpt3	55oncwg:11s	t	00:05:00	1969-12-31 17:42:44.226-07
lananaqcj6js8htau4	62k1t0e5teb444i5t7	2g43j83a271g9	55oncwg:120	t	00:05:00	1969-12-31 17:43:34.635-07
lananaqcj6js8htau4	62k1t0e5teb444i5t7	caqm13mxzbdr	55oncwg:120	t	00:05:00	1969-12-31 17:43:34.635-07
lananaqcj6js8htau4	62k1t0e5teb444i5t7	2blc6xwom46ss	55oncwg:120	t	00:05:00	1969-12-31 17:43:34.635-07
lananaqcj6js8htau4	62k1t0e5teb444i5t7	3rnpsi5qegpt3	55oncwg:120	t	00:05:00	1969-12-31 17:43:34.635-07
lananaqcj6js8htau4	2dt4mct0r42ccatr0k	2g43j83a271g9	55oncwg:12c	t	00:05:00	1969-12-31 17:45:30.927-07
lananaqcj6js8htau4	2dt4mct0r42ccatr0k	caqm13mxzbdr	55oncwg:12c	t	00:05:00	1969-12-31 17:45:30.927-07
lananaqcj6js8htau4	2dt4mct0r42ccatr0k	2blc6xwom46ss	55oncwg:12c	t	00:05:00	1969-12-31 17:45:30.927-07
lananaqcj6js8htau4	2dt4mct0r42ccatr0k	3se2qu476j7tg	55oncwg:12c	t	00:05:00	1969-12-31 17:45:30.927-07
lananaqcj6js8htau4	ekvfg69tog2f0vftoo	2blc6xwom46ss	55oncwg:12d	t	00:05:00	1969-12-31 17:45:35.427-07
lananaqcj6js8htau4	ekvfg69tog2f0vftoo	2g43j83a271g9	55oncwg:12d	t	00:05:00	1969-12-31 17:45:35.427-07
lananaqcj6js8htau4	ekvfg69tog2f0vftoo	3se2qu476j7tg	55oncwg:12d	t	00:05:00	1969-12-31 17:45:35.427-07
lananaqcj6js8htau4	ekvfg69tog2f0vftoo	caqm13mxzbdr	55oncwg:12d	t	00:05:00	1969-12-31 17:45:35.427-07
lananaqcj6js8htau4	k35ut5n2en6m5bjo5m	caqm13mxzbdr	55oncwg:12i	t	00:05:00	1969-12-31 17:46:04.72-07
lananaqcj6js8htau4	k35ut5n2en6m5bjo5m	2blc6xwom46ss	55oncwg:12i	t	00:05:00	1969-12-31 17:46:04.72-07
lananaqcj6js8htau4	k35ut5n2en6m5bjo5m	3se2qu476j7tg	55oncwg:12i	t	00:05:00	1969-12-31 17:46:04.72-07
lananaqcj6js8htau4	e9tghmrb1fh4sb7sr9	2blc6xwom46ss	55poixs:09	t	00:05:00	1969-12-31 17:47:28.572-07
lananaqcj6js8htau4	e9tghmrb1fh4sb7sr9	2g43j83a271g9	55poixs:09	t	00:05:00	1969-12-31 17:47:28.572-07
lananaqcj6js8htau4	e9tghmrb1fh4sb7sr9	3se2qu476j7tg	55poixs:09	t	00:05:00	1969-12-31 17:47:28.572-07
lananaqcj6js8htau4	e9tghmrb1fh4sb7sr9	caqm13mxzbdr	55poixs:09	t	00:05:00	1969-12-31 17:47:28.572-07
lananaqcj6js8htau4	0r03rbfclho7jj95s8	2blc6xwom46ss	55poixs:0b	t	00:05:00	1969-12-31 17:47:31.235-07
lananaqcj6js8htau4	0r03rbfclho7jj95s8	3se2qu476j7tg	55poixs:0b	t	00:05:00	1969-12-31 17:47:31.235-07
lananaqcj6js8htau4	0r03rbfclho7jj95s8	caqm13mxzbdr	55poixs:0b	t	00:05:00	1969-12-31 17:47:31.235-07
lananaqcj6js8htau4	0r03rbfclho7jj95s8	2g43j83a271g9	55q2x20:01	t	00:05:00	1969-12-31 17:47:44.042-07
lananaqcj6js8htau4	0r03rbfclho7jj95s8	3t09dyzubc9zp	55q2x20:01	t	00:05:00	1969-12-31 17:47:44.042-07
lananaqcj6js8htau4	0r03rbfclho7jj95s8	3unh7411ka0tz	55q2x20:01	t	00:05:00	1969-12-31 17:47:44.042-07
lananaqcj6js8htau4	0r03rbfclho7jj95s8	817el2k23zdp	55q2x20:01	t	00:05:00	1969-12-31 17:47:44.042-07
lananaqcj6js8htau4	7b6nv11p35a97vvgtf	2g43j83a271g9	55q2x20:02	t	00:05:00	1969-12-31 17:48:16.62-07
lananaqcj6js8htau4	7b6nv11p35a97vvgtf	3t09dyzubc9zp	55q2x20:02	t	00:05:00	1969-12-31 17:48:16.62-07
lananaqcj6js8htau4	7b6nv11p35a97vvgtf	3unh7411ka0tz	55q2x20:02	t	00:05:00	1969-12-31 17:48:16.62-07
lananaqcj6js8htau4	7b6nv11p35a97vvgtf	817el2k23zdp	55q2x20:02	t	00:05:00	1969-12-31 17:48:16.62-07
lananaqcj6js8htau4	05vesg81g3mdtjv83l	2g43j83a271g9	55q2x20:03	t	00:05:00	1969-12-31 17:48:20.682-07
lananaqcj6js8htau4	05vesg81g3mdtjv83l	3t09dyzubc9zp	55q2x20:03	t	00:05:00	1969-12-31 17:48:20.682-07
lananaqcj6js8htau4	05vesg81g3mdtjv83l	3unh7411ka0tz	55q2x20:03	t	00:05:00	1969-12-31 17:48:20.682-07
lananaqcj6js8htau4	05vesg81g3mdtjv83l	817el2k23zdp	55q2x20:03	t	00:05:00	1969-12-31 17:48:20.682-07
lananaqcj6js8htau4	jo9muv4n1lbja47f87	2g43j83a271g9	55q2x20:04	t	00:05:00	1969-12-31 17:48:22.391-07
lananaqcj6js8htau4	jo9muv4n1lbja47f87	3t09dyzubc9zp	55q2x20:04	t	00:05:00	1969-12-31 17:48:22.391-07
lananaqcj6js8htau4	jo9muv4n1lbja47f87	3unh7411ka0tz	55q2x20:04	t	00:05:00	1969-12-31 17:48:22.391-07
lananaqcj6js8htau4	jo9muv4n1lbja47f87	817el2k23zdp	55q2x20:04	t	00:05:00	1969-12-31 17:48:22.391-07
lananaqcj6js8htau4	6iqs02ta4f4n9j0uj1	2g43j83a271g9	55q2x20:05	t	00:05:00	1969-12-31 17:49:06.007-07
lananaqcj6js8htau4	6iqs02ta4f4n9j0uj1	3t09dyzubc9zp	55q2x20:05	t	00:05:00	1969-12-31 17:49:06.007-07
lananaqcj6js8htau4	6iqs02ta4f4n9j0uj1	3unh7411ka0tz	55q2x20:05	t	00:05:00	1969-12-31 17:49:06.007-07
lananaqcj6js8htau4	6iqs02ta4f4n9j0uj1	817el2k23zdp	55q2x20:05	t	00:05:00	1969-12-31 17:49:06.007-07
lananaqcj6js8htau4	bsr5e2gf0fh8teevi7	2g43j83a271g9	55q2x20:06	t	00:05:00	1969-12-31 17:49:07.089-07
lananaqcj6js8htau4	bsr5e2gf0fh8teevi7	3t09dyzubc9zp	55q2x20:06	t	00:05:00	1969-12-31 17:49:07.089-07
lananaqcj6js8htau4	bsr5e2gf0fh8teevi7	3unh7411ka0tz	55q2x20:06	t	00:05:00	1969-12-31 17:49:07.089-07
lananaqcj6js8htau4	bsr5e2gf0fh8teevi7	817el2k23zdp	55q2x20:06	t	00:05:00	1969-12-31 17:49:07.089-07
lananaqcj6js8htau4	tlo4cdh2qoml31vdp9	2g43j83a271g9	55q2x20:07	t	00:05:00	1969-12-31 17:49:12.753-07
lananaqcj6js8htau4	tlo4cdh2qoml31vdp9	3t09dyzubc9zp	55q2x20:07	t	00:05:00	1969-12-31 17:49:12.753-07
lananaqcj6js8htau4	tlo4cdh2qoml31vdp9	3unh7411ka0tz	55q2x20:07	t	00:05:00	1969-12-31 17:49:12.753-07
lananaqcj6js8htau4	tlo4cdh2qoml31vdp9	817el2k23zdp	55q2x20:07	t	00:05:00	1969-12-31 17:49:12.753-07
lananaqcj6js8htau4	ta29jenaci1fqrt2gi	2g43j83a271g9	55q2x20:09	t	00:05:00	1969-12-31 17:49:20.981-07
lananaqcj6js8htau4	vaufibsaj9ejuis1j0	2g43j83a271g9	55q2x20:0a	t	00:05:00	1969-12-31 17:49:37.884-07
lananaqcj6js8htau4	vaufibsaj9ejuis1j0	3t09dyzubc9zp	55q2x20:0a	t	00:05:00	1969-12-31 17:49:37.884-07
lananaqcj6js8htau4	vaufibsaj9ejuis1j0	3unh7411ka0tz	55q2x20:0a	t	00:05:00	1969-12-31 17:49:37.884-07
lananaqcj6js8htau4	cm6jjihhc9g4ssujmo	3t09dyzubc9zp	55s721c:12i	t	00:05:00	1969-12-31 18:12:48.757-07
lananaqcj6js8htau4	t12eod2gs60pp25pmh	caqm13mxzbdr	55n1lqw:0f	t	00:05:00	1969-12-31 17:32:19.615-07
lananaqcj6js8htau4	cm6jjihhc9g4ssujmo	3unh7411ka0tz	55s721c:12i	t	00:05:00	1969-12-31 18:12:48.757-07
lananaqcj6js8htau4	cm6jjihhc9g4ssujmo	817el2k23zdp	55s721c:12i	t	00:05:00	1969-12-31 18:12:48.757-07
lananaqcj6js8htau4	3l3jpj692gjntq7sf8	caqm13mxzbdr	55n1lqw:0i	t	00:05:00	1969-12-31 17:32:36.818-07
lananaqcj6js8htau4	rf7lbmrn5dqr36acb0	2g43j83a271g9	55n1lqw:0j	t	00:05:00	1969-12-31 17:32:40.995-07
lananaqcj6js8htau4	rf7lbmrn5dqr36acb0	caqm13mxzbdr	55n1lqw:0j	t	00:05:00	1969-12-31 17:32:40.995-07
lananaqcj6js8htau4	8r9pnr7uotgs9iupcj	2g43j83a271g9	55oncwg:0x	t	00:05:00	1969-12-31 17:42:13.095-07
lananaqcj6js8htau4	8r9pnr7uotgs9iupcj	caqm13mxzbdr	55oncwg:0x	t	00:05:00	1969-12-31 17:42:13.095-07
lananaqcj6js8htau4	kol2ak1mo2autbpij9	3se2qu476j7tg	55oncwg:11q	t	00:05:00	1969-12-31 17:42:40.982-07
lananaqcj6js8htau4	kol2ak1mo2autbpij9	2g43j83a271g9	55oncwg:11s	t	00:05:00	1969-12-31 17:42:44.226-07
lananaqcj6js8htau4	kol2ak1mo2autbpij9	2blc6xwom46ss	55oncwg:11s	t	00:05:00	1969-12-31 17:42:44.226-07
lananaqcj6js8htau4	kol2ak1mo2autbpij9	caqm13mxzbdr	55oncwg:11s	t	00:05:00	1969-12-31 17:42:44.226-07
lananaqcj6js8htau4	62k1t0e5teb444i5t7	817el2k23zdp	55oncwg:11x	t	00:05:00	1969-12-31 17:43:01.674-07
lananaqcj6js8htau4	62k1t0e5teb444i5t7	3t09dyzubc9zp	55oncwg:11x	t	00:05:00	1969-12-31 17:43:01.674-07
lananaqcj6js8htau4	62k1t0e5teb444i5t7	3unh7411ka0tz	55oncwg:11x	t	00:05:00	1969-12-31 17:43:01.674-07
lananaqcj6js8htau4	62k1t0e5teb444i5t7	3se2qu476j7tg	55oncwg:11z	t	00:05:00	1969-12-31 17:43:03.441-07
lananaqcj6js8htau4	vcrv0ln4rrt4rdmk85	3rnpsi5qegpt3	55oncwg:122	t	00:05:00	1969-12-31 17:44:18.43-07
lananaqcj6js8htau4	vcrv0ln4rrt4rdmk85	2g43j83a271g9	55oncwg:123	t	00:05:00	1969-12-31 17:44:21.183-07
lananaqcj6js8htau4	vcrv0ln4rrt4rdmk85	caqm13mxzbdr	55oncwg:123	t	00:05:00	1969-12-31 17:44:21.183-07
lananaqcj6js8htau4	vcrv0ln4rrt4rdmk85	2blc6xwom46ss	55oncwg:123	t	00:05:00	1969-12-31 17:44:21.183-07
lananaqcj6js8htau4	15pdn5rq46shb48fa6	2g43j83a271g9	55oncwg:12e	t	00:05:00	1969-12-31 17:45:47.441-07
lananaqcj6js8htau4	15pdn5rq46shb48fa6	caqm13mxzbdr	55oncwg:12e	t	00:05:00	1969-12-31 17:45:47.441-07
lananaqcj6js8htau4	15pdn5rq46shb48fa6	2blc6xwom46ss	55oncwg:12e	t	00:05:00	1969-12-31 17:45:47.441-07
lananaqcj6js8htau4	15pdn5rq46shb48fa6	3se2qu476j7tg	55oncwg:12e	t	00:05:00	1969-12-31 17:45:47.441-07
lananaqcj6js8htau4	ittlmj1p6p1n8a7bs3	2g43j83a271g9	55poixs:02	t	00:05:00	1969-12-31 17:46:11.909-07
lananaqcj6js8htau4	ittlmj1p6p1n8a7bs3	caqm13mxzbdr	55poixs:02	t	00:05:00	1969-12-31 17:46:11.909-07
lananaqcj6js8htau4	ittlmj1p6p1n8a7bs3	2blc6xwom46ss	55poixs:02	t	00:05:00	1969-12-31 17:46:11.909-07
lananaqcj6js8htau4	ittlmj1p6p1n8a7bs3	3se2qu476j7tg	55poixs:02	t	00:05:00	1969-12-31 17:46:11.909-07
lananaqcj6js8htau4	ta29jenaci1fqrt2gi	3t09dyzubc9zp	55q2x20:09	t	00:05:00	1969-12-31 17:49:20.981-07
lananaqcj6js8htau4	ta29jenaci1fqrt2gi	3unh7411ka0tz	55q2x20:09	t	00:05:00	1969-12-31 17:49:20.981-07
lananaqcj6js8htau4	ta29jenaci1fqrt2gi	817el2k23zdp	55q2x20:09	t	00:05:00	1969-12-31 17:49:20.981-07
lananaqcj6js8htau4	vaufibsaj9ejuis1j0	817el2k23zdp	55q2x20:0a	t	00:05:00	1969-12-31 17:49:37.884-07
lananaqcj6js8htau4	ru6fduapo9530q51pm	2g43j83a271g9	55q2x20:0b	t	00:05:00	1969-12-31 17:50:07.261-07
lananaqcj6js8htau4	ru6fduapo9530q51pm	3t09dyzubc9zp	55q2x20:0b	t	00:05:00	1969-12-31 17:50:07.261-07
lananaqcj6js8htau4	ru6fduapo9530q51pm	3unh7411ka0tz	55q2x20:0b	t	00:05:00	1969-12-31 17:50:07.261-07
lananaqcj6js8htau4	ru6fduapo9530q51pm	817el2k23zdp	55q2x20:0b	t	00:05:00	1969-12-31 17:50:07.261-07
lananaqcj6js8htau4	m6cnc5dcdl8vuujdaq	3t09dyzubc9zp	55q2x20:0h	t	00:05:00	1969-12-31 17:51:42.296-07
lananaqcj6js8htau4	m6cnc5dcdl8vuujdaq	3unh7411ka0tz	55q2x20:0h	t	00:05:00	1969-12-31 17:51:42.296-07
lananaqcj6js8htau4	m6cnc5dcdl8vuujdaq	817el2k23zdp	55q2x20:0h	t	00:05:00	1969-12-31 17:51:42.296-07
lananaqcj6js8htau4	f7lvrl9p3sc40s2819	2g43j83a271g9	55q2x20:0k	t	00:05:00	1969-12-31 17:53:10.265-07
lananaqcj6js8htau4	f7lvrl9p3sc40s2819	3t09dyzubc9zp	55q2x20:0k	t	00:05:00	1969-12-31 17:53:10.265-07
lananaqcj6js8htau4	f7lvrl9p3sc40s2819	3unh7411ka0tz	55q2x20:0k	t	00:05:00	1969-12-31 17:53:10.265-07
lananaqcj6js8htau4	f7lvrl9p3sc40s2819	817el2k23zdp	55q2x20:0k	t	00:05:00	1969-12-31 17:53:10.265-07
lananaqcj6js8htau4	m2963mnsnbi30dg253	2g43j83a271g9	55q2x20:0l	t	00:05:00	1969-12-31 17:53:10.298-07
lananaqcj6js8htau4	m2963mnsnbi30dg253	3t09dyzubc9zp	55q2x20:0l	t	00:05:00	1969-12-31 17:53:10.298-07
lananaqcj6js8htau4	m2963mnsnbi30dg253	3unh7411ka0tz	55q2x20:0l	t	00:05:00	1969-12-31 17:53:10.298-07
lananaqcj6js8htau4	m2963mnsnbi30dg253	817el2k23zdp	55q2x20:0l	t	00:05:00	1969-12-31 17:53:10.298-07
lananaqcj6js8htau4	j0cmk5khv92qeuaic6	3t09dyzubc9zp	55q2x20:0m	t	00:05:00	1969-12-31 17:53:11.294-07
lananaqcj6js8htau4	j0cmk5khv92qeuaic6	3unh7411ka0tz	55q2x20:0m	t	00:05:00	1969-12-31 17:53:11.294-07
lananaqcj6js8htau4	j0cmk5khv92qeuaic6	817el2k23zdp	55q2x20:0m	t	00:05:00	1969-12-31 17:53:11.294-07
lananaqcj6js8htau4	r1vn4mv39kas1ktgv7	2g43j83a271g9	55q2x20:0n	t	00:05:00	1969-12-31 17:53:22.752-07
lananaqcj6js8htau4	r1vn4mv39kas1ktgv7	3t09dyzubc9zp	55q2x20:0n	t	00:05:00	1969-12-31 17:53:22.752-07
lananaqcj6js8htau4	r1vn4mv39kas1ktgv7	3unh7411ka0tz	55q2x20:0n	t	00:05:00	1969-12-31 17:53:22.752-07
lananaqcj6js8htau4	r1vn4mv39kas1ktgv7	817el2k23zdp	55q2x20:0n	t	00:05:00	1969-12-31 17:53:22.752-07
lananaqcj6js8htau4	d6m63kode4589q71a4	2g43j83a271g9	55q2x20:0o	t	00:05:00	1969-12-31 17:53:23.139-07
lananaqcj6js8htau4	d6m63kode4589q71a4	3t09dyzubc9zp	55q2x20:0o	t	00:05:00	1969-12-31 17:53:23.139-07
lananaqcj6js8htau4	d6m63kode4589q71a4	3unh7411ka0tz	55q2x20:0o	t	00:05:00	1969-12-31 17:53:23.139-07
lananaqcj6js8htau4	d6m63kode4589q71a4	817el2k23zdp	55q2x20:0o	t	00:05:00	1969-12-31 17:53:23.139-07
lananaqcj6js8htau4	i0f82a1crrq2m71sd4	2g43j83a271g9	55q2x20:0p	t	00:05:00	1969-12-31 17:53:23.766-07
lananaqcj6js8htau4	i0f82a1crrq2m71sd4	3t09dyzubc9zp	55q2x20:0p	t	00:05:00	1969-12-31 17:53:23.766-07
lananaqcj6js8htau4	i0f82a1crrq2m71sd4	3unh7411ka0tz	55q2x20:0p	t	00:05:00	1969-12-31 17:53:23.766-07
lananaqcj6js8htau4	l84fi8hlnf2ai3sbvb	2g43j83a271g9	55qzzhs:01	t	00:05:00	1969-12-31 17:54:01.484-07
lananaqcj6js8htau4	l84fi8hlnf2ai3sbvb	3t09dyzubc9zp	55qzzhs:01	t	00:05:00	1969-12-31 17:54:01.484-07
lananaqcj6js8htau4	l84fi8hlnf2ai3sbvb	3unh7411ka0tz	55qzzhs:01	t	00:05:00	1969-12-31 17:54:01.484-07
lananaqcj6js8htau4	l84fi8hlnf2ai3sbvb	817el2k23zdp	55qzzhs:01	t	00:05:00	1969-12-31 17:54:01.484-07
lananaqcj6js8htau4	t12eod2gs60pp25pmh	2g43j83a271g9	55n1lqw:0f	t	00:05:00	1969-12-31 17:32:19.615-07
lananaqcj6js8htau4	uan37vhvdlumefv3v6	2g43j83a271g9	55s721c:0m	t	00:05:00	1969-12-31 18:03:57.026-07
lananaqcj6js8htau4	uan37vhvdlumefv3v6	3t09dyzubc9zp	55s721c:0m	t	00:05:00	1969-12-31 18:03:57.026-07
lananaqcj6js8htau4	3l3jpj692gjntq7sf8	2blc6xwom46ss	55n1lqw:0h	t	00:05:00	1969-12-31 17:32:29.445-07
lananaqcj6js8htau4	3l3jpj692gjntq7sf8	3rnpsi5qegpt3	55n1lqw:0h	t	00:05:00	1969-12-31 17:32:29.445-07
lananaqcj6js8htau4	uan37vhvdlumefv3v6	3unh7411ka0tz	55s721c:0m	t	00:05:00	1969-12-31 18:03:57.026-07
lananaqcj6js8htau4	uan37vhvdlumefv3v6	817el2k23zdp	55s721c:0m	t	00:05:00	1969-12-31 18:03:57.026-07
lananaqcj6js8htau4	q8gokgsn4rn9ik3tmo	2g43j83a271g9	55n1lqw:0l	t	00:05:00	1969-12-31 17:33:12.958-07
lananaqcj6js8htau4	q8gokgsn4rn9ik3tmo	caqm13mxzbdr	55n1lqw:0l	t	00:05:00	1969-12-31 17:33:12.958-07
lananaqcj6js8htau4	vcrv0ln4rrt4rdmk85	3se2qu476j7tg	55oncwg:123	t	00:05:00	1969-12-31 17:44:21.183-07
lananaqcj6js8htau4	on4ei0510vj8pakclm	2g43j83a271g9	55oncwg:124	t	00:05:00	1969-12-31 17:44:30.785-07
lananaqcj6js8htau4	on4ei0510vj8pakclm	caqm13mxzbdr	55oncwg:124	t	00:05:00	1969-12-31 17:44:30.785-07
lananaqcj6js8htau4	on4ei0510vj8pakclm	2blc6xwom46ss	55oncwg:124	t	00:05:00	1969-12-31 17:44:30.785-07
lananaqcj6js8htau4	on4ei0510vj8pakclm	3se2qu476j7tg	55oncwg:124	t	00:05:00	1969-12-31 17:44:30.785-07
lananaqcj6js8htau4	0fv8st9rvb0fgpllq2	2g43j83a271g9	55oncwg:125	t	00:05:00	1969-12-31 17:44:39.297-07
lananaqcj6js8htau4	0fv8st9rvb0fgpllq2	caqm13mxzbdr	55oncwg:125	t	00:05:00	1969-12-31 17:44:39.297-07
lananaqcj6js8htau4	0fv8st9rvb0fgpllq2	2blc6xwom46ss	55oncwg:125	t	00:05:00	1969-12-31 17:44:39.297-07
lananaqcj6js8htau4	0fv8st9rvb0fgpllq2	3se2qu476j7tg	55oncwg:125	t	00:05:00	1969-12-31 17:44:39.297-07
lananaqcj6js8htau4	paav8hmcfjlvp4o01b	2g43j83a271g9	55oncwg:126	t	00:05:00	1969-12-31 17:44:47.24-07
lananaqcj6js8htau4	paav8hmcfjlvp4o01b	caqm13mxzbdr	55oncwg:126	t	00:05:00	1969-12-31 17:44:47.24-07
lananaqcj6js8htau4	paav8hmcfjlvp4o01b	2blc6xwom46ss	55oncwg:126	t	00:05:00	1969-12-31 17:44:47.24-07
lananaqcj6js8htau4	paav8hmcfjlvp4o01b	3se2qu476j7tg	55oncwg:126	t	00:05:00	1969-12-31 17:44:47.24-07
lananaqcj6js8htau4	8tr6qgudkilehjidpp	2g43j83a271g9	55oncwg:127	t	00:05:00	1969-12-31 17:44:54.683-07
lananaqcj6js8htau4	8tr6qgudkilehjidpp	caqm13mxzbdr	55oncwg:127	t	00:05:00	1969-12-31 17:44:54.683-07
lananaqcj6js8htau4	8tr6qgudkilehjidpp	2blc6xwom46ss	55oncwg:127	t	00:05:00	1969-12-31 17:44:54.683-07
lananaqcj6js8htau4	8tr6qgudkilehjidpp	3se2qu476j7tg	55oncwg:127	t	00:05:00	1969-12-31 17:44:54.683-07
lananaqcj6js8htau4	98e9lsauo7jeggfbja	2blc6xwom46ss	55oncwg:128	t	00:05:00	1969-12-31 17:44:55.741-07
lananaqcj6js8htau4	98e9lsauo7jeggfbja	2g43j83a271g9	55oncwg:128	t	00:05:00	1969-12-31 17:44:55.741-07
lananaqcj6js8htau4	98e9lsauo7jeggfbja	3se2qu476j7tg	55oncwg:128	t	00:05:00	1969-12-31 17:44:55.741-07
lananaqcj6js8htau4	98e9lsauo7jeggfbja	caqm13mxzbdr	55oncwg:128	t	00:05:00	1969-12-31 17:44:55.741-07
lananaqcj6js8htau4	b6pq0c7i323egevk8b	2blc6xwom46ss	55oncwg:12f	t	00:05:00	1969-12-31 17:45:48.382-07
lananaqcj6js8htau4	b6pq0c7i323egevk8b	2g43j83a271g9	55oncwg:12f	t	00:05:00	1969-12-31 17:45:48.382-07
lananaqcj6js8htau4	b6pq0c7i323egevk8b	3se2qu476j7tg	55oncwg:12f	t	00:05:00	1969-12-31 17:45:48.382-07
lananaqcj6js8htau4	b6pq0c7i323egevk8b	caqm13mxzbdr	55oncwg:12f	t	00:05:00	1969-12-31 17:45:48.382-07
lananaqcj6js8htau4	afcsg5nnmlqaldh38v	2blc6xwom46ss	55poixs:03	t	00:05:00	1969-12-31 17:46:13.83-07
lananaqcj6js8htau4	afcsg5nnmlqaldh38v	2g43j83a271g9	55poixs:03	t	00:05:00	1969-12-31 17:46:13.83-07
lananaqcj6js8htau4	afcsg5nnmlqaldh38v	3se2qu476j7tg	55poixs:03	t	00:05:00	1969-12-31 17:46:13.83-07
lananaqcj6js8htau4	afcsg5nnmlqaldh38v	caqm13mxzbdr	55poixs:03	t	00:05:00	1969-12-31 17:46:13.83-07
lananaqcj6js8htau4	epbfq8n8eqg6jovkij	2g43j83a271g9	55poixs:04	t	00:05:00	1969-12-31 17:46:18.884-07
lananaqcj6js8htau4	epbfq8n8eqg6jovkij	caqm13mxzbdr	55poixs:04	t	00:05:00	1969-12-31 17:46:18.884-07
lananaqcj6js8htau4	epbfq8n8eqg6jovkij	2blc6xwom46ss	55poixs:04	t	00:05:00	1969-12-31 17:46:18.884-07
lananaqcj6js8htau4	epbfq8n8eqg6jovkij	3se2qu476j7tg	55poixs:04	t	00:05:00	1969-12-31 17:46:18.884-07
lananaqcj6js8htau4	je0fldln5c131iemn6	2blc6xwom46ss	55poixs:05	t	00:05:00	1969-12-31 17:46:19.017-07
lananaqcj6js8htau4	je0fldln5c131iemn6	2g43j83a271g9	55poixs:05	t	00:05:00	1969-12-31 17:46:19.017-07
lananaqcj6js8htau4	je0fldln5c131iemn6	3se2qu476j7tg	55poixs:05	t	00:05:00	1969-12-31 17:46:19.017-07
lananaqcj6js8htau4	je0fldln5c131iemn6	caqm13mxzbdr	55poixs:05	t	00:05:00	1969-12-31 17:46:19.017-07
lananaqcj6js8htau4	j3vre1vf427u6u8irv	2g43j83a271g9	55poixs:06	t	00:05:00	1969-12-31 17:47:02.904-07
lananaqcj6js8htau4	j3vre1vf427u6u8irv	caqm13mxzbdr	55poixs:06	t	00:05:00	1969-12-31 17:47:02.904-07
lananaqcj6js8htau4	j3vre1vf427u6u8irv	2blc6xwom46ss	55poixs:06	t	00:05:00	1969-12-31 17:47:02.904-07
lananaqcj6js8htau4	j3vre1vf427u6u8irv	3se2qu476j7tg	55poixs:06	t	00:05:00	1969-12-31 17:47:02.904-07
lananaqcj6js8htau4	jqe58m7ajo4sk6n2t3	2g43j83a271g9	55q2x20:0c	t	00:05:00	1969-12-31 17:50:13.744-07
lananaqcj6js8htau4	jqe58m7ajo4sk6n2t3	3t09dyzubc9zp	55q2x20:0c	t	00:05:00	1969-12-31 17:50:13.744-07
lananaqcj6js8htau4	jqe58m7ajo4sk6n2t3	3unh7411ka0tz	55q2x20:0c	t	00:05:00	1969-12-31 17:50:13.744-07
lananaqcj6js8htau4	jqe58m7ajo4sk6n2t3	817el2k23zdp	55q2x20:0c	t	00:05:00	1969-12-31 17:50:13.744-07
lananaqcj6js8htau4	a3qgt2qi5haohdrr6t	2g43j83a271g9	55q2x20:0d	t	00:05:00	1969-12-31 17:50:21.617-07
lananaqcj6js8htau4	a3qgt2qi5haohdrr6t	3t09dyzubc9zp	55q2x20:0d	t	00:05:00	1969-12-31 17:50:21.617-07
lananaqcj6js8htau4	a3qgt2qi5haohdrr6t	3unh7411ka0tz	55q2x20:0d	t	00:05:00	1969-12-31 17:50:21.617-07
lananaqcj6js8htau4	a3qgt2qi5haohdrr6t	817el2k23zdp	55q2x20:0d	t	00:05:00	1969-12-31 17:50:21.617-07
lananaqcj6js8htau4	vcf8fbi5rhak63vvol	2g43j83a271g9	55q2x20:0e	t	00:05:00	1969-12-31 17:50:22.735-07
lananaqcj6js8htau4	vcf8fbi5rhak63vvol	3t09dyzubc9zp	55q2x20:0e	t	00:05:00	1969-12-31 17:50:22.735-07
lananaqcj6js8htau4	vcf8fbi5rhak63vvol	3unh7411ka0tz	55q2x20:0e	t	00:05:00	1969-12-31 17:50:22.735-07
lananaqcj6js8htau4	vcf8fbi5rhak63vvol	817el2k23zdp	55q2x20:0e	t	00:05:00	1969-12-31 17:50:22.735-07
lananaqcj6js8htau4	v4gh74uf26ho72p5d5	2g43j83a271g9	55q2x20:0f	t	00:05:00	1969-12-31 17:50:42.606-07
lananaqcj6js8htau4	v4gh74uf26ho72p5d5	3t09dyzubc9zp	55q2x20:0f	t	00:05:00	1969-12-31 17:50:42.606-07
lananaqcj6js8htau4	v4gh74uf26ho72p5d5	3unh7411ka0tz	55q2x20:0f	t	00:05:00	1969-12-31 17:50:42.606-07
lananaqcj6js8htau4	v4gh74uf26ho72p5d5	817el2k23zdp	55q2x20:0f	t	00:05:00	1969-12-31 17:50:42.606-07
lananaqcj6js8htau4	j0cmk5khv92qeuaic6	2g43j83a271g9	55q2x20:0m	t	00:05:00	1969-12-31 17:53:11.294-07
fdm9fr3m544qman1r0	lgparfvps0d3d0icht	2g43j83a271g9	00:01	f	00:05:00	\N
t6msrosengq3p4a7ce	j9igv4t3jupoournjp	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	fankhb2bt1ubkuo9qp	2g43j83a271g9	55n1lqw:0k	t	00:05:00	1969-12-31 17:32:52.481-07
lananaqcj6js8htau4	fankhb2bt1ubkuo9qp	caqm13mxzbdr	55n1lqw:0k	t	00:05:00	1969-12-31 17:32:52.481-07
lananaqcj6js8htau4	ijo30v4mrag82504ag	2g43j83a271g9	55s721c:12j	t	00:05:00	1969-12-31 18:12:49.782-07
lananaqcj6js8htau4	jijj45in23qf41vq7d	2g43j83a271g9	55n1lqw:0m	t	00:05:00	1969-12-31 17:33:23.818-07
lananaqcj6js8htau4	jijj45in23qf41vq7d	caqm13mxzbdr	55n1lqw:0m	t	00:05:00	1969-12-31 17:33:23.818-07
lananaqcj6js8htau4	qqpj1lcnlp24eq5a3h	2g43j83a271g9	55n1lqw:0n	t	00:05:00	1969-12-31 17:33:32.358-07
lananaqcj6js8htau4	qqpj1lcnlp24eq5a3h	caqm13mxzbdr	55n1lqw:0n	t	00:05:00	1969-12-31 17:33:32.358-07
lananaqcj6js8htau4	egije3or6jv95qhlr3	2g43j83a271g9	55n1lqw:0o	t	00:05:00	1969-12-31 17:33:33.466-07
lananaqcj6js8htau4	egije3or6jv95qhlr3	caqm13mxzbdr	55n1lqw:0o	t	00:05:00	1969-12-31 17:33:33.466-07
lananaqcj6js8htau4	4g2s9nmi7d78pk7de9	2g43j83a271g9	55n1lqw:0p	t	00:05:00	1969-12-31 17:34:02.25-07
lananaqcj6js8htau4	4g2s9nmi7d78pk7de9	caqm13mxzbdr	55n1lqw:0p	t	00:05:00	1969-12-31 17:34:02.25-07
lananaqcj6js8htau4	qljukjsi59njlhf9i3	2g43j83a271g9	55n1lqw:0q	t	00:05:00	1969-12-31 17:34:03.38-07
lananaqcj6js8htau4	qljukjsi59njlhf9i3	caqm13mxzbdr	55n1lqw:0q	t	00:05:00	1969-12-31 17:34:03.38-07
lananaqcj6js8htau4	fhlj5odku44g9kcuu8	2g43j83a271g9	55n1lqw:0v	t	00:05:00	1969-12-31 17:34:45.582-07
lananaqcj6js8htau4	fhlj5odku44g9kcuu8	caqm13mxzbdr	55n1lqw:0v	t	00:05:00	1969-12-31 17:34:45.582-07
lananaqcj6js8htau4	fhlj5odku44g9kcuu8	gt8yfqbqc7ca	55n1lqw:0v	t	00:05:00	1969-12-31 17:34:45.582-07
lananaqcj6js8htau4	fhlj5odku44g9kcuu8	2blc6xwom46ss	55n1lqw:0v	t	00:05:00	1969-12-31 17:34:45.582-07
lananaqcj6js8htau4	fhlj5odku44g9kcuu8	3rnpsi5qegpt3	55n1lqw:0v	t	00:05:00	1969-12-31 17:34:45.582-07
lananaqcj6js8htau4	fhlj5odku44g9kcuu8	3se2qu476j7tg	55n1lqw:0v	t	00:05:00	1969-12-31 17:34:45.582-07
lananaqcj6js8htau4	fhlj5odku44g9kcuu8	817el2k23zdp	55n1lqw:0v	t	00:05:00	1969-12-31 17:34:45.582-07
lananaqcj6js8htau4	amnqo5h5mg5m0l7340	gt8yfqbqc7ca	55n1lqw:0w	t	00:05:00	1969-12-31 17:34:47.569-07
lananaqcj6js8htau4	amnqo5h5mg5m0l7340	3rnpsi5qegpt3	55n1lqw:0w	t	00:05:00	1969-12-31 17:34:47.569-07
lananaqcj6js8htau4	amnqo5h5mg5m0l7340	3se2qu476j7tg	55n1lqw:0w	t	00:05:00	1969-12-31 17:34:47.569-07
lananaqcj6js8htau4	amnqo5h5mg5m0l7340	817el2k23zdp	55n1lqw:0w	t	00:05:00	1969-12-31 17:34:47.569-07
lananaqcj6js8htau4	amnqo5h5mg5m0l7340	2blc6xwom46ss	55n1lqw:0w	t	00:05:00	1969-12-31 17:34:47.569-07
lananaqcj6js8htau4	amnqo5h5mg5m0l7340	2g43j83a271g9	55n1lqw:0x	t	00:05:00	1969-12-31 17:35:05.292-07
lananaqcj6js8htau4	amnqo5h5mg5m0l7340	caqm13mxzbdr	55n1lqw:0x	t	00:05:00	1969-12-31 17:35:05.292-07
lananaqcj6js8htau4	4jrl6ee2f9bq3jbpt8	2g43j83a271g9	55n1lqw:0y	t	00:05:00	1969-12-31 17:35:06.44-07
lananaqcj6js8htau4	4jrl6ee2f9bq3jbpt8	caqm13mxzbdr	55n1lqw:0y	t	00:05:00	1969-12-31 17:35:06.44-07
lananaqcj6js8htau4	q41048ao9vu3jiufs1	2g43j83a271g9	55n1lqw:0z	t	00:05:00	1969-12-31 17:35:22.619-07
lananaqcj6js8htau4	q41048ao9vu3jiufs1	caqm13mxzbdr	55n1lqw:0z	t	00:05:00	1969-12-31 17:35:22.619-07
lananaqcj6js8htau4	ejrmm9nbumde0nvkdl	2g43j83a271g9	55n1lqw:110	t	00:05:00	1969-12-31 17:35:23.707-07
lananaqcj6js8htau4	ejrmm9nbumde0nvkdl	caqm13mxzbdr	55n1lqw:110	t	00:05:00	1969-12-31 17:35:23.707-07
lananaqcj6js8htau4	77r9sskhl9dvsbhu4b	2g43j83a271g9	55n1lqw:111	t	00:05:00	1969-12-31 17:35:31.509-07
lananaqcj6js8htau4	77r9sskhl9dvsbhu4b	caqm13mxzbdr	55n1lqw:111	t	00:05:00	1969-12-31 17:35:31.509-07
lananaqcj6js8htau4	2tb2j5s2k596kgopp6	2blc6xwom46ss	55n1lqw:112	t	00:05:00	1969-12-31 17:35:32.432-07
lananaqcj6js8htau4	2tb2j5s2k596kgopp6	2g43j83a271g9	55n1lqw:112	t	00:05:00	1969-12-31 17:35:32.432-07
lananaqcj6js8htau4	2tb2j5s2k596kgopp6	3se2qu476j7tg	55n1lqw:112	t	00:05:00	1969-12-31 17:35:32.432-07
lananaqcj6js8htau4	2tb2j5s2k596kgopp6	caqm13mxzbdr	55n1lqw:112	t	00:05:00	1969-12-31 17:35:32.432-07
lananaqcj6js8htau4	8iocf5h5ru0set68fg	2g43j83a271g9	55n1lqw:113	t	00:05:00	1969-12-31 17:35:45.164-07
lananaqcj6js8htau4	8iocf5h5ru0set68fg	caqm13mxzbdr	55n1lqw:113	t	00:05:00	1969-12-31 17:35:45.164-07
lananaqcj6js8htau4	8iocf5h5ru0set68fg	2blc6xwom46ss	55n1lqw:113	t	00:05:00	1969-12-31 17:35:45.164-07
lananaqcj6js8htau4	8iocf5h5ru0set68fg	3se2qu476j7tg	55n1lqw:113	t	00:05:00	1969-12-31 17:35:45.164-07
lananaqcj6js8htau4	mietknhqltos2tt2gn	2g43j83a271g9	55n1lqw:114	t	00:05:00	1969-12-31 17:35:58.652-07
lananaqcj6js8htau4	mietknhqltos2tt2gn	caqm13mxzbdr	55n1lqw:114	t	00:05:00	1969-12-31 17:35:58.652-07
lananaqcj6js8htau4	mietknhqltos2tt2gn	2blc6xwom46ss	55n1lqw:114	t	00:05:00	1969-12-31 17:35:58.652-07
lananaqcj6js8htau4	mietknhqltos2tt2gn	3se2qu476j7tg	55n1lqw:114	t	00:05:00	1969-12-31 17:35:58.652-07
lananaqcj6js8htau4	phajkb8ma9krf4965h	2blc6xwom46ss	55n1lqw:115	t	00:05:00	1969-12-31 17:35:59.8-07
lananaqcj6js8htau4	phajkb8ma9krf4965h	2g43j83a271g9	55n1lqw:115	t	00:05:00	1969-12-31 17:35:59.8-07
lananaqcj6js8htau4	phajkb8ma9krf4965h	3se2qu476j7tg	55n1lqw:115	t	00:05:00	1969-12-31 17:35:59.8-07
lananaqcj6js8htau4	phajkb8ma9krf4965h	caqm13mxzbdr	55n1lqw:115	t	00:05:00	1969-12-31 17:35:59.8-07
lananaqcj6js8htau4	e6up4kttfv7q1lq9a0	2g43j83a271g9	55n1lqw:116	t	00:05:00	1969-12-31 17:36:08.309-07
lananaqcj6js8htau4	e6up4kttfv7q1lq9a0	caqm13mxzbdr	55n1lqw:116	t	00:05:00	1969-12-31 17:36:08.309-07
lananaqcj6js8htau4	e6up4kttfv7q1lq9a0	2blc6xwom46ss	55n1lqw:116	t	00:05:00	1969-12-31 17:36:08.309-07
lananaqcj6js8htau4	e6up4kttfv7q1lq9a0	3se2qu476j7tg	55n1lqw:116	t	00:05:00	1969-12-31 17:36:08.309-07
lananaqcj6js8htau4	n4lns1laubken692cb	2blc6xwom46ss	55n1lqw:118	t	00:05:00	1969-12-31 17:36:12.564-07
lananaqcj6js8htau4	n4lns1laubken692cb	2g43j83a271g9	55n1lqw:118	t	00:05:00	1969-12-31 17:36:12.564-07
lananaqcj6js8htau4	n4lns1laubken692cb	3se2qu476j7tg	55n1lqw:118	t	00:05:00	1969-12-31 17:36:12.564-07
lananaqcj6js8htau4	n4lns1laubken692cb	caqm13mxzbdr	55n1lqw:118	t	00:05:00	1969-12-31 17:36:12.564-07
lananaqcj6js8htau4	sf22ooov7fscnnjbh0	2g43j83a271g9	55n1lqw:11a	t	00:05:00	1969-12-31 17:37:18.085-07
lananaqcj6js8htau4	sf22ooov7fscnnjbh0	caqm13mxzbdr	55n1lqw:11a	t	00:05:00	1969-12-31 17:37:18.085-07
lananaqcj6js8htau4	sf22ooov7fscnnjbh0	2blc6xwom46ss	55n1lqw:11a	t	00:05:00	1969-12-31 17:37:18.085-07
lananaqcj6js8htau4	sf22ooov7fscnnjbh0	3se2qu476j7tg	55n1lqw:11a	t	00:05:00	1969-12-31 17:37:18.085-07
lananaqcj6js8htau4	8mt8uev8tkd7e1c2cs	2g43j83a271g9	55n1lqw:119	t	00:05:00	1969-12-31 17:36:59.095-07
lananaqcj6js8htau4	8mt8uev8tkd7e1c2cs	caqm13mxzbdr	55n1lqw:119	t	00:05:00	1969-12-31 17:36:59.095-07
lananaqcj6js8htau4	8mt8uev8tkd7e1c2cs	2blc6xwom46ss	55n1lqw:119	t	00:05:00	1969-12-31 17:36:59.095-07
lananaqcj6js8htau4	8mt8uev8tkd7e1c2cs	3se2qu476j7tg	55n1lqw:119	t	00:05:00	1969-12-31 17:36:59.095-07
lananaqcj6js8htau4	80qfbfg29k8mqj51on	2g43j83a271g9	55s721c:0n	t	00:05:00	1969-12-31 18:04:04.31-07
lananaqcj6js8htau4	80qfbfg29k8mqj51on	3t09dyzubc9zp	55s721c:0n	t	00:05:00	1969-12-31 18:04:04.31-07
lananaqcj6js8htau4	80qfbfg29k8mqj51on	3unh7411ka0tz	55s721c:0n	t	00:05:00	1969-12-31 18:04:04.31-07
lananaqcj6js8htau4	80qfbfg29k8mqj51on	817el2k23zdp	55s721c:0n	t	00:05:00	1969-12-31 18:04:04.31-07
lananaqcj6js8htau4	q460bolp4lknpb2cod	2g43j83a271g9	55oncwg:129	t	00:05:00	1969-12-31 17:45:16.121-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	3t09dyzubc9zp	55n1lqw:11f	t	00:05:00	1969-12-31 17:37:22.84-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	3unh7411ka0tz	55n1lqw:11f	t	00:05:00	1969-12-31 17:37:22.84-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	3mv5477qq3t7o	55o2oag:01	t	00:05:00	1969-12-31 17:37:30.23-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	2nl21rh92w0th	55o2oag:01	t	00:05:00	1969-12-31 17:37:30.23-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	35ph2ne7hp4ab	55o2oag:01	t	00:05:00	1969-12-31 17:37:30.23-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	2bpfpzhrzpy8y	55o2oag:01	t	00:05:00	1969-12-31 17:37:30.23-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	br0wk7u8e4ua	55o3sk0:01	t	00:05:00	1969-12-31 17:37:35.334-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	1wome3bicijgv	55o3sk0:01	t	00:05:00	1969-12-31 17:37:35.334-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	1drrclvyl30ag	55o3sk0:01	t	00:05:00	1969-12-31 17:37:35.334-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	18mv2b14fqanq	55o3sk0:01	t	00:05:00	1969-12-31 17:37:35.334-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	2cdupbt3tbg3e	55o4puw:01	t	00:05:00	1969-12-31 17:37:40.04-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	26r7dxtpzufsx	55o4puw:01	t	00:05:00	1969-12-31 17:37:40.04-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	36lad5gt0cgii	55o4puw:01	t	00:05:00	1969-12-31 17:37:40.04-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	jqnhyg2dpcei	55o4puw:01	t	00:05:00	1969-12-31 17:37:40.04-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	mloeoms5oc03	55o5n4o:01	t	00:05:00	1969-12-31 17:37:43.427-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	14fikkoi7zm0b	55o5n4o:01	t	00:05:00	1969-12-31 17:37:43.427-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	17piv97wtngw8	55o5n4o:01	t	00:05:00	1969-12-31 17:37:43.427-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	2zyrhhob51crw	55o5n4o:01	t	00:05:00	1969-12-31 17:37:43.427-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	343u9rvx540f6	55o5n4o:01	t	00:05:00	1969-12-31 17:37:43.427-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	22m6rzcmzstfn	55o5n4o:01	t	00:05:00	1969-12-31 17:37:43.427-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	1x0yimne01jo1	55o5n4o:01	t	00:05:00	1969-12-31 17:37:43.427-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	3igp6fph1aa0g	55o5n4o:01	t	00:05:00	1969-12-31 17:37:43.427-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	2g43j83a271g9	55o5n4o:02	t	00:05:00	1969-12-31 17:37:44.362-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	gt8yfqbqc7ca	55o5n4o:02	t	00:05:00	1969-12-31 17:37:44.362-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	2blc6xwom46ss	55o5n4o:02	t	00:05:00	1969-12-31 17:37:44.362-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	3rnpsi5qegpt3	55o5n4o:02	t	00:05:00	1969-12-31 17:37:44.362-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	3se2qu476j7tg	55o5n4o:02	t	00:05:00	1969-12-31 17:37:44.362-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	caqm13mxzbdr	55o5n4o:02	t	00:05:00	1969-12-31 17:37:44.362-07
lananaqcj6js8htau4	inqritfqb2noc6jd33	817el2k23zdp	55o5n4o:02	t	00:05:00	1969-12-31 17:37:44.362-07
lananaqcj6js8htau4	8sca6026i7sheb4811	310t54w26gnab	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	3kpx9tkeqc8r2	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	1oisugrazbrw2	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	1u0eoxj8ju3mp	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	14fikkoi7zm0b	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	17piv97wtngw8	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	2zyrhhob51crw	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	3panrcehejw2b	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	2a3fejmu1ysvb	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	343u9rvx540f6	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	1h040veoau8up	55o9e54:01	t	00:05:00	1969-12-31 17:37:48.109-07
lananaqcj6js8htau4	8sca6026i7sheb4811	2g43j83a271g9	55o9e54:02	t	00:05:00	1969-12-31 17:38:35.282-07
lananaqcj6js8htau4	8sca6026i7sheb4811	gt8yfqbqc7ca	55o9e54:02	t	00:05:00	1969-12-31 17:38:35.282-07
lananaqcj6js8htau4	8sca6026i7sheb4811	2blc6xwom46ss	55o9e54:02	t	00:05:00	1969-12-31 17:38:35.282-07
lananaqcj6js8htau4	8sca6026i7sheb4811	3rnpsi5qegpt3	55o9e54:02	t	00:05:00	1969-12-31 17:38:35.282-07
lananaqcj6js8htau4	8sca6026i7sheb4811	3se2qu476j7tg	55o9e54:02	t	00:05:00	1969-12-31 17:38:35.282-07
lananaqcj6js8htau4	8sca6026i7sheb4811	caqm13mxzbdr	55o9e54:02	t	00:05:00	1969-12-31 17:38:35.282-07
lananaqcj6js8htau4	8sca6026i7sheb4811	817el2k23zdp	55o9e54:02	t	00:05:00	1969-12-31 17:38:35.282-07
lananaqcj6js8htau4	gaqgh9jd3safb2h3o2	2g43j83a271g9	55ogcso:01	t	00:05:00	1969-12-31 17:39:20.582-07
lananaqcj6js8htau4	gaqgh9jd3safb2h3o2	gt8yfqbqc7ca	55ogcso:01	t	00:05:00	1969-12-31 17:39:20.582-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	3se2qu476j7tg	55ogcso:04	t	00:05:00	1969-12-31 17:39:45.547-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	caqm13mxzbdr	55ogcso:04	t	00:05:00	1969-12-31 17:39:45.547-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	817el2k23zdp	55ojnl4:03	t	00:05:00	1969-12-31 17:39:58.02-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	2g43j83a271g9	55ojnl4:04	t	00:05:00	1969-12-31 17:40:05.891-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	2blc6xwom46ss	55ojnl4:04	t	00:05:00	1969-12-31 17:40:05.891-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	gt8yfqbqc7ca	55ojnl4:04	t	00:05:00	1969-12-31 17:40:05.891-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	3rnpsi5qegpt3	55ojnl4:04	t	00:05:00	1969-12-31 17:40:05.891-07
lananaqcj6js8htau4	gaqgh9jd3safb2h3o2	2blc6xwom46ss	55ogcso:01	t	00:05:00	1969-12-31 17:39:20.582-07
lananaqcj6js8htau4	gaqgh9jd3safb2h3o2	3rnpsi5qegpt3	55ogcso:01	t	00:05:00	1969-12-31 17:39:20.582-07
lananaqcj6js8htau4	gaqgh9jd3safb2h3o2	3se2qu476j7tg	55ogcso:01	t	00:05:00	1969-12-31 17:39:20.582-07
lananaqcj6js8htau4	gaqgh9jd3safb2h3o2	caqm13mxzbdr	55ogcso:01	t	00:05:00	1969-12-31 17:39:20.582-07
lananaqcj6js8htau4	gaqgh9jd3safb2h3o2	817el2k23zdp	55ogcso:01	t	00:05:00	1969-12-31 17:39:20.582-07
lananaqcj6js8htau4	ijo30v4mrag82504ag	3t09dyzubc9zp	55s721c:12j	t	00:05:00	1969-12-31 18:12:49.782-07
lananaqcj6js8htau4	ijo30v4mrag82504ag	3unh7411ka0tz	55s721c:12j	t	00:05:00	1969-12-31 18:12:49.782-07
lananaqcj6js8htau4	ijo30v4mrag82504ag	817el2k23zdp	55s721c:12j	t	00:05:00	1969-12-31 18:12:49.782-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	1z8ikb5cnznqy	55ojnl4:04	t	00:05:00	1969-12-31 17:40:05.891-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	uizv2xjm3zqw	55ojnl4:04	t	00:05:00	1969-12-31 17:40:05.891-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	343u9rvx540f6	55ojnl4:04	t	00:05:00	1969-12-31 17:40:05.891-07
lananaqcj6js8htau4	f11tqbsb5a14b7tfg3	351uuya4pj2ql	55ojnl4:04	t	00:05:00	1969-12-31 17:40:05.891-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	uizv2xjm3zqw	55oncwg:02	t	00:05:00	1969-12-31 17:40:36.362-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	1z8ikb5cnznqy	55oncwg:02	t	00:05:00	1969-12-31 17:40:36.362-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	343u9rvx540f6	55oncwg:02	t	00:05:00	1969-12-31 17:40:36.362-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	351uuya4pj2ql	55oncwg:02	t	00:05:00	1969-12-31 17:40:36.362-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	uizv2xjm3zqw	55oncwg:0h	t	00:05:00	1969-12-31 17:41:08.651-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	1z8ikb5cnznqy	55oncwg:0h	t	00:05:00	1969-12-31 17:41:08.651-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	351uuya4pj2ql	55oncwg:0h	t	00:05:00	1969-12-31 17:41:08.651-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	2g43j83a271g9	55oncwg:04	t	00:05:00	1969-12-31 17:40:56.412-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	gt8yfqbqc7ca	55oncwg:04	t	00:05:00	1969-12-31 17:40:56.412-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	2blc6xwom46ss	55oncwg:04	t	00:05:00	1969-12-31 17:40:56.412-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	3rnpsi5qegpt3	55oncwg:04	t	00:05:00	1969-12-31 17:40:56.412-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	817el2k23zdp	55oncwg:04	t	00:05:00	1969-12-31 17:40:56.412-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	3se2qu476j7tg	55oncwg:04	t	00:05:00	1969-12-31 17:40:56.412-07
lananaqcj6js8htau4	sdkb93u4o8g1cpstm1	caqm13mxzbdr	55oncwg:04	t	00:05:00	1969-12-31 17:40:56.412-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	343u9rvx540f6	55oncwg:0j	t	00:05:00	1969-12-31 17:41:09.16-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	gt8yfqbqc7ca	55oncwg:0k	t	00:05:00	1969-12-31 17:41:14.753-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	3rnpsi5qegpt3	55oncwg:0k	t	00:05:00	1969-12-31 17:41:14.753-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	817el2k23zdp	55oncwg:0k	t	00:05:00	1969-12-31 17:41:14.753-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	2g43j83a271g9	55oncwg:0l	t	00:05:00	1969-12-31 17:41:36.875-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	2blc6xwom46ss	55oncwg:0l	t	00:05:00	1969-12-31 17:41:36.875-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	3se2qu476j7tg	55oncwg:0l	t	00:05:00	1969-12-31 17:41:36.875-07
lananaqcj6js8htau4	ulgousk87l1om2tc7b	caqm13mxzbdr	55oncwg:0l	t	00:05:00	1969-12-31 17:41:36.875-07
lananaqcj6js8htau4	q460bolp4lknpb2cod	caqm13mxzbdr	55oncwg:129	t	00:05:00	1969-12-31 17:45:16.121-07
lananaqcj6js8htau4	q460bolp4lknpb2cod	2blc6xwom46ss	55oncwg:129	t	00:05:00	1969-12-31 17:45:16.121-07
lananaqcj6js8htau4	q460bolp4lknpb2cod	3se2qu476j7tg	55oncwg:129	t	00:05:00	1969-12-31 17:45:16.121-07
lananaqcj6js8htau4	43umiq94dmn49n01ru	2g43j83a271g9	55oncwg:12a	t	00:05:00	1969-12-31 17:45:24.743-07
lananaqcj6js8htau4	43umiq94dmn49n01ru	caqm13mxzbdr	55oncwg:12a	t	00:05:00	1969-12-31 17:45:24.743-07
lananaqcj6js8htau4	43umiq94dmn49n01ru	2blc6xwom46ss	55oncwg:12a	t	00:05:00	1969-12-31 17:45:24.743-07
lananaqcj6js8htau4	43umiq94dmn49n01ru	3se2qu476j7tg	55oncwg:12a	t	00:05:00	1969-12-31 17:45:24.743-07
lananaqcj6js8htau4	lppu33pjegf6vk4it1	2g43j83a271g9	55oncwg:12b	t	00:05:00	1969-12-31 17:45:25.871-07
lananaqcj6js8htau4	lppu33pjegf6vk4it1	caqm13mxzbdr	55oncwg:12b	t	00:05:00	1969-12-31 17:45:25.871-07
lananaqcj6js8htau4	lppu33pjegf6vk4it1	2blc6xwom46ss	55oncwg:12b	t	00:05:00	1969-12-31 17:45:25.871-07
lananaqcj6js8htau4	lppu33pjegf6vk4it1	3se2qu476j7tg	55oncwg:12b	t	00:05:00	1969-12-31 17:45:25.871-07
lananaqcj6js8htau4	ttminbd5f75gjd6gm7	2blc6xwom46ss	55oncwg:12g	t	00:05:00	1969-12-31 17:45:48.777-07
lananaqcj6js8htau4	ttminbd5f75gjd6gm7	2g43j83a271g9	55oncwg:12g	t	00:05:00	1969-12-31 17:45:48.777-07
lananaqcj6js8htau4	ttminbd5f75gjd6gm7	3se2qu476j7tg	55oncwg:12g	t	00:05:00	1969-12-31 17:45:48.777-07
lananaqcj6js8htau4	ttminbd5f75gjd6gm7	caqm13mxzbdr	55oncwg:12g	t	00:05:00	1969-12-31 17:45:48.777-07
lananaqcj6js8htau4	k35ut5n2en6m5bjo5m	2g43j83a271g9	55oncwg:12i	t	00:05:00	1969-12-31 17:46:04.72-07
lananaqcj6js8htau4	bbhc9v1mq32ppl3c75	2g43j83a271g9	55poixs:07	t	00:05:00	1969-12-31 17:47:20.857-07
lananaqcj6js8htau4	bbhc9v1mq32ppl3c75	caqm13mxzbdr	55poixs:07	t	00:05:00	1969-12-31 17:47:20.857-07
lananaqcj6js8htau4	bbhc9v1mq32ppl3c75	2blc6xwom46ss	55poixs:07	t	00:05:00	1969-12-31 17:47:20.857-07
lananaqcj6js8htau4	bbhc9v1mq32ppl3c75	3se2qu476j7tg	55poixs:07	t	00:05:00	1969-12-31 17:47:20.857-07
lananaqcj6js8htau4	avsoc6kepv8l7g0c3o	2g43j83a271g9	55poixs:08	t	00:05:00	1969-12-31 17:47:27.678-07
lananaqcj6js8htau4	avsoc6kepv8l7g0c3o	caqm13mxzbdr	55poixs:08	t	00:05:00	1969-12-31 17:47:27.678-07
lananaqcj6js8htau4	avsoc6kepv8l7g0c3o	2blc6xwom46ss	55poixs:08	t	00:05:00	1969-12-31 17:47:27.678-07
lananaqcj6js8htau4	avsoc6kepv8l7g0c3o	3se2qu476j7tg	55poixs:08	t	00:05:00	1969-12-31 17:47:27.678-07
lananaqcj6js8htau4	l6half7p5h297n8hjc	2g43j83a271g9	55q2x20:0g	t	00:05:00	1969-12-31 17:50:56.53-07
lananaqcj6js8htau4	l6half7p5h297n8hjc	3t09dyzubc9zp	55q2x20:0g	t	00:05:00	1969-12-31 17:50:56.53-07
lananaqcj6js8htau4	l6half7p5h297n8hjc	3unh7411ka0tz	55q2x20:0g	t	00:05:00	1969-12-31 17:50:56.53-07
lananaqcj6js8htau4	l6half7p5h297n8hjc	817el2k23zdp	55q2x20:0g	t	00:05:00	1969-12-31 17:50:56.53-07
lananaqcj6js8htau4	m6cnc5dcdl8vuujdaq	2g43j83a271g9	55q2x20:0h	t	00:05:00	1969-12-31 17:51:42.296-07
lananaqcj6js8htau4	e33jccfva6gd135lv7	2g43j83a271g9	55q2x20:0i	t	00:05:00	1969-12-31 17:52:27.921-07
lananaqcj6js8htau4	e33jccfva6gd135lv7	3t09dyzubc9zp	55q2x20:0i	t	00:05:00	1969-12-31 17:52:27.921-07
lananaqcj6js8htau4	e33jccfva6gd135lv7	3unh7411ka0tz	55q2x20:0i	t	00:05:00	1969-12-31 17:52:27.921-07
lananaqcj6js8htau4	e33jccfva6gd135lv7	817el2k23zdp	55q2x20:0i	t	00:05:00	1969-12-31 17:52:27.921-07
lananaqcj6js8htau4	i0f82a1crrq2m71sd4	817el2k23zdp	55q2x20:0p	t	00:05:00	1969-12-31 17:53:23.766-07
lananaqcj6js8htau4	4igqpg8fccm6p63ejc	2g43j83a271g9	55s721c:0o	t	00:05:00	1969-12-31 18:04:05.352-07
lananaqcj6js8htau4	4igqpg8fccm6p63ejc	3t09dyzubc9zp	55s721c:0o	t	00:05:00	1969-12-31 18:04:05.352-07
lananaqcj6js8htau4	4igqpg8fccm6p63ejc	3unh7411ka0tz	55s721c:0o	t	00:05:00	1969-12-31 18:04:05.352-07
lananaqcj6js8htau4	4igqpg8fccm6p63ejc	817el2k23zdp	55s721c:0o	t	00:05:00	1969-12-31 18:04:05.352-07
lananaqcj6js8htau4	24mula39sv35fab5s6	2g43j83a271g9	55qzzhs:02	t	00:05:00	1969-12-31 17:54:02.533-07
lananaqcj6js8htau4	24mula39sv35fab5s6	3t09dyzubc9zp	55qzzhs:02	t	00:05:00	1969-12-31 17:54:02.533-07
lananaqcj6js8htau4	24mula39sv35fab5s6	3unh7411ka0tz	55qzzhs:02	t	00:05:00	1969-12-31 17:54:02.533-07
lananaqcj6js8htau4	24mula39sv35fab5s6	817el2k23zdp	55qzzhs:02	t	00:05:00	1969-12-31 17:54:02.533-07
lananaqcj6js8htau4	ile27d45mg7cann02c	2g43j83a271g9	55qzzhs:03	t	00:05:00	1969-12-31 17:54:09.017-07
lananaqcj6js8htau4	ile27d45mg7cann02c	3t09dyzubc9zp	55qzzhs:03	t	00:05:00	1969-12-31 17:54:09.017-07
lananaqcj6js8htau4	ile27d45mg7cann02c	3unh7411ka0tz	55qzzhs:03	t	00:05:00	1969-12-31 17:54:09.017-07
lananaqcj6js8htau4	ile27d45mg7cann02c	817el2k23zdp	55qzzhs:03	t	00:05:00	1969-12-31 17:54:09.017-07
lananaqcj6js8htau4	jrpmpig3m28cq33nhk	2g43j83a271g9	55qzzhs:04	t	00:05:00	1969-12-31 17:54:17.122-07
lananaqcj6js8htau4	jrpmpig3m28cq33nhk	3t09dyzubc9zp	55qzzhs:04	t	00:05:00	1969-12-31 17:54:17.122-07
lananaqcj6js8htau4	jrpmpig3m28cq33nhk	3unh7411ka0tz	55qzzhs:04	t	00:05:00	1969-12-31 17:54:17.122-07
lananaqcj6js8htau4	jrpmpig3m28cq33nhk	817el2k23zdp	55qzzhs:04	t	00:05:00	1969-12-31 17:54:17.122-07
lananaqcj6js8htau4	ik4aoscdv18m9rkpgf	2g43j83a271g9	55qzzhs:05	t	00:05:00	1969-12-31 17:54:24.734-07
lananaqcj6js8htau4	ik4aoscdv18m9rkpgf	3t09dyzubc9zp	55qzzhs:05	t	00:05:00	1969-12-31 17:54:24.734-07
lananaqcj6js8htau4	ik4aoscdv18m9rkpgf	3unh7411ka0tz	55qzzhs:05	t	00:05:00	1969-12-31 17:54:24.734-07
lananaqcj6js8htau4	ik4aoscdv18m9rkpgf	817el2k23zdp	55qzzhs:05	t	00:05:00	1969-12-31 17:54:24.734-07
lananaqcj6js8htau4	foarl744kickev401c	2g43j83a271g9	55qzzhs:06	t	00:05:00	1969-12-31 17:54:25.797-07
lananaqcj6js8htau4	foarl744kickev401c	3t09dyzubc9zp	55qzzhs:06	t	00:05:00	1969-12-31 17:54:25.797-07
lananaqcj6js8htau4	foarl744kickev401c	3unh7411ka0tz	55qzzhs:06	t	00:05:00	1969-12-31 17:54:25.797-07
lananaqcj6js8htau4	foarl744kickev401c	817el2k23zdp	55qzzhs:06	t	00:05:00	1969-12-31 17:54:25.797-07
lananaqcj6js8htau4	93usjg54isnh2agcqd	2g43j83a271g9	55qzzhs:07	t	00:05:00	1969-12-31 17:54:32.884-07
lananaqcj6js8htau4	93usjg54isnh2agcqd	3t09dyzubc9zp	55qzzhs:07	t	00:05:00	1969-12-31 17:54:32.884-07
lananaqcj6js8htau4	93usjg54isnh2agcqd	3unh7411ka0tz	55qzzhs:07	t	00:05:00	1969-12-31 17:54:32.884-07
lananaqcj6js8htau4	93usjg54isnh2agcqd	817el2k23zdp	55qzzhs:07	t	00:05:00	1969-12-31 17:54:32.884-07
lananaqcj6js8htau4	0e41m6g419uslk5uo6	2g43j83a271g9	55qzzhs:08	t	00:05:00	1969-12-31 17:54:47.677-07
lananaqcj6js8htau4	0e41m6g419uslk5uo6	3t09dyzubc9zp	55qzzhs:08	t	00:05:00	1969-12-31 17:54:47.677-07
lananaqcj6js8htau4	0e41m6g419uslk5uo6	3unh7411ka0tz	55qzzhs:08	t	00:05:00	1969-12-31 17:54:47.677-07
lananaqcj6js8htau4	0e41m6g419uslk5uo6	817el2k23zdp	55qzzhs:08	t	00:05:00	1969-12-31 17:54:47.677-07
lananaqcj6js8htau4	aj359bq14plp6j9t3q	2g43j83a271g9	55qzzhs:09	t	00:05:00	1969-12-31 17:54:48.666-07
lananaqcj6js8htau4	aj359bq14plp6j9t3q	3t09dyzubc9zp	55qzzhs:09	t	00:05:00	1969-12-31 17:54:48.666-07
lananaqcj6js8htau4	aj359bq14plp6j9t3q	3unh7411ka0tz	55qzzhs:09	t	00:05:00	1969-12-31 17:54:48.666-07
lananaqcj6js8htau4	aj359bq14plp6j9t3q	817el2k23zdp	55qzzhs:09	t	00:05:00	1969-12-31 17:54:48.666-07
lananaqcj6js8htau4	brng6mcnc19brkgmmv	2g43j83a271g9	55qzzhs:0a	t	00:05:00	1969-12-31 17:54:48.811-07
lananaqcj6js8htau4	brng6mcnc19brkgmmv	3t09dyzubc9zp	55qzzhs:0a	t	00:05:00	1969-12-31 17:54:48.811-07
lananaqcj6js8htau4	brng6mcnc19brkgmmv	3unh7411ka0tz	55qzzhs:0a	t	00:05:00	1969-12-31 17:54:48.811-07
lananaqcj6js8htau4	brng6mcnc19brkgmmv	817el2k23zdp	55qzzhs:0a	t	00:05:00	1969-12-31 17:54:48.811-07
lananaqcj6js8htau4	1iif6g1n1u4uuc0j6v	2g43j83a271g9	55qzzhs:0b	t	00:05:00	1969-12-31 17:55:30.831-07
lananaqcj6js8htau4	1iif6g1n1u4uuc0j6v	3t09dyzubc9zp	55qzzhs:0b	t	00:05:00	1969-12-31 17:55:30.831-07
lananaqcj6js8htau4	1iif6g1n1u4uuc0j6v	3unh7411ka0tz	55qzzhs:0b	t	00:05:00	1969-12-31 17:55:30.831-07
lananaqcj6js8htau4	1iif6g1n1u4uuc0j6v	817el2k23zdp	55qzzhs:0b	t	00:05:00	1969-12-31 17:55:30.831-07
lananaqcj6js8htau4	c2fnno4o5ms7rvcidf	2g43j83a271g9	55qzzhs:0c	t	00:05:00	1969-12-31 17:56:16.223-07
lananaqcj6js8htau4	c2fnno4o5ms7rvcidf	3t09dyzubc9zp	55qzzhs:0c	t	00:05:00	1969-12-31 17:56:16.223-07
lananaqcj6js8htau4	c2fnno4o5ms7rvcidf	3unh7411ka0tz	55qzzhs:0c	t	00:05:00	1969-12-31 17:56:16.223-07
lananaqcj6js8htau4	c2fnno4o5ms7rvcidf	817el2k23zdp	55qzzhs:0c	t	00:05:00	1969-12-31 17:56:16.223-07
lananaqcj6js8htau4	jp1old8lp3varfb1b9	2g43j83a271g9	55qzzhs:0d	t	00:05:00	1969-12-31 17:57:02.813-07
lananaqcj6js8htau4	jp1old8lp3varfb1b9	3t09dyzubc9zp	55qzzhs:0d	t	00:05:00	1969-12-31 17:57:02.813-07
lananaqcj6js8htau4	jp1old8lp3varfb1b9	3unh7411ka0tz	55qzzhs:0d	t	00:05:00	1969-12-31 17:57:02.813-07
lananaqcj6js8htau4	jp1old8lp3varfb1b9	817el2k23zdp	55qzzhs:0d	t	00:05:00	1969-12-31 17:57:02.813-07
lananaqcj6js8htau4	o0s5bo5rnmo4r4isbn	2g43j83a271g9	55qzzhs:0e	t	00:05:00	1969-12-31 17:57:11.505-07
lananaqcj6js8htau4	o0s5bo5rnmo4r4isbn	3t09dyzubc9zp	55qzzhs:0e	t	00:05:00	1969-12-31 17:57:11.505-07
lananaqcj6js8htau4	o0s5bo5rnmo4r4isbn	3unh7411ka0tz	55qzzhs:0e	t	00:05:00	1969-12-31 17:57:11.505-07
lananaqcj6js8htau4	o0s5bo5rnmo4r4isbn	817el2k23zdp	55qzzhs:0e	t	00:05:00	1969-12-31 17:57:11.505-07
lananaqcj6js8htau4	ufqnuogie1icrlu4u9	2g43j83a271g9	55qzzhs:0f	t	00:05:00	1969-12-31 17:57:16.222-07
lananaqcj6js8htau4	ufqnuogie1icrlu4u9	3t09dyzubc9zp	55qzzhs:0f	t	00:05:00	1969-12-31 17:57:16.222-07
lananaqcj6js8htau4	ufqnuogie1icrlu4u9	3unh7411ka0tz	55qzzhs:0f	t	00:05:00	1969-12-31 17:57:16.222-07
lananaqcj6js8htau4	ufqnuogie1icrlu4u9	817el2k23zdp	55qzzhs:0f	t	00:05:00	1969-12-31 17:57:16.222-07
lananaqcj6js8htau4	0u0hj5rjp2feqi3gl1	2g43j83a271g9	55qzzhs:0g	t	00:05:00	1969-12-31 17:58:02.498-07
lananaqcj6js8htau4	0u0hj5rjp2feqi3gl1	3t09dyzubc9zp	55qzzhs:0g	t	00:05:00	1969-12-31 17:58:02.498-07
lananaqcj6js8htau4	0u0hj5rjp2feqi3gl1	3unh7411ka0tz	55qzzhs:0g	t	00:05:00	1969-12-31 17:58:02.498-07
lananaqcj6js8htau4	0u0hj5rjp2feqi3gl1	817el2k23zdp	55qzzhs:0g	t	00:05:00	1969-12-31 17:58:02.498-07
lananaqcj6js8htau4	6dp20esl1i2pkpgfm5	2g43j83a271g9	55qzzhs:0i	t	00:05:00	1969-12-31 17:59:28.166-07
lananaqcj6js8htau4	6dp20esl1i2pkpgfm5	3t09dyzubc9zp	55qzzhs:0i	t	00:05:00	1969-12-31 17:59:28.166-07
lananaqcj6js8htau4	6dp20esl1i2pkpgfm5	3unh7411ka0tz	55qzzhs:0i	t	00:05:00	1969-12-31 17:59:28.166-07
cm2q3g8j0kgtd3grm7	3fsbf3cvkni8vj20hq	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	tlabmg9k512h66b64l	2g43j83a271g9	55qzzhs:0h	t	00:05:00	1969-12-31 17:58:48.186-07
lananaqcj6js8htau4	tlabmg9k512h66b64l	3t09dyzubc9zp	55qzzhs:0h	t	00:05:00	1969-12-31 17:58:48.186-07
lananaqcj6js8htau4	tlabmg9k512h66b64l	3unh7411ka0tz	55qzzhs:0h	t	00:05:00	1969-12-31 17:58:48.186-07
lananaqcj6js8htau4	tlabmg9k512h66b64l	817el2k23zdp	55qzzhs:0h	t	00:05:00	1969-12-31 17:58:48.186-07
o3nc60rubd8sueu3n3	b96ms5m1c4is7qlvsj	2g43j83a271g9	00:01	f	00:05:00	\N
uk74dsudpgd94faf3n	lr7sv2hbqcc92umbi7	2blc6xwom46ss	563o7s8:12y	t	00:05:00	1969-12-31 17:29:19.101-07
uk74dsudpgd94faf3n	lr7sv2hbqcc92umbi7	2g43j83a271g9	563o7s8:12y	t	00:05:00	1969-12-31 17:29:19.101-07
lananaqcj6js8htau4	6dp20esl1i2pkpgfm5	817el2k23zdp	55qzzhs:0i	t	00:05:00	1969-12-31 17:59:28.166-07
lananaqcj6js8htau4	t9a6shdhlr2jje83le	817el2k23zdp	55qzzhs:0l	t	00:05:00	1969-12-31 17:59:28.508-07
lananaqcj6js8htau4	t9a6shdhlr2jje83le	3t09dyzubc9zp	55qzzhs:0l	t	00:05:00	1969-12-31 17:59:28.508-07
lananaqcj6js8htau4	t9a6shdhlr2jje83le	3unh7411ka0tz	55qzzhs:0l	t	00:05:00	1969-12-31 17:59:28.508-07
lananaqcj6js8htau4	t9a6shdhlr2jje83le	2g43j83a271g9	55qzzhs:0m	t	00:05:00	1969-12-31 17:59:39.085-07
lananaqcj6js8htau4	t9a6shdhlr2jje83le	caqm13mxzbdr	55qzzhs:0m	t	00:05:00	1969-12-31 17:59:39.085-07
lananaqcj6js8htau4	t9a6shdhlr2jje83le	2blc6xwom46ss	55qzzhs:0m	t	00:05:00	1969-12-31 17:59:39.085-07
lananaqcj6js8htau4	t9a6shdhlr2jje83le	3se2qu476j7tg	55qzzhs:0m	t	00:05:00	1969-12-31 17:59:39.085-07
lananaqcj6js8htau4	vr825julqnk6vut35d	2g43j83a271g9	55qzzhs:0n	t	00:05:00	1969-12-31 17:59:53.002-07
lananaqcj6js8htau4	vr825julqnk6vut35d	caqm13mxzbdr	55qzzhs:0n	t	00:05:00	1969-12-31 17:59:53.002-07
lananaqcj6js8htau4	vr825julqnk6vut35d	2blc6xwom46ss	55qzzhs:0n	t	00:05:00	1969-12-31 17:59:53.002-07
lananaqcj6js8htau4	vr825julqnk6vut35d	3se2qu476j7tg	55qzzhs:0n	t	00:05:00	1969-12-31 17:59:53.002-07
lananaqcj6js8htau4	q17ueci8hc908bmjo5	2blc6xwom46ss	55qzzhs:0o	t	00:05:00	1969-12-31 17:59:56.966-07
lananaqcj6js8htau4	q17ueci8hc908bmjo5	2g43j83a271g9	55qzzhs:0o	t	00:05:00	1969-12-31 17:59:56.966-07
lananaqcj6js8htau4	q17ueci8hc908bmjo5	3se2qu476j7tg	55qzzhs:0o	t	00:05:00	1969-12-31 17:59:56.966-07
lananaqcj6js8htau4	q17ueci8hc908bmjo5	caqm13mxzbdr	55qzzhs:0o	t	00:05:00	1969-12-31 17:59:56.966-07
lananaqcj6js8htau4	rpb6dpgnob96boci10	2blc6xwom46ss	55qzzhs:0p	t	00:05:00	1969-12-31 17:59:58.161-07
lananaqcj6js8htau4	rpb6dpgnob96boci10	2g43j83a271g9	55qzzhs:0p	t	00:05:00	1969-12-31 17:59:58.161-07
lananaqcj6js8htau4	rpb6dpgnob96boci10	3se2qu476j7tg	55qzzhs:0p	t	00:05:00	1969-12-31 17:59:58.161-07
lananaqcj6js8htau4	rpb6dpgnob96boci10	caqm13mxzbdr	55qzzhs:0p	t	00:05:00	1969-12-31 17:59:58.161-07
lananaqcj6js8htau4	dro10kmgcg7fnpchfh	2g43j83a271g9	55qzzhs:0q	t	00:05:00	1969-12-31 18:00:04.24-07
lananaqcj6js8htau4	dro10kmgcg7fnpchfh	caqm13mxzbdr	55qzzhs:0q	t	00:05:00	1969-12-31 18:00:04.24-07
lananaqcj6js8htau4	dro10kmgcg7fnpchfh	2blc6xwom46ss	55qzzhs:0q	t	00:05:00	1969-12-31 18:00:04.24-07
lananaqcj6js8htau4	dro10kmgcg7fnpchfh	3se2qu476j7tg	55qzzhs:0q	t	00:05:00	1969-12-31 18:00:04.24-07
lananaqcj6js8htau4	b7l4odg8hvqv6uvku0	2blc6xwom46ss	55qzzhs:0r	t	00:05:00	1969-12-31 18:00:04.316-07
lananaqcj6js8htau4	b7l4odg8hvqv6uvku0	2g43j83a271g9	55qzzhs:0r	t	00:05:00	1969-12-31 18:00:04.316-07
lananaqcj6js8htau4	b7l4odg8hvqv6uvku0	3se2qu476j7tg	55qzzhs:0r	t	00:05:00	1969-12-31 18:00:04.316-07
lananaqcj6js8htau4	b7l4odg8hvqv6uvku0	caqm13mxzbdr	55qzzhs:0r	t	00:05:00	1969-12-31 18:00:04.316-07
lananaqcj6js8htau4	h0vvaesb4uukpu8ms7	2g43j83a271g9	55qzzhs:0s	t	00:05:00	1969-12-31 18:00:10.041-07
lananaqcj6js8htau4	h0vvaesb4uukpu8ms7	caqm13mxzbdr	55qzzhs:0s	t	00:05:00	1969-12-31 18:00:10.041-07
lananaqcj6js8htau4	h0vvaesb4uukpu8ms7	2blc6xwom46ss	55qzzhs:0s	t	00:05:00	1969-12-31 18:00:10.041-07
lananaqcj6js8htau4	h0vvaesb4uukpu8ms7	3se2qu476j7tg	55qzzhs:0s	t	00:05:00	1969-12-31 18:00:10.041-07
lananaqcj6js8htau4	pf07uiuoi1kmm49d7f	2g43j83a271g9	55qzzhs:0t	t	00:05:00	1969-12-31 18:00:19.765-07
lananaqcj6js8htau4	pf07uiuoi1kmm49d7f	caqm13mxzbdr	55qzzhs:0t	t	00:05:00	1969-12-31 18:00:19.765-07
lananaqcj6js8htau4	pf07uiuoi1kmm49d7f	2blc6xwom46ss	55qzzhs:0t	t	00:05:00	1969-12-31 18:00:19.765-07
lananaqcj6js8htau4	pf07uiuoi1kmm49d7f	3se2qu476j7tg	55qzzhs:0t	t	00:05:00	1969-12-31 18:00:19.765-07
lananaqcj6js8htau4	q910a0qdin1i6do97k	2blc6xwom46ss	55qzzhs:0u	t	00:05:00	1969-12-31 18:00:20.761-07
lananaqcj6js8htau4	q910a0qdin1i6do97k	2g43j83a271g9	55qzzhs:0u	t	00:05:00	1969-12-31 18:00:20.761-07
lananaqcj6js8htau4	q910a0qdin1i6do97k	3se2qu476j7tg	55qzzhs:0u	t	00:05:00	1969-12-31 18:00:20.761-07
lananaqcj6js8htau4	q910a0qdin1i6do97k	caqm13mxzbdr	55qzzhs:0u	t	00:05:00	1969-12-31 18:00:20.761-07
lananaqcj6js8htau4	oc0fb85rfjjnpd53vd	2g43j83a271g9	55qzzhs:0v	t	00:05:00	1969-12-31 18:00:24.513-07
lananaqcj6js8htau4	oc0fb85rfjjnpd53vd	caqm13mxzbdr	55qzzhs:0v	t	00:05:00	1969-12-31 18:00:24.513-07
lananaqcj6js8htau4	oc0fb85rfjjnpd53vd	2blc6xwom46ss	55qzzhs:0v	t	00:05:00	1969-12-31 18:00:24.513-07
lananaqcj6js8htau4	oc0fb85rfjjnpd53vd	3se2qu476j7tg	55qzzhs:0v	t	00:05:00	1969-12-31 18:00:24.513-07
lananaqcj6js8htau4	gglfcqmlreh1c952p3	gt8yfqbqc7ca	55s01w0:03	t	00:05:00	1969-12-31 18:00:31.151-07
lananaqcj6js8htau4	gglfcqmlreh1c952p3	3rnpsi5qegpt3	55s01w0:03	t	00:05:00	1969-12-31 18:00:31.151-07
lananaqcj6js8htau4	gglfcqmlreh1c952p3	3se2qu476j7tg	55s01w0:03	t	00:05:00	1969-12-31 18:00:31.151-07
lananaqcj6js8htau4	gglfcqmlreh1c952p3	caqm13mxzbdr	55s01w0:03	t	00:05:00	1969-12-31 18:00:31.151-07
lananaqcj6js8htau4	gglfcqmlreh1c952p3	2blc6xwom46ss	55s01w0:03	t	00:05:00	1969-12-31 18:00:31.151-07
lananaqcj6js8htau4	gglfcqmlreh1c952p3	2g43j83a271g9	55s721c:01	t	00:05:00	1969-12-31 18:01:15.399-07
lananaqcj6js8htau4	gglfcqmlreh1c952p3	817el2k23zdp	55s721c:01	t	00:05:00	1969-12-31 18:01:15.399-07
lananaqcj6js8htau4	gglfcqmlreh1c952p3	3t09dyzubc9zp	55s721c:01	t	00:05:00	1969-12-31 18:01:15.399-07
lananaqcj6js8htau4	gglfcqmlreh1c952p3	3unh7411ka0tz	55s721c:01	t	00:05:00	1969-12-31 18:01:15.399-07
lananaqcj6js8htau4	sc9ucjg5b5tvmsninr	2g43j83a271g9	55s721c:02	t	00:05:00	1969-12-31 18:01:16.495-07
lananaqcj6js8htau4	sc9ucjg5b5tvmsninr	3t09dyzubc9zp	55s721c:02	t	00:05:00	1969-12-31 18:01:16.495-07
lananaqcj6js8htau4	sc9ucjg5b5tvmsninr	3unh7411ka0tz	55s721c:02	t	00:05:00	1969-12-31 18:01:16.495-07
lananaqcj6js8htau4	ppllpvm2hm216a6q88	2g43j83a271g9	55s721c:03	t	00:05:00	1969-12-31 18:01:25.417-07
lananaqcj6js8htau4	ppllpvm2hm216a6q88	3t09dyzubc9zp	55s721c:03	t	00:05:00	1969-12-31 18:01:25.417-07
lananaqcj6js8htau4	ppllpvm2hm216a6q88	3unh7411ka0tz	55s721c:03	t	00:05:00	1969-12-31 18:01:25.417-07
lananaqcj6js8htau4	ppllpvm2hm216a6q88	817el2k23zdp	55s721c:03	t	00:05:00	1969-12-31 18:01:25.417-07
lananaqcj6js8htau4	sc9ucjg5b5tvmsninr	817el2k23zdp	55s721c:02	t	00:05:00	1969-12-31 18:01:16.495-07
lananaqcj6js8htau4	fq048cvlap4g6jn1me	2g43j83a271g9	55s721c:0p	t	00:05:00	1969-12-31 18:04:18.658-07
lananaqcj6js8htau4	fq048cvlap4g6jn1me	3t09dyzubc9zp	55s721c:0p	t	00:05:00	1969-12-31 18:04:18.658-07
lananaqcj6js8htau4	fq048cvlap4g6jn1me	3unh7411ka0tz	55s721c:0p	t	00:05:00	1969-12-31 18:04:18.658-07
lananaqcj6js8htau4	fq048cvlap4g6jn1me	817el2k23zdp	55s721c:0p	t	00:05:00	1969-12-31 18:04:18.658-07
lananaqcj6js8htau4	1b9kpn4jmgpdmfk0vs	2g43j83a271g9	55s721c:04	t	00:05:00	1969-12-31 18:01:28.581-07
lananaqcj6js8htau4	1b9kpn4jmgpdmfk0vs	3t09dyzubc9zp	55s721c:04	t	00:05:00	1969-12-31 18:01:28.581-07
lananaqcj6js8htau4	1b9kpn4jmgpdmfk0vs	3unh7411ka0tz	55s721c:04	t	00:05:00	1969-12-31 18:01:28.581-07
lananaqcj6js8htau4	1b9kpn4jmgpdmfk0vs	817el2k23zdp	55s721c:04	t	00:05:00	1969-12-31 18:01:28.581-07
lananaqcj6js8htau4	geikudgc0qcm1o429i	2g43j83a271g9	55s721c:12k	t	00:05:00	1969-12-31 18:12:55.694-07
lananaqcj6js8htau4	geikudgc0qcm1o429i	3t09dyzubc9zp	55s721c:12k	t	00:05:00	1969-12-31 18:12:55.694-07
lananaqcj6js8htau4	geikudgc0qcm1o429i	3unh7411ka0tz	55s721c:12k	t	00:05:00	1969-12-31 18:12:55.694-07
lananaqcj6js8htau4	geikudgc0qcm1o429i	817el2k23zdp	55s721c:12k	t	00:05:00	1969-12-31 18:12:55.694-07
lananaqcj6js8htau4	t39ndr5e61u9hk4ok4	2g43j83a271g9	55s721c:0d	t	00:05:00	1969-12-31 18:03:08.962-07
lananaqcj6js8htau4	t39ndr5e61u9hk4ok4	3t09dyzubc9zp	55s721c:0d	t	00:05:00	1969-12-31 18:03:08.962-07
lananaqcj6js8htau4	t39ndr5e61u9hk4ok4	3unh7411ka0tz	55s721c:0d	t	00:05:00	1969-12-31 18:03:08.962-07
lananaqcj6js8htau4	t39ndr5e61u9hk4ok4	817el2k23zdp	55s721c:0d	t	00:05:00	1969-12-31 18:03:08.962-07
lananaqcj6js8htau4	3jvra537lcg38jnt5o	2g43j83a271g9	55s721c:0q	t	00:05:00	1969-12-31 18:04:34.773-07
lananaqcj6js8htau4	3jvra537lcg38jnt5o	3t09dyzubc9zp	55s721c:0q	t	00:05:00	1969-12-31 18:04:34.773-07
lananaqcj6js8htau4	3jvra537lcg38jnt5o	3unh7411ka0tz	55s721c:0q	t	00:05:00	1969-12-31 18:04:34.773-07
lananaqcj6js8htau4	3jvra537lcg38jnt5o	817el2k23zdp	55s721c:0q	t	00:05:00	1969-12-31 18:04:34.773-07
lananaqcj6js8htau4	hinbn4mg8p6n5irmlb	2g43j83a271g9	55s721c:0f	t	00:05:00	1969-12-31 18:03:15.721-07
lananaqcj6js8htau4	hinbn4mg8p6n5irmlb	3t09dyzubc9zp	55s721c:0f	t	00:05:00	1969-12-31 18:03:15.721-07
lananaqcj6js8htau4	hinbn4mg8p6n5irmlb	3unh7411ka0tz	55s721c:0f	t	00:05:00	1969-12-31 18:03:15.721-07
lananaqcj6js8htau4	hinbn4mg8p6n5irmlb	817el2k23zdp	55s721c:0f	t	00:05:00	1969-12-31 18:03:15.721-07
lananaqcj6js8htau4	0sbbgfr7fvcetnd7ct	2g43j83a271g9	55s721c:0r	t	00:05:00	1969-12-31 18:04:36.677-07
lananaqcj6js8htau4	0sbbgfr7fvcetnd7ct	3t09dyzubc9zp	55s721c:0r	t	00:05:00	1969-12-31 18:04:36.677-07
lananaqcj6js8htau4	0sbbgfr7fvcetnd7ct	3unh7411ka0tz	55s721c:0r	t	00:05:00	1969-12-31 18:04:36.677-07
lananaqcj6js8htau4	0sbbgfr7fvcetnd7ct	817el2k23zdp	55s721c:0r	t	00:05:00	1969-12-31 18:04:36.677-07
lananaqcj6js8htau4	nqufvhpv0o76o42rgr	817el2k23zdp	55s721c:11b	t	00:05:00	1969-12-31 18:07:56.499-07
nucjcspfqppevp3r6i	n5jkc8s79d579o1f7m	2g43j83a271g9	00:01	f	00:05:00	\N
f6ensgggfospg8ohnh	26c8ml3gv3nob99h2m	2g43j83a271g9	00:01	f	00:05:00	\N
uk74dsudpgd94faf3n	lr7sv2hbqcc92umbi7	3se2qu476j7tg	563o7s8:12y	t	00:05:00	1969-12-31 17:29:19.101-07
uk74dsudpgd94faf3n	p2js0q407lckpo0c3t	2g43j83a271g9	55zqif4:03	t	00:05:00	1969-12-31 17:00:19.419-07
lananaqcj6js8htau4	euu8rss4vavc9t5nk0	2g43j83a271g9	55s721c:12l	t	00:05:00	1969-12-31 18:12:55.733-07
lananaqcj6js8htau4	euu8rss4vavc9t5nk0	3t09dyzubc9zp	55s721c:12l	t	00:05:00	1969-12-31 18:12:55.733-07
lananaqcj6js8htau4	euu8rss4vavc9t5nk0	3unh7411ka0tz	55s721c:12l	t	00:05:00	1969-12-31 18:12:55.733-07
lananaqcj6js8htau4	euu8rss4vavc9t5nk0	817el2k23zdp	55s721c:12l	t	00:05:00	1969-12-31 18:12:55.733-07
lananaqcj6js8htau4	9qhi0nc25jbsad6mpv	2g43j83a271g9	55s721c:11d	t	00:05:00	1969-12-31 18:08:12.881-07
lananaqcj6js8htau4	9qhi0nc25jbsad6mpv	3t09dyzubc9zp	55s721c:11d	t	00:05:00	1969-12-31 18:08:12.881-07
lananaqcj6js8htau4	9qhi0nc25jbsad6mpv	3unh7411ka0tz	55s721c:11d	t	00:05:00	1969-12-31 18:08:12.881-07
lananaqcj6js8htau4	9qhi0nc25jbsad6mpv	817el2k23zdp	55s721c:11d	t	00:05:00	1969-12-31 18:08:12.881-07
lananaqcj6js8htau4	n7k29o5c5k178cv3g8	2g43j83a271g9	55s721c:12m	t	00:05:00	1969-12-31 18:13:02.414-07
lananaqcj6js8htau4	n7k29o5c5k178cv3g8	3t09dyzubc9zp	55s721c:12m	t	00:05:00	1969-12-31 18:13:02.414-07
lananaqcj6js8htau4	n7k29o5c5k178cv3g8	3unh7411ka0tz	55s721c:12m	t	00:05:00	1969-12-31 18:13:02.414-07
lananaqcj6js8htau4	n7k29o5c5k178cv3g8	817el2k23zdp	55s721c:12m	t	00:05:00	1969-12-31 18:13:02.414-07
lananaqcj6js8htau4	0bo94bgir0nlat88ga	2g43j83a271g9	55s721c:11e	t	00:05:00	1969-12-31 18:08:21.161-07
lananaqcj6js8htau4	0bo94bgir0nlat88ga	3t09dyzubc9zp	55s721c:11e	t	00:05:00	1969-12-31 18:08:21.161-07
lananaqcj6js8htau4	0bo94bgir0nlat88ga	3unh7411ka0tz	55s721c:11e	t	00:05:00	1969-12-31 18:08:21.161-07
lananaqcj6js8htau4	0bo94bgir0nlat88ga	817el2k23zdp	55s721c:11e	t	00:05:00	1969-12-31 18:08:21.161-07
lananaqcj6js8htau4	tt45ekuiptnlbtq63d	2g43j83a271g9	55s721c:11f	t	00:05:00	1969-12-31 18:08:28.488-07
lananaqcj6js8htau4	tt45ekuiptnlbtq63d	3t09dyzubc9zp	55s721c:11f	t	00:05:00	1969-12-31 18:08:28.488-07
lananaqcj6js8htau4	tt45ekuiptnlbtq63d	3unh7411ka0tz	55s721c:11f	t	00:05:00	1969-12-31 18:08:28.488-07
lananaqcj6js8htau4	tt45ekuiptnlbtq63d	817el2k23zdp	55s721c:11f	t	00:05:00	1969-12-31 18:08:28.488-07
lananaqcj6js8htau4	vn4jegr3u627a7ccnj	2g43j83a271g9	55s721c:11g	t	00:05:00	1969-12-31 18:08:42.653-07
lananaqcj6js8htau4	vn4jegr3u627a7ccnj	3t09dyzubc9zp	55s721c:11g	t	00:05:00	1969-12-31 18:08:42.653-07
lananaqcj6js8htau4	vn4jegr3u627a7ccnj	3unh7411ka0tz	55s721c:11g	t	00:05:00	1969-12-31 18:08:42.653-07
lananaqcj6js8htau4	vn4jegr3u627a7ccnj	817el2k23zdp	55s721c:11g	t	00:05:00	1969-12-31 18:08:42.653-07
lananaqcj6js8htau4	4sb859kd68cudinl92	2g43j83a271g9	55s721c:12o	t	00:05:00	1969-12-31 18:13:15.085-07
lananaqcj6js8htau4	4sb859kd68cudinl92	3t09dyzubc9zp	55s721c:12o	t	00:05:00	1969-12-31 18:13:15.085-07
lananaqcj6js8htau4	4sb859kd68cudinl92	3unh7411ka0tz	55s721c:12o	t	00:05:00	1969-12-31 18:13:15.085-07
lananaqcj6js8htau4	4sb859kd68cudinl92	817el2k23zdp	55s721c:12o	t	00:05:00	1969-12-31 18:13:15.085-07
uk74dsudpgd94faf3n	l6d2f2geskb3pdp90v	3se2qu476j7tg	55zqif4:0a	t	00:05:00	1969-12-31 17:00:23.63-07
uk74dsudpgd94faf3n	l6d2f2geskb3pdp90v	caqm13mxzbdr	55zqif4:0a	t	00:05:00	1969-12-31 17:00:23.63-07
uk74dsudpgd94faf3n	l6d2f2geskb3pdp90v	2blc6xwom46ss	55zqif4:0a	t	00:05:00	1969-12-31 17:00:23.63-07
uk74dsudpgd94faf3n	dti5osh448d4r3pg2t	817el2k23zdp	55zqif4:0r	t	00:05:00	1969-12-31 17:02:19.403-07
uk74dsudpgd94faf3n	9f3elvilaek4nrlmbn	e2hz9kajle2s	5615vzc:01	t	00:05:00	1969-12-31 17:07:01.636-07
uk74dsudpgd94faf3n	4966gqdvsogft8umig	e2hz9kajle2s	5615vzc:0f	f	00:05:00	\N
qnohrfdk062faauu7h	qcqnhg2f3596gmv17l	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	36dfi12lu32df57mpm	2g43j83a271g9	55s721c:06	t	00:05:00	1969-12-31 18:01:54.247-07
uk74dsudpgd94faf3n	lr7sv2hbqcc92umbi7	caqm13mxzbdr	563o7s8:12y	t	00:05:00	1969-12-31 17:29:19.101-07
lananaqcj6js8htau4	b3pdm9h13dkcv77vsu	2g43j83a271g9	55s721c:12n	t	00:05:00	1969-12-31 18:13:02.514-07
lananaqcj6js8htau4	b3pdm9h13dkcv77vsu	3t09dyzubc9zp	55s721c:12n	t	00:05:00	1969-12-31 18:13:02.514-07
lananaqcj6js8htau4	b3pdm9h13dkcv77vsu	3unh7411ka0tz	55s721c:12n	t	00:05:00	1969-12-31 18:13:02.514-07
lananaqcj6js8htau4	b3pdm9h13dkcv77vsu	817el2k23zdp	55s721c:12n	t	00:05:00	1969-12-31 18:13:02.514-07
lananaqcj6js8htau4	ujkiiqs62fukkp2q0o	2g43j83a271g9	55s721c:0s	t	00:05:00	1969-12-31 18:04:36.714-07
lananaqcj6js8htau4	ujkiiqs62fukkp2q0o	3t09dyzubc9zp	55s721c:0s	t	00:05:00	1969-12-31 18:04:36.714-07
lananaqcj6js8htau4	ujkiiqs62fukkp2q0o	3unh7411ka0tz	55s721c:0s	t	00:05:00	1969-12-31 18:04:36.714-07
lananaqcj6js8htau4	ujkiiqs62fukkp2q0o	817el2k23zdp	55s721c:0s	t	00:05:00	1969-12-31 18:04:36.714-07
lananaqcj6js8htau4	8ra6i1578vt1617e56	2g43j83a271g9	55s721c:0t	t	00:05:00	1969-12-31 18:04:46.85-07
lananaqcj6js8htau4	8ra6i1578vt1617e56	3t09dyzubc9zp	55s721c:0t	t	00:05:00	1969-12-31 18:04:46.85-07
lananaqcj6js8htau4	8ra6i1578vt1617e56	3unh7411ka0tz	55s721c:0t	t	00:05:00	1969-12-31 18:04:46.85-07
lananaqcj6js8htau4	8ra6i1578vt1617e56	817el2k23zdp	55s721c:0t	t	00:05:00	1969-12-31 18:04:46.85-07
uk74dsudpgd94faf3n	p2js0q407lckpo0c3t	2blc6xwom46ss	55zqif4:03	t	00:05:00	1969-12-31 17:00:19.419-07
uk74dsudpgd94faf3n	p2js0q407lckpo0c3t	3se2qu476j7tg	55zqif4:03	t	00:05:00	1969-12-31 17:00:19.419-07
uk74dsudpgd94faf3n	p2js0q407lckpo0c3t	caqm13mxzbdr	55zqif4:03	t	00:05:00	1969-12-31 17:00:19.419-07
uk74dsudpgd94faf3n	rmieo9fv7snclq14ju	2g43j83a271g9	55zqif4:0g	t	00:05:00	1969-12-31 17:00:50.818-07
lananaqcj6js8htau4	m219vnio4p9lrro4hn	2g43j83a271g9	55s721c:11h	t	00:05:00	1969-12-31 18:08:55.891-07
lananaqcj6js8htau4	m219vnio4p9lrro4hn	3t09dyzubc9zp	55s721c:11h	t	00:05:00	1969-12-31 18:08:55.891-07
lananaqcj6js8htau4	m219vnio4p9lrro4hn	3unh7411ka0tz	55s721c:11h	t	00:05:00	1969-12-31 18:08:55.891-07
lananaqcj6js8htau4	m219vnio4p9lrro4hn	817el2k23zdp	55s721c:11h	t	00:05:00	1969-12-31 18:08:55.891-07
uk74dsudpgd94faf3n	rmieo9fv7snclq14ju	3t09dyzubc9zp	55zqif4:0g	t	00:05:00	1969-12-31 17:00:50.818-07
uk74dsudpgd94faf3n	rmieo9fv7snclq14ju	3unh7411ka0tz	55zqif4:0g	t	00:05:00	1969-12-31 17:00:50.818-07
uk74dsudpgd94faf3n	rmieo9fv7snclq14ju	817el2k23zdp	55zqif4:0g	t	00:05:00	1969-12-31 17:00:50.818-07
uk74dsudpgd94faf3n	68nhhdlj6c5j2qushu	2g43j83a271g9	55zqif4:0h	t	00:05:00	1969-12-31 17:01:06.078-07
lananaqcj6js8htau4	jihvuc5uas0aqlc9c3	2g43j83a271g9	55s721c:11i	t	00:05:00	1969-12-31 18:09:08.826-07
lananaqcj6js8htau4	jihvuc5uas0aqlc9c3	3t09dyzubc9zp	55s721c:11i	t	00:05:00	1969-12-31 18:09:08.826-07
lananaqcj6js8htau4	jihvuc5uas0aqlc9c3	3unh7411ka0tz	55s721c:11i	t	00:05:00	1969-12-31 18:09:08.826-07
lananaqcj6js8htau4	jihvuc5uas0aqlc9c3	817el2k23zdp	55s721c:11i	t	00:05:00	1969-12-31 18:09:08.826-07
lananaqcj6js8htau4	1iq1lab15hgktbtvel	2g43j83a271g9	55s721c:11j	t	00:05:00	1969-12-31 18:09:33.727-07
lananaqcj6js8htau4	1iq1lab15hgktbtvel	3t09dyzubc9zp	55s721c:11j	t	00:05:00	1969-12-31 18:09:33.727-07
lananaqcj6js8htau4	1iq1lab15hgktbtvel	3unh7411ka0tz	55s721c:11j	t	00:05:00	1969-12-31 18:09:33.727-07
lananaqcj6js8htau4	1iq1lab15hgktbtvel	817el2k23zdp	55s721c:11j	t	00:05:00	1969-12-31 18:09:33.727-07
uk74dsudpgd94faf3n	68nhhdlj6c5j2qushu	3t09dyzubc9zp	55zqif4:0h	t	00:05:00	1969-12-31 17:01:06.078-07
uk74dsudpgd94faf3n	68nhhdlj6c5j2qushu	3unh7411ka0tz	55zqif4:0h	t	00:05:00	1969-12-31 17:01:06.078-07
uk74dsudpgd94faf3n	68nhhdlj6c5j2qushu	817el2k23zdp	55zqif4:0h	t	00:05:00	1969-12-31 17:01:06.078-07
uk74dsudpgd94faf3n	dti5osh448d4r3pg2t	2g43j83a271g9	55zqif4:0r	t	00:05:00	1969-12-31 17:02:19.403-07
uk74dsudpgd94faf3n	dti5osh448d4r3pg2t	3t09dyzubc9zp	55zqif4:0r	t	00:05:00	1969-12-31 17:02:19.403-07
uk74dsudpgd94faf3n	dti5osh448d4r3pg2t	3unh7411ka0tz	55zqif4:0r	t	00:05:00	1969-12-31 17:02:19.403-07
uk74dsudpgd94faf3n	4ph0kmrv36sl7qmo6d	2g43j83a271g9	55zqif4:0s	t	00:05:00	1969-12-31 17:02:22.6-07
uk74dsudpgd94faf3n	4ph0kmrv36sl7qmo6d	3t09dyzubc9zp	55zqif4:0s	t	00:05:00	1969-12-31 17:02:22.6-07
uk74dsudpgd94faf3n	4ph0kmrv36sl7qmo6d	3unh7411ka0tz	55zqif4:0s	t	00:05:00	1969-12-31 17:02:22.6-07
uk74dsudpgd94faf3n	4ph0kmrv36sl7qmo6d	817el2k23zdp	55zqif4:0s	t	00:05:00	1969-12-31 17:02:22.6-07
uk74dsudpgd94faf3n	f108rlel25bqc57de5	2g43j83a271g9	55zqif4:0t	t	00:05:00	1969-12-31 17:02:27.575-07
uk74dsudpgd94faf3n	f108rlel25bqc57de5	3t09dyzubc9zp	55zqif4:0t	t	00:05:00	1969-12-31 17:02:27.575-07
uk74dsudpgd94faf3n	f108rlel25bqc57de5	3unh7411ka0tz	55zqif4:0t	t	00:05:00	1969-12-31 17:02:27.575-07
uk74dsudpgd94faf3n	f108rlel25bqc57de5	817el2k23zdp	55zqif4:0t	t	00:05:00	1969-12-31 17:02:27.575-07
uk74dsudpgd94faf3n	uhoho922jljf4pi8al	2g43j83a271g9	55zqif4:0u	t	00:05:00	1969-12-31 17:02:43.423-07
uk74dsudpgd94faf3n	uhoho922jljf4pi8al	3t09dyzubc9zp	55zqif4:0u	t	00:05:00	1969-12-31 17:02:43.423-07
uk74dsudpgd94faf3n	uhoho922jljf4pi8al	3unh7411ka0tz	55zqif4:0u	t	00:05:00	1969-12-31 17:02:43.423-07
uk74dsudpgd94faf3n	uhoho922jljf4pi8al	817el2k23zdp	55zqif4:0u	t	00:05:00	1969-12-31 17:02:43.423-07
uk74dsudpgd94faf3n	oh2756p6ihr1asgk8c	2g43j83a271g9	55zqif4:0v	t	00:05:00	1969-12-31 17:03:00.637-07
uk74dsudpgd94faf3n	oh2756p6ihr1asgk8c	3t09dyzubc9zp	55zqif4:0v	t	00:05:00	1969-12-31 17:03:00.637-07
uk74dsudpgd94faf3n	oh2756p6ihr1asgk8c	3unh7411ka0tz	55zqif4:0v	t	00:05:00	1969-12-31 17:03:00.637-07
uk74dsudpgd94faf3n	oh2756p6ihr1asgk8c	817el2k23zdp	55zqif4:0v	t	00:05:00	1969-12-31 17:03:00.637-07
uk74dsudpgd94faf3n	qenbt2vac620674d7h	2g43j83a271g9	55zqif4:0w	t	00:05:00	1969-12-31 17:03:32.815-07
uk74dsudpgd94faf3n	qenbt2vac620674d7h	3t09dyzubc9zp	55zqif4:0w	t	00:05:00	1969-12-31 17:03:32.815-07
uk74dsudpgd94faf3n	qenbt2vac620674d7h	3unh7411ka0tz	55zqif4:0w	t	00:05:00	1969-12-31 17:03:32.815-07
uk74dsudpgd94faf3n	qenbt2vac620674d7h	817el2k23zdp	55zqif4:0w	t	00:05:00	1969-12-31 17:03:32.815-07
uk74dsudpgd94faf3n	mb4scqgdtq2m7pl4r2	2g43j83a271g9	55zqif4:0x	t	00:05:00	1969-12-31 17:03:33.493-07
uk74dsudpgd94faf3n	mb4scqgdtq2m7pl4r2	3t09dyzubc9zp	55zqif4:0x	t	00:05:00	1969-12-31 17:03:33.493-07
uk74dsudpgd94faf3n	mb4scqgdtq2m7pl4r2	3unh7411ka0tz	55zqif4:0x	t	00:05:00	1969-12-31 17:03:33.493-07
uk74dsudpgd94faf3n	mb4scqgdtq2m7pl4r2	817el2k23zdp	55zqif4:0x	t	00:05:00	1969-12-31 17:03:33.493-07
uk74dsudpgd94faf3n	egnojv4le0um5kscf1	2g43j83a271g9	55zqif4:0y	t	00:05:00	1969-12-31 17:03:38.874-07
lananaqcj6js8htau4	o7emq6ggm0ics942jn	2g43j83a271g9	55s721c:11m	t	00:05:00	1969-12-31 18:09:56.474-07
lananaqcj6js8htau4	o7emq6ggm0ics942jn	3t09dyzubc9zp	55s721c:11m	t	00:05:00	1969-12-31 18:09:56.474-07
lananaqcj6js8htau4	o7emq6ggm0ics942jn	3unh7411ka0tz	55s721c:11m	t	00:05:00	1969-12-31 18:09:56.474-07
lananaqcj6js8htau4	36dfi12lu32df57mpm	3t09dyzubc9zp	55s721c:06	t	00:05:00	1969-12-31 18:01:54.247-07
lananaqcj6js8htau4	36dfi12lu32df57mpm	3unh7411ka0tz	55s721c:06	t	00:05:00	1969-12-31 18:01:54.247-07
lananaqcj6js8htau4	36dfi12lu32df57mpm	817el2k23zdp	55s721c:06	t	00:05:00	1969-12-31 18:01:54.247-07
lananaqcj6js8htau4	o7emq6ggm0ics942jn	817el2k23zdp	55s721c:11m	t	00:05:00	1969-12-31 18:09:56.474-07
lananaqcj6js8htau4	q0fvq8uf44r9694ei9	2g43j83a271g9	55s721c:07	t	00:05:00	1969-12-31 18:01:58.193-07
lananaqcj6js8htau4	q0fvq8uf44r9694ei9	3t09dyzubc9zp	55s721c:07	t	00:05:00	1969-12-31 18:01:58.193-07
lananaqcj6js8htau4	q0fvq8uf44r9694ei9	3unh7411ka0tz	55s721c:07	t	00:05:00	1969-12-31 18:01:58.193-07
lananaqcj6js8htau4	q0fvq8uf44r9694ei9	817el2k23zdp	55s721c:07	t	00:05:00	1969-12-31 18:01:58.193-07
lananaqcj6js8htau4	5anej8ni3vuktl23eo	2g43j83a271g9	55s721c:09	t	00:05:00	1969-12-31 18:02:05.442-07
fnfm99oelq3cqe42ki	a7dtaqbjs8ts7kmghf	2g43j83a271g9	00:01	f	00:05:00	\N
lananaqcj6js8htau4	82q1sldf4neqbn2do9	2g43j83a271g9	55s721c:0c	t	00:05:00	1969-12-31 18:03:00.996-07
lananaqcj6js8htau4	82q1sldf4neqbn2do9	3t09dyzubc9zp	55s721c:0c	t	00:05:00	1969-12-31 18:03:00.996-07
lananaqcj6js8htau4	82q1sldf4neqbn2do9	3unh7411ka0tz	55s721c:0c	t	00:05:00	1969-12-31 18:03:00.996-07
lananaqcj6js8htau4	82q1sldf4neqbn2do9	817el2k23zdp	55s721c:0c	t	00:05:00	1969-12-31 18:03:00.996-07
lananaqcj6js8htau4	dqfo7rccgkkcuudljc	2g43j83a271g9	55s721c:0u	t	00:05:00	1969-12-31 18:04:54.274-07
lananaqcj6js8htau4	dqfo7rccgkkcuudljc	3t09dyzubc9zp	55s721c:0u	t	00:05:00	1969-12-31 18:04:54.274-07
lananaqcj6js8htau4	dqfo7rccgkkcuudljc	3unh7411ka0tz	55s721c:0u	t	00:05:00	1969-12-31 18:04:54.274-07
lananaqcj6js8htau4	dqfo7rccgkkcuudljc	817el2k23zdp	55s721c:0u	t	00:05:00	1969-12-31 18:04:54.274-07
uk74dsudpgd94faf3n	l6d2f2geskb3pdp90v	2g43j83a271g9	55zqif4:0b	t	00:05:00	1969-12-31 17:00:36.376-07
lananaqcj6js8htau4	eumc7iqj5j5smj4n2r	2g43j83a271g9	55s721c:0v	t	00:05:00	1969-12-31 18:05:09.877-07
lananaqcj6js8htau4	eumc7iqj5j5smj4n2r	3t09dyzubc9zp	55s721c:0v	t	00:05:00	1969-12-31 18:05:09.877-07
lananaqcj6js8htau4	eumc7iqj5j5smj4n2r	3unh7411ka0tz	55s721c:0v	t	00:05:00	1969-12-31 18:05:09.877-07
lananaqcj6js8htau4	eumc7iqj5j5smj4n2r	817el2k23zdp	55s721c:0v	t	00:05:00	1969-12-31 18:05:09.877-07
lananaqcj6js8htau4	f5tr712njubm0h9fpa	2g43j83a271g9	55s721c:12p	t	00:05:00	1969-12-31 18:13:22.642-07
lananaqcj6js8htau4	f5tr712njubm0h9fpa	3t09dyzubc9zp	55s721c:12p	t	00:05:00	1969-12-31 18:13:22.642-07
lananaqcj6js8htau4	f5tr712njubm0h9fpa	3unh7411ka0tz	55s721c:12p	t	00:05:00	1969-12-31 18:13:22.642-07
lananaqcj6js8htau4	f5tr712njubm0h9fpa	817el2k23zdp	55s721c:12p	t	00:05:00	1969-12-31 18:13:22.642-07
lananaqcj6js8htau4	7ev85klbd0r8u9ttil	2g43j83a271g9	55s721c:0w	t	00:05:00	1969-12-31 18:05:20.056-07
lananaqcj6js8htau4	7ev85klbd0r8u9ttil	3t09dyzubc9zp	55s721c:0w	t	00:05:00	1969-12-31 18:05:20.056-07
lananaqcj6js8htau4	7ev85klbd0r8u9ttil	3unh7411ka0tz	55s721c:0w	t	00:05:00	1969-12-31 18:05:20.056-07
lananaqcj6js8htau4	7ev85klbd0r8u9ttil	817el2k23zdp	55s721c:0w	t	00:05:00	1969-12-31 18:05:20.056-07
lananaqcj6js8htau4	ss5emt4bhcuri1hmsi	2g43j83a271g9	55s721c:0y	t	00:05:00	1969-12-31 18:05:34.791-07
lananaqcj6js8htau4	ss5emt4bhcuri1hmsi	3t09dyzubc9zp	55s721c:0y	t	00:05:00	1969-12-31 18:05:34.791-07
lananaqcj6js8htau4	ss5emt4bhcuri1hmsi	3unh7411ka0tz	55s721c:0y	t	00:05:00	1969-12-31 18:05:34.791-07
lananaqcj6js8htau4	ss5emt4bhcuri1hmsi	817el2k23zdp	55s721c:0y	t	00:05:00	1969-12-31 18:05:34.791-07
lananaqcj6js8htau4	eq9cpkhikaf79uv875	2g43j83a271g9	55s721c:12r	t	00:05:00	1969-12-31 18:13:54.161-07
lananaqcj6js8htau4	eq9cpkhikaf79uv875	3t09dyzubc9zp	55s721c:12r	t	00:05:00	1969-12-31 18:13:54.161-07
lananaqcj6js8htau4	eq9cpkhikaf79uv875	3unh7411ka0tz	55s721c:12r	t	00:05:00	1969-12-31 18:13:54.161-07
lananaqcj6js8htau4	m4m19eonpdsjlr22h9	2g43j83a271g9	55s721c:0z	t	00:05:00	1969-12-31 18:05:48.966-07
lananaqcj6js8htau4	m4m19eonpdsjlr22h9	3t09dyzubc9zp	55s721c:0z	t	00:05:00	1969-12-31 18:05:48.966-07
lananaqcj6js8htau4	m4m19eonpdsjlr22h9	3unh7411ka0tz	55s721c:0z	t	00:05:00	1969-12-31 18:05:48.966-07
lananaqcj6js8htau4	m4m19eonpdsjlr22h9	817el2k23zdp	55s721c:0z	t	00:05:00	1969-12-31 18:05:48.966-07
lananaqcj6js8htau4	qdm2lbunbrq74s767q	2g43j83a271g9	55s721c:110	t	00:05:00	1969-12-31 18:06:03.977-07
lananaqcj6js8htau4	qdm2lbunbrq74s767q	3t09dyzubc9zp	55s721c:110	t	00:05:00	1969-12-31 18:06:03.977-07
lananaqcj6js8htau4	qdm2lbunbrq74s767q	3unh7411ka0tz	55s721c:110	t	00:05:00	1969-12-31 18:06:03.977-07
lananaqcj6js8htau4	qdm2lbunbrq74s767q	817el2k23zdp	55s721c:110	t	00:05:00	1969-12-31 18:06:03.977-07
lananaqcj6js8htau4	shopubpnb4nbsjoqu3	2g43j83a271g9	55s721c:111	t	00:05:00	1969-12-31 18:06:19.683-07
lananaqcj6js8htau4	shopubpnb4nbsjoqu3	3t09dyzubc9zp	55s721c:111	t	00:05:00	1969-12-31 18:06:19.683-07
lananaqcj6js8htau4	shopubpnb4nbsjoqu3	3unh7411ka0tz	55s721c:111	t	00:05:00	1969-12-31 18:06:19.683-07
lananaqcj6js8htau4	shopubpnb4nbsjoqu3	817el2k23zdp	55s721c:111	t	00:05:00	1969-12-31 18:06:19.683-07
lananaqcj6js8htau4	217ecr7ogtdppvra98	2g43j83a271g9	55s721c:112	t	00:05:00	1969-12-31 18:06:27.426-07
lananaqcj6js8htau4	217ecr7ogtdppvra98	3t09dyzubc9zp	55s721c:112	t	00:05:00	1969-12-31 18:06:27.426-07
lananaqcj6js8htau4	217ecr7ogtdppvra98	3unh7411ka0tz	55s721c:112	t	00:05:00	1969-12-31 18:06:27.426-07
lananaqcj6js8htau4	217ecr7ogtdppvra98	817el2k23zdp	55s721c:112	t	00:05:00	1969-12-31 18:06:27.426-07
lananaqcj6js8htau4	ilnfaqv6quirc3gp83	2g43j83a271g9	55s721c:11k	t	00:05:00	1969-12-31 18:09:46.781-07
lananaqcj6js8htau4	ilnfaqv6quirc3gp83	3t09dyzubc9zp	55s721c:11k	t	00:05:00	1969-12-31 18:09:46.781-07
lananaqcj6js8htau4	ilnfaqv6quirc3gp83	3unh7411ka0tz	55s721c:11k	t	00:05:00	1969-12-31 18:09:46.781-07
lananaqcj6js8htau4	ilnfaqv6quirc3gp83	817el2k23zdp	55s721c:11k	t	00:05:00	1969-12-31 18:09:46.781-07
lananaqcj6js8htau4	dhqlu0adrdrt3li1mf	2g43j83a271g9	55s721c:11l	t	00:05:00	1969-12-31 18:09:47.848-07
lananaqcj6js8htau4	dhqlu0adrdrt3li1mf	3t09dyzubc9zp	55s721c:11l	t	00:05:00	1969-12-31 18:09:47.848-07
lananaqcj6js8htau4	dhqlu0adrdrt3li1mf	3unh7411ka0tz	55s721c:11l	t	00:05:00	1969-12-31 18:09:47.848-07
lananaqcj6js8htau4	dhqlu0adrdrt3li1mf	817el2k23zdp	55s721c:11l	t	00:05:00	1969-12-31 18:09:47.848-07
lananaqcj6js8htau4	uv0l8e2v0440fri1rq	2g43j83a271g9	55s721c:0i	t	00:05:00	1969-12-31 18:03:35.182-07
lananaqcj6js8htau4	uv0l8e2v0440fri1rq	3t09dyzubc9zp	55s721c:0i	t	00:05:00	1969-12-31 18:03:35.182-07
lananaqcj6js8htau4	uv0l8e2v0440fri1rq	3unh7411ka0tz	55s721c:0i	t	00:05:00	1969-12-31 18:03:35.182-07
lananaqcj6js8htau4	uv0l8e2v0440fri1rq	817el2k23zdp	55s721c:0i	t	00:05:00	1969-12-31 18:03:35.182-07
lananaqcj6js8htau4	2lvdurtid9p1ote19n	2g43j83a271g9	55s721c:12q	t	00:05:00	1969-12-31 18:13:38.514-07
lananaqcj6js8htau4	2lvdurtid9p1ote19n	3t09dyzubc9zp	55s721c:12q	t	00:05:00	1969-12-31 18:13:38.514-07
lananaqcj6js8htau4	2lvdurtid9p1ote19n	3unh7411ka0tz	55s721c:12q	t	00:05:00	1969-12-31 18:13:38.514-07
lananaqcj6js8htau4	5anej8ni3vuktl23eo	3t09dyzubc9zp	55s721c:09	t	00:05:00	1969-12-31 18:02:05.442-07
lananaqcj6js8htau4	5anej8ni3vuktl23eo	3unh7411ka0tz	55s721c:09	t	00:05:00	1969-12-31 18:02:05.442-07
lananaqcj6js8htau4	5anej8ni3vuktl23eo	817el2k23zdp	55s721c:09	t	00:05:00	1969-12-31 18:02:05.442-07
lananaqcj6js8htau4	jluhab2qsft6kt1svs	2g43j83a271g9	55s721c:0a	t	00:05:00	1969-12-31 18:02:06.558-07
lananaqcj6js8htau4	jluhab2qsft6kt1svs	3t09dyzubc9zp	55s721c:0a	t	00:05:00	1969-12-31 18:02:06.558-07
lananaqcj6js8htau4	jluhab2qsft6kt1svs	3unh7411ka0tz	55s721c:0a	t	00:05:00	1969-12-31 18:02:06.558-07
lananaqcj6js8htau4	jluhab2qsft6kt1svs	817el2k23zdp	55s721c:0a	t	00:05:00	1969-12-31 18:02:06.558-07
lananaqcj6js8htau4	raq8cr50860e1s88ur	2g43j83a271g9	55s721c:0b	t	00:05:00	1969-12-31 18:02:49.211-07
lananaqcj6js8htau4	raq8cr50860e1s88ur	3t09dyzubc9zp	55s721c:0b	t	00:05:00	1969-12-31 18:02:49.211-07
lananaqcj6js8htau4	raq8cr50860e1s88ur	3unh7411ka0tz	55s721c:0b	t	00:05:00	1969-12-31 18:02:49.211-07
lananaqcj6js8htau4	raq8cr50860e1s88ur	817el2k23zdp	55s721c:0b	t	00:05:00	1969-12-31 18:02:49.211-07
lananaqcj6js8htau4	tf1t4ja3t67fu6j2is	2g43j83a271g9	55s721c:113	t	00:05:00	1969-12-31 18:06:41.914-07
lananaqcj6js8htau4	tf1t4ja3t67fu6j2is	3t09dyzubc9zp	55s721c:113	t	00:05:00	1969-12-31 18:06:41.914-07
lananaqcj6js8htau4	tf1t4ja3t67fu6j2is	3unh7411ka0tz	55s721c:113	t	00:05:00	1969-12-31 18:06:41.914-07
lananaqcj6js8htau4	2vkcqn0ptb2lr770f4	2g43j83a271g9	55s721c:0e	t	00:05:00	1969-12-31 18:03:10.041-07
lananaqcj6js8htau4	2vkcqn0ptb2lr770f4	3t09dyzubc9zp	55s721c:0e	t	00:05:00	1969-12-31 18:03:10.041-07
lananaqcj6js8htau4	2vkcqn0ptb2lr770f4	3unh7411ka0tz	55s721c:0e	t	00:05:00	1969-12-31 18:03:10.041-07
lananaqcj6js8htau4	2vkcqn0ptb2lr770f4	817el2k23zdp	55s721c:0e	t	00:05:00	1969-12-31 18:03:10.041-07
lananaqcj6js8htau4	tf1t4ja3t67fu6j2is	817el2k23zdp	55s721c:113	t	00:05:00	1969-12-31 18:06:41.914-07
lananaqcj6js8htau4	phkr9baaadjgqh6nft	2g43j83a271g9	55s721c:0g	t	00:05:00	1969-12-31 18:03:25.894-07
lananaqcj6js8htau4	phkr9baaadjgqh6nft	3t09dyzubc9zp	55s721c:0g	t	00:05:00	1969-12-31 18:03:25.894-07
lananaqcj6js8htau4	phkr9baaadjgqh6nft	3unh7411ka0tz	55s721c:0g	t	00:05:00	1969-12-31 18:03:25.894-07
lananaqcj6js8htau4	phkr9baaadjgqh6nft	817el2k23zdp	55s721c:0g	t	00:05:00	1969-12-31 18:03:25.894-07
lananaqcj6js8htau4	3pp2l96u2mibdgtoav	2g43j83a271g9	55s721c:0h	t	00:05:00	1969-12-31 18:03:26.947-07
lananaqcj6js8htau4	3pp2l96u2mibdgtoav	3t09dyzubc9zp	55s721c:0h	t	00:05:00	1969-12-31 18:03:26.947-07
lananaqcj6js8htau4	3pp2l96u2mibdgtoav	3unh7411ka0tz	55s721c:0h	t	00:05:00	1969-12-31 18:03:26.947-07
lananaqcj6js8htau4	3pp2l96u2mibdgtoav	817el2k23zdp	55s721c:0h	t	00:05:00	1969-12-31 18:03:26.947-07
lananaqcj6js8htau4	pa3pcanlq9gq25i7n0	2g43j83a271g9	55s721c:114	t	00:05:00	1969-12-31 18:06:42.113-07
lananaqcj6js8htau4	pa3pcanlq9gq25i7n0	3t09dyzubc9zp	55s721c:114	t	00:05:00	1969-12-31 18:06:42.113-07
lananaqcj6js8htau4	pa3pcanlq9gq25i7n0	3unh7411ka0tz	55s721c:114	t	00:05:00	1969-12-31 18:06:42.113-07
lananaqcj6js8htau4	pa3pcanlq9gq25i7n0	817el2k23zdp	55s721c:114	t	00:05:00	1969-12-31 18:06:42.113-07
lananaqcj6js8htau4	g0lg0naukjrnqeac8m	2g43j83a271g9	55s721c:115	t	00:05:00	1969-12-31 18:06:42.888-07
lananaqcj6js8htau4	g0lg0naukjrnqeac8m	3t09dyzubc9zp	55s721c:115	t	00:05:00	1969-12-31 18:06:42.888-07
lananaqcj6js8htau4	g0lg0naukjrnqeac8m	3unh7411ka0tz	55s721c:115	t	00:05:00	1969-12-31 18:06:42.888-07
lananaqcj6js8htau4	g0lg0naukjrnqeac8m	817el2k23zdp	55s721c:115	t	00:05:00	1969-12-31 18:06:42.888-07
lananaqcj6js8htau4	v1fms4i31l460q8icm	2g43j83a271g9	55s721c:116	t	00:05:00	1969-12-31 18:06:50.633-07
lananaqcj6js8htau4	v1fms4i31l460q8icm	3t09dyzubc9zp	55s721c:116	t	00:05:00	1969-12-31 18:06:50.633-07
lananaqcj6js8htau4	v1fms4i31l460q8icm	3unh7411ka0tz	55s721c:116	t	00:05:00	1969-12-31 18:06:50.633-07
lananaqcj6js8htau4	v1fms4i31l460q8icm	817el2k23zdp	55s721c:116	t	00:05:00	1969-12-31 18:06:50.633-07
lananaqcj6js8htau4	ol5mlii0ojfjq4kfbj	2g43j83a271g9	55s721c:117	t	00:05:00	1969-12-31 18:07:16.068-07
lananaqcj6js8htau4	ol5mlii0ojfjq4kfbj	3t09dyzubc9zp	55s721c:117	t	00:05:00	1969-12-31 18:07:16.068-07
lananaqcj6js8htau4	ol5mlii0ojfjq4kfbj	3unh7411ka0tz	55s721c:117	t	00:05:00	1969-12-31 18:07:16.068-07
lananaqcj6js8htau4	ol5mlii0ojfjq4kfbj	817el2k23zdp	55s721c:117	t	00:05:00	1969-12-31 18:07:16.068-07
lananaqcj6js8htau4	cfbvbs4te06i0v8rk3	2g43j83a271g9	55s721c:118	t	00:05:00	1969-12-31 18:07:26.323-07
lananaqcj6js8htau4	cfbvbs4te06i0v8rk3	3t09dyzubc9zp	55s721c:118	t	00:05:00	1969-12-31 18:07:26.323-07
lananaqcj6js8htau4	cfbvbs4te06i0v8rk3	3unh7411ka0tz	55s721c:118	t	00:05:00	1969-12-31 18:07:26.323-07
lananaqcj6js8htau4	cfbvbs4te06i0v8rk3	817el2k23zdp	55s721c:118	t	00:05:00	1969-12-31 18:07:26.323-07
lananaqcj6js8htau4	emhimmllcegmuqc08s	2g43j83a271g9	55s721c:119	t	00:05:00	1969-12-31 18:07:33.829-07
lananaqcj6js8htau4	emhimmllcegmuqc08s	3t09dyzubc9zp	55s721c:119	t	00:05:00	1969-12-31 18:07:33.829-07
lananaqcj6js8htau4	emhimmllcegmuqc08s	3unh7411ka0tz	55s721c:119	t	00:05:00	1969-12-31 18:07:33.829-07
lananaqcj6js8htau4	emhimmllcegmuqc08s	817el2k23zdp	55s721c:119	t	00:05:00	1969-12-31 18:07:33.829-07
lananaqcj6js8htau4	ciltum5iqhljilh9tj	2g43j83a271g9	55s721c:11a	t	00:05:00	1969-12-31 18:07:47.754-07
lananaqcj6js8htau4	ciltum5iqhljilh9tj	3t09dyzubc9zp	55s721c:11a	t	00:05:00	1969-12-31 18:07:47.754-07
lananaqcj6js8htau4	ciltum5iqhljilh9tj	3unh7411ka0tz	55s721c:11a	t	00:05:00	1969-12-31 18:07:47.754-07
lananaqcj6js8htau4	ciltum5iqhljilh9tj	817el2k23zdp	55s721c:11a	t	00:05:00	1969-12-31 18:07:47.754-07
lananaqcj6js8htau4	q8d9crr2u73k6u7ahu	2g43j83a271g9	55s721c:11c	t	00:05:00	1969-12-31 18:08:05.298-07
lananaqcj6js8htau4	q8d9crr2u73k6u7ahu	3t09dyzubc9zp	55s721c:11c	t	00:05:00	1969-12-31 18:08:05.298-07
lananaqcj6js8htau4	q8d9crr2u73k6u7ahu	3unh7411ka0tz	55s721c:11c	t	00:05:00	1969-12-31 18:08:05.298-07
lananaqcj6js8htau4	q8d9crr2u73k6u7ahu	817el2k23zdp	55s721c:11c	t	00:05:00	1969-12-31 18:08:05.298-07
uk74dsudpgd94faf3n	jb2laih6753f577ab8	3t09dyzubc9zp	562jj60:0p	t	00:05:00	1969-12-31 17:13:46.512-07
uk74dsudpgd94faf3n	jb2laih6753f577ab8	3unh7411ka0tz	562jj60:0p	t	00:05:00	1969-12-31 17:13:46.512-07
uk74dsudpgd94faf3n	jb2laih6753f577ab8	817el2k23zdp	562jj60:0p	t	00:05:00	1969-12-31 17:13:46.512-07
uk74dsudpgd94faf3n	jb2laih6753f577ab8	e2hz9kajle2s	562jj60:0p	t	00:05:00	1969-12-31 17:13:46.512-07
88nh1g3umqn4ia48q0	s4cii7b1scl3cloob5	817el2k23zdp	56bncow:0c	t	00:05:00	1969-12-31 17:17:20.123-07
uk74dsudpgd94faf3n	777u7789utes5gf9r7	2g43j83a271g9	563o7s8:12z	t	00:05:00	1969-12-31 17:29:27.52-07
uk74dsudpgd94faf3n	777u7789utes5gf9r7	caqm13mxzbdr	563o7s8:12z	t	00:05:00	1969-12-31 17:29:27.52-07
uk74dsudpgd94faf3n	777u7789utes5gf9r7	2blc6xwom46ss	563o7s8:12z	t	00:05:00	1969-12-31 17:29:27.52-07
uk74dsudpgd94faf3n	777u7789utes5gf9r7	3se2qu476j7tg	563o7s8:12z	t	00:05:00	1969-12-31 17:29:27.52-07
uk74dsudpgd94faf3n	bm72r758qbsaroaqnn	e2hz9kajle2s	562jj60:0q	t	00:05:00	1969-12-31 17:13:54.197-07
uk74dsudpgd94faf3n	876odebg445ca0j74p	2g43j83a271g9	562jj60:0r	t	00:05:00	1969-12-31 17:14:10.625-07
uk74dsudpgd94faf3n	876odebg445ca0j74p	3t09dyzubc9zp	562jj60:0r	t	00:05:00	1969-12-31 17:14:10.625-07
uk74dsudpgd94faf3n	876odebg445ca0j74p	3unh7411ka0tz	562jj60:0r	t	00:05:00	1969-12-31 17:14:10.625-07
uk74dsudpgd94faf3n	876odebg445ca0j74p	817el2k23zdp	562jj60:0r	t	00:05:00	1969-12-31 17:14:10.625-07
uk74dsudpgd94faf3n	876odebg445ca0j74p	e2hz9kajle2s	562jj60:0r	t	00:05:00	1969-12-31 17:14:10.625-07
uk74dsudpgd94faf3n	t0o7efqeqo1b2o07id	2g43j83a271g9	562jj60:0s	t	00:05:00	1969-12-31 17:14:11.104-07
uk74dsudpgd94faf3n	t0o7efqeqo1b2o07id	3t09dyzubc9zp	562jj60:0s	t	00:05:00	1969-12-31 17:14:11.104-07
uk74dsudpgd94faf3n	t0o7efqeqo1b2o07id	3unh7411ka0tz	562jj60:0s	t	00:05:00	1969-12-31 17:14:11.104-07
uk74dsudpgd94faf3n	t0o7efqeqo1b2o07id	817el2k23zdp	562jj60:0s	t	00:05:00	1969-12-31 17:14:11.104-07
uk74dsudpgd94faf3n	t0o7efqeqo1b2o07id	e2hz9kajle2s	562jj60:0s	t	00:05:00	1969-12-31 17:14:11.104-07
uk74dsudpgd94faf3n	2gk3c8lfiaouc1il6d	2g43j83a271g9	562jj60:0t	t	00:05:00	1969-12-31 17:14:29.687-07
uk74dsudpgd94faf3n	2gk3c8lfiaouc1il6d	3t09dyzubc9zp	562jj60:0t	t	00:05:00	1969-12-31 17:14:29.687-07
uk74dsudpgd94faf3n	2gk3c8lfiaouc1il6d	3unh7411ka0tz	562jj60:0t	t	00:05:00	1969-12-31 17:14:29.687-07
uk74dsudpgd94faf3n	2gk3c8lfiaouc1il6d	817el2k23zdp	562jj60:0t	t	00:05:00	1969-12-31 17:14:29.687-07
uk74dsudpgd94faf3n	2gk3c8lfiaouc1il6d	e2hz9kajle2s	562jj60:0t	t	00:05:00	1969-12-31 17:14:29.687-07
uk74dsudpgd94faf3n	dfo93bl628ke796jf2	2g43j83a271g9	562jj60:0u	t	00:05:00	1969-12-31 17:14:38.502-07
uk74dsudpgd94faf3n	dfo93bl628ke796jf2	3t09dyzubc9zp	562jj60:0u	t	00:05:00	1969-12-31 17:14:38.502-07
uk74dsudpgd94faf3n	dfo93bl628ke796jf2	3unh7411ka0tz	562jj60:0u	t	00:05:00	1969-12-31 17:14:38.502-07
uk74dsudpgd94faf3n	dfo93bl628ke796jf2	817el2k23zdp	562jj60:0u	t	00:05:00	1969-12-31 17:14:38.502-07
uk74dsudpgd94faf3n	dfo93bl628ke796jf2	e2hz9kajle2s	562jj60:0u	t	00:05:00	1969-12-31 17:14:38.502-07
uk74dsudpgd94faf3n	rft57mb8835mlai6ng	2g43j83a271g9	562jj60:0v	t	00:05:00	1969-12-31 17:14:48.239-07
uk74dsudpgd94faf3n	rft57mb8835mlai6ng	3t09dyzubc9zp	562jj60:0v	t	00:05:00	1969-12-31 17:14:48.239-07
uk74dsudpgd94faf3n	rft57mb8835mlai6ng	3unh7411ka0tz	562jj60:0v	t	00:05:00	1969-12-31 17:14:48.239-07
uk74dsudpgd94faf3n	rft57mb8835mlai6ng	817el2k23zdp	562jj60:0v	t	00:05:00	1969-12-31 17:14:48.239-07
uk74dsudpgd94faf3n	rft57mb8835mlai6ng	e2hz9kajle2s	562jj60:0v	t	00:05:00	1969-12-31 17:14:48.239-07
uk74dsudpgd94faf3n	9mkm7pthjueofli8g9	2g43j83a271g9	562jj60:0w	t	00:05:00	1969-12-31 17:14:48.274-07
uk74dsudpgd94faf3n	9mkm7pthjueofli8g9	3t09dyzubc9zp	562jj60:0w	t	00:05:00	1969-12-31 17:14:48.274-07
uk74dsudpgd94faf3n	9mkm7pthjueofli8g9	3unh7411ka0tz	562jj60:0w	t	00:05:00	1969-12-31 17:14:48.274-07
uk74dsudpgd94faf3n	9mkm7pthjueofli8g9	817el2k23zdp	562jj60:0w	t	00:05:00	1969-12-31 17:14:48.274-07
uk74dsudpgd94faf3n	9mkm7pthjueofli8g9	e2hz9kajle2s	562jj60:0w	t	00:05:00	1969-12-31 17:14:48.274-07
uk74dsudpgd94faf3n	un2iflegkmjd0fd5mo	2g43j83a271g9	562jj60:0x	t	00:05:00	1969-12-31 17:14:54.596-07
uk74dsudpgd94faf3n	un2iflegkmjd0fd5mo	3t09dyzubc9zp	562jj60:0x	t	00:05:00	1969-12-31 17:14:54.596-07
uk74dsudpgd94faf3n	un2iflegkmjd0fd5mo	3unh7411ka0tz	562jj60:0x	t	00:05:00	1969-12-31 17:14:54.596-07
uk74dsudpgd94faf3n	un2iflegkmjd0fd5mo	817el2k23zdp	562jj60:0x	t	00:05:00	1969-12-31 17:14:54.596-07
uk74dsudpgd94faf3n	un2iflegkmjd0fd5mo	e2hz9kajle2s	562jj60:0x	t	00:05:00	1969-12-31 17:14:54.596-07
uk74dsudpgd94faf3n	ndd43miif2ks3n58kh	2g43j83a271g9	562jj60:0y	t	00:05:00	1969-12-31 17:14:55.262-07
uk74dsudpgd94faf3n	ndd43miif2ks3n58kh	3t09dyzubc9zp	562jj60:0y	t	00:05:00	1969-12-31 17:14:55.262-07
uk74dsudpgd94faf3n	ndd43miif2ks3n58kh	3unh7411ka0tz	562jj60:0y	t	00:05:00	1969-12-31 17:14:55.262-07
uk74dsudpgd94faf3n	ndd43miif2ks3n58kh	817el2k23zdp	562jj60:0y	t	00:05:00	1969-12-31 17:14:55.262-07
uk74dsudpgd94faf3n	ndd43miif2ks3n58kh	e2hz9kajle2s	562jj60:0y	t	00:05:00	1969-12-31 17:14:55.262-07
uk74dsudpgd94faf3n	07mi4v6hcvb0t30nqq	2g43j83a271g9	562jj60:0z	t	00:05:00	1969-12-31 17:15:38.185-07
uk74dsudpgd94faf3n	07mi4v6hcvb0t30nqq	3t09dyzubc9zp	562jj60:0z	t	00:05:00	1969-12-31 17:15:38.185-07
uk74dsudpgd94faf3n	07mi4v6hcvb0t30nqq	3unh7411ka0tz	562jj60:0z	t	00:05:00	1969-12-31 17:15:38.185-07
uk74dsudpgd94faf3n	07mi4v6hcvb0t30nqq	817el2k23zdp	562jj60:0z	t	00:05:00	1969-12-31 17:15:38.185-07
uk74dsudpgd94faf3n	07mi4v6hcvb0t30nqq	e2hz9kajle2s	562jj60:0z	t	00:05:00	1969-12-31 17:15:38.185-07
uk74dsudpgd94faf3n	rllr7e03rin7182c1r	2g43j83a271g9	562jj60:110	t	00:05:00	1969-12-31 17:16:10.882-07
uk74dsudpgd94faf3n	rllr7e03rin7182c1r	3t09dyzubc9zp	562jj60:110	t	00:05:00	1969-12-31 17:16:10.882-07
uk74dsudpgd94faf3n	rllr7e03rin7182c1r	3unh7411ka0tz	562jj60:110	t	00:05:00	1969-12-31 17:16:10.882-07
uk74dsudpgd94faf3n	rllr7e03rin7182c1r	817el2k23zdp	562jj60:110	t	00:05:00	1969-12-31 17:16:10.882-07
uk74dsudpgd94faf3n	rllr7e03rin7182c1r	e2hz9kajle2s	562jj60:110	t	00:05:00	1969-12-31 17:16:10.882-07
uk74dsudpgd94faf3n	g0cd48hj7nm7gu0s55	2g43j83a271g9	562jj60:111	t	00:05:00	1969-12-31 17:16:11.573-07
uk74dsudpgd94faf3n	g0cd48hj7nm7gu0s55	3t09dyzubc9zp	562jj60:111	t	00:05:00	1969-12-31 17:16:11.573-07
uk74dsudpgd94faf3n	g0cd48hj7nm7gu0s55	3unh7411ka0tz	562jj60:111	t	00:05:00	1969-12-31 17:16:11.573-07
uk74dsudpgd94faf3n	g0cd48hj7nm7gu0s55	817el2k23zdp	562jj60:111	t	00:05:00	1969-12-31 17:16:11.573-07
uk74dsudpgd94faf3n	nburv2r6cgfb07a1p5	2g43j83a271g9	562jj60:113	t	00:05:00	1969-12-31 17:16:21.619-07
uk74dsudpgd94faf3n	nburv2r6cgfb07a1p5	3t09dyzubc9zp	562jj60:113	t	00:05:00	1969-12-31 17:16:21.619-07
uk74dsudpgd94faf3n	nburv2r6cgfb07a1p5	3unh7411ka0tz	562jj60:113	t	00:05:00	1969-12-31 17:16:21.619-07
uk74dsudpgd94faf3n	g0cd48hj7nm7gu0s55	e2hz9kajle2s	562jj60:111	t	00:05:00	1969-12-31 17:16:11.573-07
uk74dsudpgd94faf3n	r72rp0l6bsslj04dn7	e2hz9kajle2s	562jj60:112	t	00:05:00	1969-12-31 17:16:20.916-07
uk74dsudpgd94faf3n	6iuasrjblnpoficjdc	2blc6xwom46ss	563o7s8:130	t	00:05:00	1969-12-31 17:29:28.27-07
uk74dsudpgd94faf3n	6iuasrjblnpoficjdc	2g43j83a271g9	563o7s8:130	t	00:05:00	1969-12-31 17:29:28.27-07
uk74dsudpgd94faf3n	6iuasrjblnpoficjdc	3se2qu476j7tg	563o7s8:130	t	00:05:00	1969-12-31 17:29:28.27-07
uk74dsudpgd94faf3n	6iuasrjblnpoficjdc	caqm13mxzbdr	563o7s8:130	t	00:05:00	1969-12-31 17:29:28.27-07
uk74dsudpgd94faf3n	nburv2r6cgfb07a1p5	817el2k23zdp	562jj60:113	t	00:05:00	1969-12-31 17:16:21.619-07
uk74dsudpgd94faf3n	nburv2r6cgfb07a1p5	e2hz9kajle2s	562jj60:113	t	00:05:00	1969-12-31 17:16:21.619-07
uk74dsudpgd94faf3n	8bqu5h3gn9du9tsle5	e2hz9kajle2s	562jj60:114	t	00:05:00	1969-12-31 17:16:22.696-07
uk74dsudpgd94faf3n	0kdlo4qaq9ht7lnp1k	2blc6xwom46ss	563o7s8:131	t	00:05:00	1969-12-31 17:29:36.247-07
uk74dsudpgd94faf3n	0kdlo4qaq9ht7lnp1k	3se2qu476j7tg	563o7s8:131	t	00:05:00	1969-12-31 17:29:36.247-07
uk74dsudpgd94faf3n	8bqu5h3gn9du9tsle5	2g43j83a271g9	562jj60:115	t	00:05:00	1969-12-31 17:16:52.241-07
uk74dsudpgd94faf3n	8bqu5h3gn9du9tsle5	3t09dyzubc9zp	562jj60:115	t	00:05:00	1969-12-31 17:16:52.241-07
uk74dsudpgd94faf3n	8bqu5h3gn9du9tsle5	3unh7411ka0tz	562jj60:115	t	00:05:00	1969-12-31 17:16:52.241-07
uk74dsudpgd94faf3n	8bqu5h3gn9du9tsle5	817el2k23zdp	562jj60:115	t	00:05:00	1969-12-31 17:16:52.241-07
uk74dsudpgd94faf3n	8266feihuqlfio79u2	2g43j83a271g9	563o7s8:132	t	00:05:00	1969-12-31 17:29:42.515-07
uk74dsudpgd94faf3n	8266feihuqlfio79u2	2blc6xwom46ss	563o7s8:132	t	00:05:00	1969-12-31 17:29:42.515-07
uk74dsudpgd94faf3n	8266feihuqlfio79u2	3se2qu476j7tg	563o7s8:132	t	00:05:00	1969-12-31 17:29:42.515-07
uk74dsudpgd94faf3n	rskpggt8589625kb2a	2g43j83a271g9	562jj60:117	t	00:05:00	1969-12-31 17:17:12.634-07
uk74dsudpgd94faf3n	rskpggt8589625kb2a	3t09dyzubc9zp	562jj60:117	t	00:05:00	1969-12-31 17:17:12.634-07
uk74dsudpgd94faf3n	rskpggt8589625kb2a	3unh7411ka0tz	562jj60:117	t	00:05:00	1969-12-31 17:17:12.634-07
uk74dsudpgd94faf3n	rskpggt8589625kb2a	817el2k23zdp	562jj60:117	t	00:05:00	1969-12-31 17:17:12.634-07
uk74dsudpgd94faf3n	rskpggt8589625kb2a	1tgahbk62pc9s	562jj60:117	t	00:05:00	1969-12-31 17:17:12.634-07
uk74dsudpgd94faf3n	7968151mmfcuefsuoo	1tgahbk62pc9s	562jj60:118	t	00:05:00	1969-12-31 17:17:12.883-07
uk74dsudpgd94faf3n	7968151mmfcuefsuoo	2g43j83a271g9	562jj60:118	t	00:05:00	1969-12-31 17:17:12.883-07
uk74dsudpgd94faf3n	7968151mmfcuefsuoo	3t09dyzubc9zp	562jj60:118	t	00:05:00	1969-12-31 17:17:12.883-07
uk74dsudpgd94faf3n	7968151mmfcuefsuoo	3unh7411ka0tz	562jj60:118	t	00:05:00	1969-12-31 17:17:12.883-07
uk74dsudpgd94faf3n	7968151mmfcuefsuoo	817el2k23zdp	562jj60:118	t	00:05:00	1969-12-31 17:17:12.883-07
uk74dsudpgd94faf3n	e3l4s3184rvc9cj40n	2g43j83a271g9	563o7s8:133	t	00:05:00	1969-12-31 17:29:49.78-07
uk74dsudpgd94faf3n	e3l4s3184rvc9cj40n	caqm13mxzbdr	563o7s8:133	t	00:05:00	1969-12-31 17:29:49.78-07
uk74dsudpgd94faf3n	e3l4s3184rvc9cj40n	2blc6xwom46ss	563o7s8:133	t	00:05:00	1969-12-31 17:29:49.78-07
uk74dsudpgd94faf3n	bq5k58pgb4t5ntf7es	e2hz9kajle2s	563hnrs:01	t	00:05:00	1969-12-31 17:17:37.492-07
uk74dsudpgd94faf3n	e3l4s3184rvc9cj40n	3se2qu476j7tg	563o7s8:133	t	00:05:00	1969-12-31 17:29:49.78-07
uk74dsudpgd94faf3n	bq5k58pgb4t5ntf7es	3t09dyzubc9zp	563izmo:01	t	00:05:00	1969-12-31 17:18:04.131-07
uk74dsudpgd94faf3n	bq5k58pgb4t5ntf7es	3unh7411ka0tz	563izmo:01	t	00:05:00	1969-12-31 17:18:04.131-07
uk74dsudpgd94faf3n	bq5k58pgb4t5ntf7es	817el2k23zdp	563izmo:01	t	00:05:00	1969-12-31 17:18:04.131-07
uk74dsudpgd94faf3n	bq5k58pgb4t5ntf7es	1tgahbk62pc9s	563izmo:01	t	00:05:00	1969-12-31 17:18:04.131-07
uk74dsudpgd94faf3n	vch61sj1ncoa2g9oe6	2blc6xwom46ss	563o7s8:134	t	00:05:00	1969-12-31 17:29:50.495-07
uk74dsudpgd94faf3n	vch61sj1ncoa2g9oe6	2g43j83a271g9	563o7s8:134	t	00:05:00	1969-12-31 17:29:50.495-07
uk74dsudpgd94faf3n	vch61sj1ncoa2g9oe6	3se2qu476j7tg	563o7s8:134	t	00:05:00	1969-12-31 17:29:50.495-07
uk74dsudpgd94faf3n	vch61sj1ncoa2g9oe6	caqm13mxzbdr	563o7s8:134	t	00:05:00	1969-12-31 17:29:50.495-07
uk74dsudpgd94faf3n	ge2d9qcevecbae6rto	2g43j83a271g9	563o7s8:01	t	00:05:00	1969-12-31 17:19:36.273-07
uk74dsudpgd94faf3n	ge2d9qcevecbae6rto	3t09dyzubc9zp	563o7s8:01	t	00:05:00	1969-12-31 17:19:36.273-07
uk74dsudpgd94faf3n	ge2d9qcevecbae6rto	3unh7411ka0tz	563o7s8:01	t	00:05:00	1969-12-31 17:19:36.273-07
uk74dsudpgd94faf3n	ge2d9qcevecbae6rto	817el2k23zdp	563o7s8:01	t	00:05:00	1969-12-31 17:19:36.273-07
uk74dsudpgd94faf3n	ge2d9qcevecbae6rto	1tgahbk62pc9s	563o7s8:01	t	00:05:00	1969-12-31 17:19:36.273-07
uk74dsudpgd94faf3n	kp8st72kh35l7gsin9	2g43j83a271g9	566ttgw:0l	t	00:05:00	1969-12-31 17:33:31.828-07
uk74dsudpgd94faf3n	kp8st72kh35l7gsin9	3t09dyzubc9zp	566ttgw:0l	t	00:05:00	1969-12-31 17:33:31.828-07
uk74dsudpgd94faf3n	kp8st72kh35l7gsin9	3unh7411ka0tz	566ttgw:0l	t	00:05:00	1969-12-31 17:33:31.828-07
uk74dsudpgd94faf3n	kp8st72kh35l7gsin9	817el2k23zdp	566ttgw:0l	t	00:05:00	1969-12-31 17:33:31.828-07
uk74dsudpgd94faf3n	6qod4b6hc6pv9no94g	2g43j83a271g9	566ttgw:0m	t	00:05:00	1969-12-31 17:33:45.539-07
uk74dsudpgd94faf3n	6qod4b6hc6pv9no94g	3t09dyzubc9zp	566ttgw:0m	t	00:05:00	1969-12-31 17:33:45.539-07
uk74dsudpgd94faf3n	6qod4b6hc6pv9no94g	3unh7411ka0tz	566ttgw:0m	t	00:05:00	1969-12-31 17:33:45.539-07
uk74dsudpgd94faf3n	6qod4b6hc6pv9no94g	817el2k23zdp	566ttgw:0m	t	00:05:00	1969-12-31 17:33:45.539-07
uk74dsudpgd94faf3n	08tata1inf2nkq8j59	2g43j83a271g9	566ttgw:0n	t	00:05:00	1969-12-31 17:33:52.512-07
uk74dsudpgd94faf3n	08tata1inf2nkq8j59	3t09dyzubc9zp	566ttgw:0n	t	00:05:00	1969-12-31 17:33:52.512-07
uk74dsudpgd94faf3n	08tata1inf2nkq8j59	3unh7411ka0tz	566ttgw:0n	t	00:05:00	1969-12-31 17:33:52.512-07
uk74dsudpgd94faf3n	08tata1inf2nkq8j59	817el2k23zdp	566ttgw:0n	t	00:05:00	1969-12-31 17:33:52.512-07
uk74dsudpgd94faf3n	3ve6gjihbgd1fsrd5l	2g43j83a271g9	566ttgw:0o	t	00:05:00	1969-12-31 17:34:00.02-07
uk74dsudpgd94faf3n	3ve6gjihbgd1fsrd5l	3t09dyzubc9zp	566ttgw:0o	t	00:05:00	1969-12-31 17:34:00.02-07
uk74dsudpgd94faf3n	r9lsqha7ipqtqhesfe	2g43j83a271g9	566ttgw:0p	t	00:05:00	1969-12-31 17:34:06.675-07
uk74dsudpgd94faf3n	r9lsqha7ipqtqhesfe	3t09dyzubc9zp	566ttgw:0p	t	00:05:00	1969-12-31 17:34:06.675-07
uk74dsudpgd94faf3n	r9lsqha7ipqtqhesfe	3unh7411ka0tz	566ttgw:0p	t	00:05:00	1969-12-31 17:34:06.675-07
uk74dsudpgd94faf3n	r9lsqha7ipqtqhesfe	817el2k23zdp	566ttgw:0p	t	00:05:00	1969-12-31 17:34:06.675-07
uk74dsudpgd94faf3n	r72rp0l6bsslj04dn7	2g43j83a271g9	562jj60:112	t	00:05:00	1969-12-31 17:16:20.916-07
uk74dsudpgd94faf3n	r72rp0l6bsslj04dn7	3t09dyzubc9zp	562jj60:112	t	00:05:00	1969-12-31 17:16:20.916-07
uk74dsudpgd94faf3n	r72rp0l6bsslj04dn7	3unh7411ka0tz	562jj60:112	t	00:05:00	1969-12-31 17:16:20.916-07
uk74dsudpgd94faf3n	r72rp0l6bsslj04dn7	817el2k23zdp	562jj60:112	t	00:05:00	1969-12-31 17:16:20.916-07
uk74dsudpgd94faf3n	0kdlo4qaq9ht7lnp1k	2g43j83a271g9	563o7s8:131	t	00:05:00	1969-12-31 17:29:36.247-07
uk74dsudpgd94faf3n	0kdlo4qaq9ht7lnp1k	caqm13mxzbdr	563o7s8:131	t	00:05:00	1969-12-31 17:29:36.247-07
uk74dsudpgd94faf3n	8266feihuqlfio79u2	caqm13mxzbdr	563o7s8:132	t	00:05:00	1969-12-31 17:29:42.515-07
uk74dsudpgd94faf3n	bq5k58pgb4t5ntf7es	2g43j83a271g9	563izmo:01	t	00:05:00	1969-12-31 17:18:04.131-07
uk74dsudpgd94faf3n	pli24c6h5j97o2f2h7	2g43j83a271g9	563ly2g:01	t	00:05:00	1969-12-31 17:18:50.334-07
uk74dsudpgd94faf3n	pli24c6h5j97o2f2h7	3t09dyzubc9zp	563ly2g:01	t	00:05:00	1969-12-31 17:18:50.334-07
uk74dsudpgd94faf3n	pli24c6h5j97o2f2h7	3unh7411ka0tz	563ly2g:01	t	00:05:00	1969-12-31 17:18:50.334-07
uk74dsudpgd94faf3n	pli24c6h5j97o2f2h7	817el2k23zdp	563ly2g:01	t	00:05:00	1969-12-31 17:18:50.334-07
uk74dsudpgd94faf3n	pli24c6h5j97o2f2h7	1tgahbk62pc9s	563ly2g:01	t	00:05:00	1969-12-31 17:18:50.334-07
uk74dsudpgd94faf3n	r8u906gcc0df9gsnuf	1tgahbk62pc9s	563o7s8:02	t	00:05:00	1969-12-31 17:19:40.915-07
uk74dsudpgd94faf3n	r8u906gcc0df9gsnuf	2g43j83a271g9	563o7s8:02	t	00:05:00	1969-12-31 17:19:40.915-07
uk74dsudpgd94faf3n	r8u906gcc0df9gsnuf	3t09dyzubc9zp	563o7s8:02	t	00:05:00	1969-12-31 17:19:40.915-07
uk74dsudpgd94faf3n	r8u906gcc0df9gsnuf	3unh7411ka0tz	563o7s8:02	t	00:05:00	1969-12-31 17:19:40.915-07
uk74dsudpgd94faf3n	r8u906gcc0df9gsnuf	817el2k23zdp	563o7s8:02	t	00:05:00	1969-12-31 17:19:40.915-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	1tgahbk62pc9s	563o7s8:03	t	00:05:00	1969-12-31 17:19:42.395-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	3t09dyzubc9zp	563o7s8:06	t	00:05:00	1969-12-31 17:19:43.745-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	3unh7411ka0tz	563o7s8:06	t	00:05:00	1969-12-31 17:19:43.745-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	2g43j83a271g9	563o7s8:07	t	00:05:00	1969-12-31 17:19:51.448-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	817el2k23zdp	563o7s8:07	t	00:05:00	1969-12-31 17:19:51.448-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	gt8yfqbqc7ca	563o7s8:07	t	00:05:00	1969-12-31 17:19:51.448-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	2blc6xwom46ss	563o7s8:07	t	00:05:00	1969-12-31 17:19:51.448-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	3rnpsi5qegpt3	563o7s8:07	t	00:05:00	1969-12-31 17:19:51.448-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	3se2qu476j7tg	563o7s8:07	t	00:05:00	1969-12-31 17:19:51.448-07
uk74dsudpgd94faf3n	l287dods77i8gtdssq	caqm13mxzbdr	563o7s8:07	t	00:05:00	1969-12-31 17:19:51.448-07
uk74dsudpgd94faf3n	sqj8lpbf08l0bbt5bp	2g43j83a271g9	563o7s8:08	t	00:05:00	1969-12-31 17:19:58.324-07
uk74dsudpgd94faf3n	sqj8lpbf08l0bbt5bp	gt8yfqbqc7ca	563o7s8:08	t	00:05:00	1969-12-31 17:19:58.324-07
uk74dsudpgd94faf3n	sqj8lpbf08l0bbt5bp	2blc6xwom46ss	563o7s8:08	t	00:05:00	1969-12-31 17:19:58.324-07
uk74dsudpgd94faf3n	sqj8lpbf08l0bbt5bp	3rnpsi5qegpt3	563o7s8:08	t	00:05:00	1969-12-31 17:19:58.324-07
uk74dsudpgd94faf3n	sqj8lpbf08l0bbt5bp	3se2qu476j7tg	563o7s8:08	t	00:05:00	1969-12-31 17:19:58.324-07
uk74dsudpgd94faf3n	sqj8lpbf08l0bbt5bp	caqm13mxzbdr	563o7s8:08	t	00:05:00	1969-12-31 17:19:58.324-07
uk74dsudpgd94faf3n	sqj8lpbf08l0bbt5bp	817el2k23zdp	563o7s8:08	t	00:05:00	1969-12-31 17:19:58.324-07
uk74dsudpgd94faf3n	jc8d8taljhcskpc40l	2g43j83a271g9	563o7s8:09	t	00:05:00	1969-12-31 17:20:05.069-07
uk74dsudpgd94faf3n	jc8d8taljhcskpc40l	gt8yfqbqc7ca	563o7s8:09	t	00:05:00	1969-12-31 17:20:05.069-07
uk74dsudpgd94faf3n	jc8d8taljhcskpc40l	2blc6xwom46ss	563o7s8:09	t	00:05:00	1969-12-31 17:20:05.069-07
uk74dsudpgd94faf3n	jc8d8taljhcskpc40l	3rnpsi5qegpt3	563o7s8:09	t	00:05:00	1969-12-31 17:20:05.069-07
uk74dsudpgd94faf3n	jc8d8taljhcskpc40l	3se2qu476j7tg	563o7s8:09	t	00:05:00	1969-12-31 17:20:05.069-07
uk74dsudpgd94faf3n	jc8d8taljhcskpc40l	caqm13mxzbdr	563o7s8:09	t	00:05:00	1969-12-31 17:20:05.069-07
uk74dsudpgd94faf3n	jc8d8taljhcskpc40l	817el2k23zdp	563o7s8:09	t	00:05:00	1969-12-31 17:20:05.069-07
uk74dsudpgd94faf3n	rcdagha5q75sgt6au7	2blc6xwom46ss	563o7s8:0a	t	00:05:00	1969-12-31 17:20:07.586-07
uk74dsudpgd94faf3n	rcdagha5q75sgt6au7	2g43j83a271g9	563o7s8:0a	t	00:05:00	1969-12-31 17:20:07.586-07
uk74dsudpgd94faf3n	rcdagha5q75sgt6au7	3rnpsi5qegpt3	563o7s8:0a	t	00:05:00	1969-12-31 17:20:07.586-07
uk74dsudpgd94faf3n	rcdagha5q75sgt6au7	3se2qu476j7tg	563o7s8:0a	t	00:05:00	1969-12-31 17:20:07.586-07
uk74dsudpgd94faf3n	rcdagha5q75sgt6au7	817el2k23zdp	563o7s8:0a	t	00:05:00	1969-12-31 17:20:07.586-07
uk74dsudpgd94faf3n	rcdagha5q75sgt6au7	caqm13mxzbdr	563o7s8:0a	t	00:05:00	1969-12-31 17:20:07.586-07
uk74dsudpgd94faf3n	rcdagha5q75sgt6au7	gt8yfqbqc7ca	563o7s8:0a	t	00:05:00	1969-12-31 17:20:07.586-07
uk74dsudpgd94faf3n	5qq8aldov8ih1lce59	2g43j83a271g9	563o7s8:0b	t	00:05:00	1969-12-31 17:20:15.129-07
uk74dsudpgd94faf3n	5qq8aldov8ih1lce59	gt8yfqbqc7ca	563o7s8:0b	t	00:05:00	1969-12-31 17:20:15.129-07
uk74dsudpgd94faf3n	5qq8aldov8ih1lce59	2blc6xwom46ss	563o7s8:0b	t	00:05:00	1969-12-31 17:20:15.129-07
uk74dsudpgd94faf3n	5qq8aldov8ih1lce59	3rnpsi5qegpt3	563o7s8:0b	t	00:05:00	1969-12-31 17:20:15.129-07
uk74dsudpgd94faf3n	5qq8aldov8ih1lce59	3se2qu476j7tg	563o7s8:0b	t	00:05:00	1969-12-31 17:20:15.129-07
uk74dsudpgd94faf3n	5qq8aldov8ih1lce59	caqm13mxzbdr	563o7s8:0b	t	00:05:00	1969-12-31 17:20:15.129-07
uk74dsudpgd94faf3n	5qq8aldov8ih1lce59	817el2k23zdp	563o7s8:0b	t	00:05:00	1969-12-31 17:20:15.129-07
uk74dsudpgd94faf3n	a3a5pch2md88466njb	2blc6xwom46ss	563o7s8:0c	t	00:05:00	1969-12-31 17:20:15.757-07
uk74dsudpgd94faf3n	a3a5pch2md88466njb	2g43j83a271g9	563o7s8:0c	t	00:05:00	1969-12-31 17:20:15.757-07
uk74dsudpgd94faf3n	a3a5pch2md88466njb	3rnpsi5qegpt3	563o7s8:0c	t	00:05:00	1969-12-31 17:20:15.757-07
uk74dsudpgd94faf3n	a3a5pch2md88466njb	3se2qu476j7tg	563o7s8:0c	t	00:05:00	1969-12-31 17:20:15.757-07
uk74dsudpgd94faf3n	a3a5pch2md88466njb	817el2k23zdp	563o7s8:0c	t	00:05:00	1969-12-31 17:20:15.757-07
uk74dsudpgd94faf3n	a3a5pch2md88466njb	caqm13mxzbdr	563o7s8:0c	t	00:05:00	1969-12-31 17:20:15.757-07
uk74dsudpgd94faf3n	a3a5pch2md88466njb	gt8yfqbqc7ca	563o7s8:0c	t	00:05:00	1969-12-31 17:20:15.757-07
uk74dsudpgd94faf3n	l4i5v40o0u7moquh7m	2g43j83a271g9	563o7s8:0d	t	00:05:00	1969-12-31 17:20:24.797-07
uk74dsudpgd94faf3n	l4i5v40o0u7moquh7m	gt8yfqbqc7ca	563o7s8:0d	t	00:05:00	1969-12-31 17:20:24.797-07
88nh1g3umqn4ia48q0	rlkbna2hflb0g6vogk	2g43j83a271g9	56bncow:0j	t	00:05:00	1969-12-31 17:18:00.652-07
88nh1g3umqn4ia48q0	rlkbna2hflb0g6vogk	3t09dyzubc9zp	56bncow:0j	t	00:05:00	1969-12-31 17:18:00.652-07
88nh1g3umqn4ia48q0	rlkbna2hflb0g6vogk	3unh7411ka0tz	56bncow:0j	t	00:05:00	1969-12-31 17:18:00.652-07
uk74dsudpgd94faf3n	87kn15q01lcs7un73v	2blc6xwom46ss	563o7s8:135	t	00:05:00	1969-12-31 17:29:53.7-07
uk74dsudpgd94faf3n	jbmmh5mr6qh147n4tq	2g43j83a271g9	563o7s8:136	t	00:05:00	1969-12-31 17:30:00.184-07
uk74dsudpgd94faf3n	l4i5v40o0u7moquh7m	2blc6xwom46ss	563o7s8:0d	t	00:05:00	1969-12-31 17:20:24.797-07
uk74dsudpgd94faf3n	l4i5v40o0u7moquh7m	3rnpsi5qegpt3	563o7s8:0d	t	00:05:00	1969-12-31 17:20:24.797-07
uk74dsudpgd94faf3n	l4i5v40o0u7moquh7m	3se2qu476j7tg	563o7s8:0d	t	00:05:00	1969-12-31 17:20:24.797-07
uk74dsudpgd94faf3n	l4i5v40o0u7moquh7m	caqm13mxzbdr	563o7s8:0d	t	00:05:00	1969-12-31 17:20:24.797-07
uk74dsudpgd94faf3n	l4i5v40o0u7moquh7m	817el2k23zdp	563o7s8:0d	t	00:05:00	1969-12-31 17:20:24.797-07
uk74dsudpgd94faf3n	lsfoh16pmk9kigladp	2blc6xwom46ss	563o7s8:0e	t	00:05:00	1969-12-31 17:20:25.467-07
uk74dsudpgd94faf3n	lsfoh16pmk9kigladp	2g43j83a271g9	563o7s8:0e	t	00:05:00	1969-12-31 17:20:25.467-07
uk74dsudpgd94faf3n	lsfoh16pmk9kigladp	3rnpsi5qegpt3	563o7s8:0e	t	00:05:00	1969-12-31 17:20:25.467-07
uk74dsudpgd94faf3n	lsfoh16pmk9kigladp	3se2qu476j7tg	563o7s8:0e	t	00:05:00	1969-12-31 17:20:25.467-07
uk74dsudpgd94faf3n	lsfoh16pmk9kigladp	817el2k23zdp	563o7s8:0e	t	00:05:00	1969-12-31 17:20:25.467-07
uk74dsudpgd94faf3n	lsfoh16pmk9kigladp	caqm13mxzbdr	563o7s8:0e	t	00:05:00	1969-12-31 17:20:25.467-07
uk74dsudpgd94faf3n	lsfoh16pmk9kigladp	gt8yfqbqc7ca	563o7s8:0e	t	00:05:00	1969-12-31 17:20:25.467-07
uk74dsudpgd94faf3n	d49no0932fct5pdijd	2g43j83a271g9	563o7s8:0f	t	00:05:00	1969-12-31 17:20:33.278-07
uk74dsudpgd94faf3n	d49no0932fct5pdijd	gt8yfqbqc7ca	563o7s8:0f	t	00:05:00	1969-12-31 17:20:33.278-07
uk74dsudpgd94faf3n	d49no0932fct5pdijd	2blc6xwom46ss	563o7s8:0f	t	00:05:00	1969-12-31 17:20:33.278-07
uk74dsudpgd94faf3n	d49no0932fct5pdijd	3rnpsi5qegpt3	563o7s8:0f	t	00:05:00	1969-12-31 17:20:33.278-07
uk74dsudpgd94faf3n	d49no0932fct5pdijd	3se2qu476j7tg	563o7s8:0f	t	00:05:00	1969-12-31 17:20:33.278-07
uk74dsudpgd94faf3n	d49no0932fct5pdijd	caqm13mxzbdr	563o7s8:0f	t	00:05:00	1969-12-31 17:20:33.278-07
uk74dsudpgd94faf3n	d49no0932fct5pdijd	817el2k23zdp	563o7s8:0f	t	00:05:00	1969-12-31 17:20:33.278-07
uk74dsudpgd94faf3n	7h4hf7i8u8mb58l455	2g43j83a271g9	563o7s8:0g	t	00:05:00	1969-12-31 17:20:39.91-07
uk74dsudpgd94faf3n	7h4hf7i8u8mb58l455	gt8yfqbqc7ca	563o7s8:0g	t	00:05:00	1969-12-31 17:20:39.91-07
uk74dsudpgd94faf3n	7h4hf7i8u8mb58l455	2blc6xwom46ss	563o7s8:0g	t	00:05:00	1969-12-31 17:20:39.91-07
uk74dsudpgd94faf3n	7h4hf7i8u8mb58l455	3rnpsi5qegpt3	563o7s8:0g	t	00:05:00	1969-12-31 17:20:39.91-07
uk74dsudpgd94faf3n	7h4hf7i8u8mb58l455	3se2qu476j7tg	563o7s8:0g	t	00:05:00	1969-12-31 17:20:39.91-07
uk74dsudpgd94faf3n	7h4hf7i8u8mb58l455	caqm13mxzbdr	563o7s8:0g	t	00:05:00	1969-12-31 17:20:39.91-07
uk74dsudpgd94faf3n	7h4hf7i8u8mb58l455	817el2k23zdp	563o7s8:0g	t	00:05:00	1969-12-31 17:20:39.91-07
uk74dsudpgd94faf3n	f9ggfa4io42g3s9ht8	2blc6xwom46ss	563o7s8:0h	t	00:05:00	1969-12-31 17:20:40.057-07
uk74dsudpgd94faf3n	f9ggfa4io42g3s9ht8	2g43j83a271g9	563o7s8:0h	t	00:05:00	1969-12-31 17:20:40.057-07
uk74dsudpgd94faf3n	f9ggfa4io42g3s9ht8	3rnpsi5qegpt3	563o7s8:0h	t	00:05:00	1969-12-31 17:20:40.057-07
uk74dsudpgd94faf3n	f9ggfa4io42g3s9ht8	3se2qu476j7tg	563o7s8:0h	t	00:05:00	1969-12-31 17:20:40.057-07
uk74dsudpgd94faf3n	f9ggfa4io42g3s9ht8	817el2k23zdp	563o7s8:0h	t	00:05:00	1969-12-31 17:20:40.057-07
uk74dsudpgd94faf3n	f9ggfa4io42g3s9ht8	caqm13mxzbdr	563o7s8:0h	t	00:05:00	1969-12-31 17:20:40.057-07
uk74dsudpgd94faf3n	f9ggfa4io42g3s9ht8	gt8yfqbqc7ca	563o7s8:0h	t	00:05:00	1969-12-31 17:20:40.057-07
uk74dsudpgd94faf3n	7f7ruhr5f5vontsort	2g43j83a271g9	563o7s8:0i	t	00:05:00	1969-12-31 17:20:48.045-07
uk74dsudpgd94faf3n	7f7ruhr5f5vontsort	gt8yfqbqc7ca	563o7s8:0i	t	00:05:00	1969-12-31 17:20:48.045-07
uk74dsudpgd94faf3n	7f7ruhr5f5vontsort	2blc6xwom46ss	563o7s8:0i	t	00:05:00	1969-12-31 17:20:48.045-07
uk74dsudpgd94faf3n	7f7ruhr5f5vontsort	3rnpsi5qegpt3	563o7s8:0i	t	00:05:00	1969-12-31 17:20:48.045-07
uk74dsudpgd94faf3n	7f7ruhr5f5vontsort	3se2qu476j7tg	563o7s8:0i	t	00:05:00	1969-12-31 17:20:48.045-07
uk74dsudpgd94faf3n	7f7ruhr5f5vontsort	caqm13mxzbdr	563o7s8:0i	t	00:05:00	1969-12-31 17:20:48.045-07
uk74dsudpgd94faf3n	7f7ruhr5f5vontsort	817el2k23zdp	563o7s8:0i	t	00:05:00	1969-12-31 17:20:48.045-07
uk74dsudpgd94faf3n	k93qh369erlt4u954o	2blc6xwom46ss	563o7s8:0j	t	00:05:00	1969-12-31 17:20:48.73-07
uk74dsudpgd94faf3n	k93qh369erlt4u954o	2g43j83a271g9	563o7s8:0j	t	00:05:00	1969-12-31 17:20:48.73-07
uk74dsudpgd94faf3n	k93qh369erlt4u954o	3rnpsi5qegpt3	563o7s8:0j	t	00:05:00	1969-12-31 17:20:48.73-07
uk74dsudpgd94faf3n	k93qh369erlt4u954o	3se2qu476j7tg	563o7s8:0j	t	00:05:00	1969-12-31 17:20:48.73-07
uk74dsudpgd94faf3n	k93qh369erlt4u954o	817el2k23zdp	563o7s8:0j	t	00:05:00	1969-12-31 17:20:48.73-07
uk74dsudpgd94faf3n	k93qh369erlt4u954o	caqm13mxzbdr	563o7s8:0j	t	00:05:00	1969-12-31 17:20:48.73-07
uk74dsudpgd94faf3n	k93qh369erlt4u954o	gt8yfqbqc7ca	563o7s8:0j	t	00:05:00	1969-12-31 17:20:48.73-07
uk74dsudpgd94faf3n	jqhqoio6ermdih18oe	2g43j83a271g9	563o7s8:0k	t	00:05:00	1969-12-31 17:20:55.474-07
uk74dsudpgd94faf3n	jqhqoio6ermdih18oe	gt8yfqbqc7ca	563o7s8:0k	t	00:05:00	1969-12-31 17:20:55.474-07
uk74dsudpgd94faf3n	jqhqoio6ermdih18oe	2blc6xwom46ss	563o7s8:0k	t	00:05:00	1969-12-31 17:20:55.474-07
uk74dsudpgd94faf3n	jqhqoio6ermdih18oe	3rnpsi5qegpt3	563o7s8:0k	t	00:05:00	1969-12-31 17:20:55.474-07
uk74dsudpgd94faf3n	jqhqoio6ermdih18oe	3se2qu476j7tg	563o7s8:0k	t	00:05:00	1969-12-31 17:20:55.474-07
uk74dsudpgd94faf3n	jqhqoio6ermdih18oe	caqm13mxzbdr	563o7s8:0k	t	00:05:00	1969-12-31 17:20:55.474-07
uk74dsudpgd94faf3n	jqhqoio6ermdih18oe	817el2k23zdp	563o7s8:0k	t	00:05:00	1969-12-31 17:20:55.474-07
uk74dsudpgd94faf3n	fdq9defamn0hhu733q	2blc6xwom46ss	563o7s8:0l	t	00:05:00	1969-12-31 17:20:56.114-07
uk74dsudpgd94faf3n	fdq9defamn0hhu733q	2g43j83a271g9	563o7s8:0l	t	00:05:00	1969-12-31 17:20:56.114-07
uk74dsudpgd94faf3n	fdq9defamn0hhu733q	3rnpsi5qegpt3	563o7s8:0l	t	00:05:00	1969-12-31 17:20:56.114-07
uk74dsudpgd94faf3n	fdq9defamn0hhu733q	3se2qu476j7tg	563o7s8:0l	t	00:05:00	1969-12-31 17:20:56.114-07
uk74dsudpgd94faf3n	fdq9defamn0hhu733q	817el2k23zdp	563o7s8:0l	t	00:05:00	1969-12-31 17:20:56.114-07
uk74dsudpgd94faf3n	fdq9defamn0hhu733q	caqm13mxzbdr	563o7s8:0l	t	00:05:00	1969-12-31 17:20:56.114-07
uk74dsudpgd94faf3n	fdq9defamn0hhu733q	gt8yfqbqc7ca	563o7s8:0l	t	00:05:00	1969-12-31 17:20:56.114-07
uk74dsudpgd94faf3n	43r8tq5oa07pnljgdi	2g43j83a271g9	563o7s8:0m	t	00:05:00	1969-12-31 17:21:02.41-07
uk74dsudpgd94faf3n	87kn15q01lcs7un73v	2g43j83a271g9	563o7s8:135	t	00:05:00	1969-12-31 17:29:53.7-07
uk74dsudpgd94faf3n	87kn15q01lcs7un73v	3se2qu476j7tg	563o7s8:135	t	00:05:00	1969-12-31 17:29:53.7-07
uk74dsudpgd94faf3n	87kn15q01lcs7un73v	caqm13mxzbdr	563o7s8:135	t	00:05:00	1969-12-31 17:29:53.7-07
uk74dsudpgd94faf3n	3ve6gjihbgd1fsrd5l	3unh7411ka0tz	566ttgw:0o	t	00:05:00	1969-12-31 17:34:00.02-07
uk74dsudpgd94faf3n	3ve6gjihbgd1fsrd5l	817el2k23zdp	566ttgw:0o	t	00:05:00	1969-12-31 17:34:00.02-07
88nh1g3umqn4ia48q0	krbacnd37f5vkela4h	2g43j83a271g9	5687g3c:01	t	00:05:00	1969-12-31 17:00:00.039-07
uk74dsudpgd94faf3n	43r8tq5oa07pnljgdi	gt8yfqbqc7ca	563o7s8:0m	t	00:05:00	1969-12-31 17:21:02.41-07
uk74dsudpgd94faf3n	43r8tq5oa07pnljgdi	2blc6xwom46ss	563o7s8:0m	t	00:05:00	1969-12-31 17:21:02.41-07
uk74dsudpgd94faf3n	43r8tq5oa07pnljgdi	3rnpsi5qegpt3	563o7s8:0m	t	00:05:00	1969-12-31 17:21:02.41-07
uk74dsudpgd94faf3n	43r8tq5oa07pnljgdi	3se2qu476j7tg	563o7s8:0m	t	00:05:00	1969-12-31 17:21:02.41-07
uk74dsudpgd94faf3n	43r8tq5oa07pnljgdi	caqm13mxzbdr	563o7s8:0m	t	00:05:00	1969-12-31 17:21:02.41-07
uk74dsudpgd94faf3n	43r8tq5oa07pnljgdi	817el2k23zdp	563o7s8:0m	t	00:05:00	1969-12-31 17:21:02.41-07
uk74dsudpgd94faf3n	bheo3ja8n7js9n7lj6	2g43j83a271g9	563o7s8:0n	t	00:05:00	1969-12-31 17:21:09.371-07
uk74dsudpgd94faf3n	bheo3ja8n7js9n7lj6	gt8yfqbqc7ca	563o7s8:0n	t	00:05:00	1969-12-31 17:21:09.371-07
uk74dsudpgd94faf3n	bheo3ja8n7js9n7lj6	2blc6xwom46ss	563o7s8:0n	t	00:05:00	1969-12-31 17:21:09.371-07
uk74dsudpgd94faf3n	bheo3ja8n7js9n7lj6	3rnpsi5qegpt3	563o7s8:0n	t	00:05:00	1969-12-31 17:21:09.371-07
uk74dsudpgd94faf3n	bheo3ja8n7js9n7lj6	3se2qu476j7tg	563o7s8:0n	t	00:05:00	1969-12-31 17:21:09.371-07
uk74dsudpgd94faf3n	bheo3ja8n7js9n7lj6	caqm13mxzbdr	563o7s8:0n	t	00:05:00	1969-12-31 17:21:09.371-07
uk74dsudpgd94faf3n	bheo3ja8n7js9n7lj6	817el2k23zdp	563o7s8:0n	t	00:05:00	1969-12-31 17:21:09.371-07
uk74dsudpgd94faf3n	7orgj6s4ik6keg33jv	2blc6xwom46ss	563o7s8:0o	t	00:05:00	1969-12-31 17:21:09.457-07
uk74dsudpgd94faf3n	7orgj6s4ik6keg33jv	2g43j83a271g9	563o7s8:0o	t	00:05:00	1969-12-31 17:21:09.457-07
uk74dsudpgd94faf3n	7orgj6s4ik6keg33jv	3rnpsi5qegpt3	563o7s8:0o	t	00:05:00	1969-12-31 17:21:09.457-07
uk74dsudpgd94faf3n	7orgj6s4ik6keg33jv	3se2qu476j7tg	563o7s8:0o	t	00:05:00	1969-12-31 17:21:09.457-07
uk74dsudpgd94faf3n	7orgj6s4ik6keg33jv	817el2k23zdp	563o7s8:0o	t	00:05:00	1969-12-31 17:21:09.457-07
uk74dsudpgd94faf3n	7orgj6s4ik6keg33jv	caqm13mxzbdr	563o7s8:0o	t	00:05:00	1969-12-31 17:21:09.457-07
uk74dsudpgd94faf3n	7orgj6s4ik6keg33jv	gt8yfqbqc7ca	563o7s8:0o	t	00:05:00	1969-12-31 17:21:09.457-07
uk74dsudpgd94faf3n	ddp3nltifpasim5rur	2g43j83a271g9	563o7s8:0p	t	00:05:00	1969-12-31 17:21:17.328-07
uk74dsudpgd94faf3n	ddp3nltifpasim5rur	gt8yfqbqc7ca	563o7s8:0p	t	00:05:00	1969-12-31 17:21:17.328-07
uk74dsudpgd94faf3n	ddp3nltifpasim5rur	2blc6xwom46ss	563o7s8:0p	t	00:05:00	1969-12-31 17:21:17.328-07
uk74dsudpgd94faf3n	ddp3nltifpasim5rur	3rnpsi5qegpt3	563o7s8:0p	t	00:05:00	1969-12-31 17:21:17.328-07
uk74dsudpgd94faf3n	ddp3nltifpasim5rur	3se2qu476j7tg	563o7s8:0p	t	00:05:00	1969-12-31 17:21:17.328-07
uk74dsudpgd94faf3n	ddp3nltifpasim5rur	caqm13mxzbdr	563o7s8:0p	t	00:05:00	1969-12-31 17:21:17.328-07
uk74dsudpgd94faf3n	ddp3nltifpasim5rur	817el2k23zdp	563o7s8:0p	t	00:05:00	1969-12-31 17:21:17.328-07
uk74dsudpgd94faf3n	ehjkihs4463rh8nvmh	2g43j83a271g9	563o7s8:0q	t	00:05:00	1969-12-31 17:21:25.788-07
uk74dsudpgd94faf3n	ehjkihs4463rh8nvmh	gt8yfqbqc7ca	563o7s8:0q	t	00:05:00	1969-12-31 17:21:25.788-07
uk74dsudpgd94faf3n	ehjkihs4463rh8nvmh	2blc6xwom46ss	563o7s8:0q	t	00:05:00	1969-12-31 17:21:25.788-07
uk74dsudpgd94faf3n	ehjkihs4463rh8nvmh	3rnpsi5qegpt3	563o7s8:0q	t	00:05:00	1969-12-31 17:21:25.788-07
uk74dsudpgd94faf3n	ehjkihs4463rh8nvmh	3se2qu476j7tg	563o7s8:0q	t	00:05:00	1969-12-31 17:21:25.788-07
uk74dsudpgd94faf3n	ehjkihs4463rh8nvmh	caqm13mxzbdr	563o7s8:0q	t	00:05:00	1969-12-31 17:21:25.788-07
uk74dsudpgd94faf3n	ehjkihs4463rh8nvmh	817el2k23zdp	563o7s8:0q	t	00:05:00	1969-12-31 17:21:25.788-07
uk74dsudpgd94faf3n	9uhbko4hqhmash7od4	2blc6xwom46ss	563o7s8:0r	t	00:05:00	1969-12-31 17:21:25.825-07
uk74dsudpgd94faf3n	9uhbko4hqhmash7od4	2g43j83a271g9	563o7s8:0r	t	00:05:00	1969-12-31 17:21:25.825-07
uk74dsudpgd94faf3n	9uhbko4hqhmash7od4	3rnpsi5qegpt3	563o7s8:0r	t	00:05:00	1969-12-31 17:21:25.825-07
uk74dsudpgd94faf3n	9uhbko4hqhmash7od4	3se2qu476j7tg	563o7s8:0r	t	00:05:00	1969-12-31 17:21:25.825-07
uk74dsudpgd94faf3n	9uhbko4hqhmash7od4	817el2k23zdp	563o7s8:0r	t	00:05:00	1969-12-31 17:21:25.825-07
uk74dsudpgd94faf3n	9uhbko4hqhmash7od4	caqm13mxzbdr	563o7s8:0r	t	00:05:00	1969-12-31 17:21:25.825-07
uk74dsudpgd94faf3n	9uhbko4hqhmash7od4	gt8yfqbqc7ca	563o7s8:0r	t	00:05:00	1969-12-31 17:21:25.825-07
uk74dsudpgd94faf3n	59pt4tnr5ga40vav85	2g43j83a271g9	563o7s8:0s	t	00:05:00	1969-12-31 17:21:51.106-07
uk74dsudpgd94faf3n	59pt4tnr5ga40vav85	gt8yfqbqc7ca	563o7s8:0s	t	00:05:00	1969-12-31 17:21:51.106-07
uk74dsudpgd94faf3n	59pt4tnr5ga40vav85	2blc6xwom46ss	563o7s8:0s	t	00:05:00	1969-12-31 17:21:51.106-07
uk74dsudpgd94faf3n	59pt4tnr5ga40vav85	3rnpsi5qegpt3	563o7s8:0s	t	00:05:00	1969-12-31 17:21:51.106-07
uk74dsudpgd94faf3n	59pt4tnr5ga40vav85	3se2qu476j7tg	563o7s8:0s	t	00:05:00	1969-12-31 17:21:51.106-07
uk74dsudpgd94faf3n	59pt4tnr5ga40vav85	caqm13mxzbdr	563o7s8:0s	t	00:05:00	1969-12-31 17:21:51.106-07
uk74dsudpgd94faf3n	59pt4tnr5ga40vav85	817el2k23zdp	563o7s8:0s	t	00:05:00	1969-12-31 17:21:51.106-07
uk74dsudpgd94faf3n	os1tap79au74l8sjkk	2blc6xwom46ss	563o7s8:0t	t	00:05:00	1969-12-31 17:21:51.777-07
uk74dsudpgd94faf3n	os1tap79au74l8sjkk	2g43j83a271g9	563o7s8:0t	t	00:05:00	1969-12-31 17:21:51.777-07
uk74dsudpgd94faf3n	os1tap79au74l8sjkk	3rnpsi5qegpt3	563o7s8:0t	t	00:05:00	1969-12-31 17:21:51.777-07
uk74dsudpgd94faf3n	os1tap79au74l8sjkk	3se2qu476j7tg	563o7s8:0t	t	00:05:00	1969-12-31 17:21:51.777-07
uk74dsudpgd94faf3n	os1tap79au74l8sjkk	817el2k23zdp	563o7s8:0t	t	00:05:00	1969-12-31 17:21:51.777-07
uk74dsudpgd94faf3n	os1tap79au74l8sjkk	caqm13mxzbdr	563o7s8:0t	t	00:05:00	1969-12-31 17:21:51.777-07
uk74dsudpgd94faf3n	os1tap79au74l8sjkk	gt8yfqbqc7ca	563o7s8:0t	t	00:05:00	1969-12-31 17:21:51.777-07
uk74dsudpgd94faf3n	do970l8vsev1g4hb7q	2g43j83a271g9	563o7s8:0v	t	00:05:00	1969-12-31 17:22:07.58-07
uk74dsudpgd94faf3n	do970l8vsev1g4hb7q	gt8yfqbqc7ca	563o7s8:0v	t	00:05:00	1969-12-31 17:22:07.58-07
uk74dsudpgd94faf3n	do970l8vsev1g4hb7q	2blc6xwom46ss	563o7s8:0v	t	00:05:00	1969-12-31 17:22:07.58-07
uk74dsudpgd94faf3n	do970l8vsev1g4hb7q	3rnpsi5qegpt3	563o7s8:0v	t	00:05:00	1969-12-31 17:22:07.58-07
uk74dsudpgd94faf3n	do970l8vsev1g4hb7q	3se2qu476j7tg	563o7s8:0v	t	00:05:00	1969-12-31 17:22:07.58-07
uk74dsudpgd94faf3n	do970l8vsev1g4hb7q	caqm13mxzbdr	563o7s8:0v	t	00:05:00	1969-12-31 17:22:07.58-07
uk74dsudpgd94faf3n	r207mh0ibinnp1le39	2g43j83a271g9	563o7s8:0u	t	00:05:00	1969-12-31 17:22:01.143-07
uk74dsudpgd94faf3n	r207mh0ibinnp1le39	gt8yfqbqc7ca	563o7s8:0u	t	00:05:00	1969-12-31 17:22:01.143-07
uk74dsudpgd94faf3n	r207mh0ibinnp1le39	2blc6xwom46ss	563o7s8:0u	t	00:05:00	1969-12-31 17:22:01.143-07
uk74dsudpgd94faf3n	r207mh0ibinnp1le39	3rnpsi5qegpt3	563o7s8:0u	t	00:05:00	1969-12-31 17:22:01.143-07
uk74dsudpgd94faf3n	r207mh0ibinnp1le39	3se2qu476j7tg	563o7s8:0u	t	00:05:00	1969-12-31 17:22:01.143-07
uk74dsudpgd94faf3n	r207mh0ibinnp1le39	caqm13mxzbdr	563o7s8:0u	t	00:05:00	1969-12-31 17:22:01.143-07
uk74dsudpgd94faf3n	r207mh0ibinnp1le39	817el2k23zdp	563o7s8:0u	t	00:05:00	1969-12-31 17:22:01.143-07
88nh1g3umqn4ia48q0	rlkbna2hflb0g6vogk	817el2k23zdp	56bncow:0j	t	00:05:00	1969-12-31 17:18:00.652-07
uk74dsudpgd94faf3n	jbmmh5mr6qh147n4tq	caqm13mxzbdr	563o7s8:136	t	00:05:00	1969-12-31 17:30:00.184-07
uk74dsudpgd94faf3n	jbmmh5mr6qh147n4tq	2blc6xwom46ss	563o7s8:136	t	00:05:00	1969-12-31 17:30:00.184-07
uk74dsudpgd94faf3n	jbmmh5mr6qh147n4tq	3se2qu476j7tg	563o7s8:136	t	00:05:00	1969-12-31 17:30:00.184-07
uk74dsudpgd94faf3n	do970l8vsev1g4hb7q	817el2k23zdp	563o7s8:0v	t	00:05:00	1969-12-31 17:22:07.58-07
uk74dsudpgd94faf3n	lnlelq9f6dgc0hvmeu	2blc6xwom46ss	563o7s8:137	t	00:05:00	1969-12-31 17:30:00.987-07
uk74dsudpgd94faf3n	8j2299tstks8f50dqj	2g43j83a271g9	563o7s8:138	t	00:05:00	1969-12-31 17:30:07.934-07
uk74dsudpgd94faf3n	8j2299tstks8f50dqj	caqm13mxzbdr	563o7s8:138	t	00:05:00	1969-12-31 17:30:07.934-07
uk74dsudpgd94faf3n	127fv08m5j92aroch2	2blc6xwom46ss	563o7s8:0w	t	00:05:00	1969-12-31 17:22:08.311-07
uk74dsudpgd94faf3n	127fv08m5j92aroch2	2g43j83a271g9	563o7s8:0w	t	00:05:00	1969-12-31 17:22:08.311-07
uk74dsudpgd94faf3n	127fv08m5j92aroch2	3rnpsi5qegpt3	563o7s8:0w	t	00:05:00	1969-12-31 17:22:08.311-07
uk74dsudpgd94faf3n	127fv08m5j92aroch2	3se2qu476j7tg	563o7s8:0w	t	00:05:00	1969-12-31 17:22:08.311-07
uk74dsudpgd94faf3n	127fv08m5j92aroch2	817el2k23zdp	563o7s8:0w	t	00:05:00	1969-12-31 17:22:08.311-07
uk74dsudpgd94faf3n	127fv08m5j92aroch2	caqm13mxzbdr	563o7s8:0w	t	00:05:00	1969-12-31 17:22:08.311-07
uk74dsudpgd94faf3n	127fv08m5j92aroch2	gt8yfqbqc7ca	563o7s8:0w	t	00:05:00	1969-12-31 17:22:08.311-07
uk74dsudpgd94faf3n	8j2299tstks8f50dqj	2blc6xwom46ss	563o7s8:138	t	00:05:00	1969-12-31 17:30:07.934-07
uk74dsudpgd94faf3n	g806sgj5bqh09p8c87	2g43j83a271g9	563o7s8:0x	t	00:05:00	1969-12-31 17:22:17.379-07
uk74dsudpgd94faf3n	g806sgj5bqh09p8c87	gt8yfqbqc7ca	563o7s8:0x	t	00:05:00	1969-12-31 17:22:17.379-07
uk74dsudpgd94faf3n	g806sgj5bqh09p8c87	2blc6xwom46ss	563o7s8:0x	t	00:05:00	1969-12-31 17:22:17.379-07
uk74dsudpgd94faf3n	g806sgj5bqh09p8c87	3rnpsi5qegpt3	563o7s8:0x	t	00:05:00	1969-12-31 17:22:17.379-07
uk74dsudpgd94faf3n	g806sgj5bqh09p8c87	3se2qu476j7tg	563o7s8:0x	t	00:05:00	1969-12-31 17:22:17.379-07
uk74dsudpgd94faf3n	g806sgj5bqh09p8c87	caqm13mxzbdr	563o7s8:0x	t	00:05:00	1969-12-31 17:22:17.379-07
uk74dsudpgd94faf3n	g806sgj5bqh09p8c87	817el2k23zdp	563o7s8:0x	t	00:05:00	1969-12-31 17:22:17.379-07
uk74dsudpgd94faf3n	fv6c4iv8o3odakgjt5	2blc6xwom46ss	563o7s8:0y	t	00:05:00	1969-12-31 17:22:18.189-07
uk74dsudpgd94faf3n	fv6c4iv8o3odakgjt5	2g43j83a271g9	563o7s8:0y	t	00:05:00	1969-12-31 17:22:18.189-07
uk74dsudpgd94faf3n	fv6c4iv8o3odakgjt5	3rnpsi5qegpt3	563o7s8:0y	t	00:05:00	1969-12-31 17:22:18.189-07
uk74dsudpgd94faf3n	fv6c4iv8o3odakgjt5	3se2qu476j7tg	563o7s8:0y	t	00:05:00	1969-12-31 17:22:18.189-07
uk74dsudpgd94faf3n	fv6c4iv8o3odakgjt5	817el2k23zdp	563o7s8:0y	t	00:05:00	1969-12-31 17:22:18.189-07
uk74dsudpgd94faf3n	fv6c4iv8o3odakgjt5	caqm13mxzbdr	563o7s8:0y	t	00:05:00	1969-12-31 17:22:18.189-07
uk74dsudpgd94faf3n	fv6c4iv8o3odakgjt5	gt8yfqbqc7ca	563o7s8:0y	t	00:05:00	1969-12-31 17:22:18.189-07
uk74dsudpgd94faf3n	govuqtf7jv621n896t	2g43j83a271g9	563o7s8:0z	t	00:05:00	1969-12-31 17:22:25.479-07
uk74dsudpgd94faf3n	govuqtf7jv621n896t	gt8yfqbqc7ca	563o7s8:0z	t	00:05:00	1969-12-31 17:22:25.479-07
uk74dsudpgd94faf3n	govuqtf7jv621n896t	2blc6xwom46ss	563o7s8:0z	t	00:05:00	1969-12-31 17:22:25.479-07
uk74dsudpgd94faf3n	govuqtf7jv621n896t	3rnpsi5qegpt3	563o7s8:0z	t	00:05:00	1969-12-31 17:22:25.479-07
uk74dsudpgd94faf3n	govuqtf7jv621n896t	3se2qu476j7tg	563o7s8:0z	t	00:05:00	1969-12-31 17:22:25.479-07
uk74dsudpgd94faf3n	govuqtf7jv621n896t	caqm13mxzbdr	563o7s8:0z	t	00:05:00	1969-12-31 17:22:25.479-07
uk74dsudpgd94faf3n	govuqtf7jv621n896t	817el2k23zdp	563o7s8:0z	t	00:05:00	1969-12-31 17:22:25.479-07
uk74dsudpgd94faf3n	4bogh4osbaqg6acmro	2g43j83a271g9	563o7s8:110	t	00:05:00	1969-12-31 17:22:33.068-07
uk74dsudpgd94faf3n	4bogh4osbaqg6acmro	gt8yfqbqc7ca	563o7s8:110	t	00:05:00	1969-12-31 17:22:33.068-07
uk74dsudpgd94faf3n	4bogh4osbaqg6acmro	2blc6xwom46ss	563o7s8:110	t	00:05:00	1969-12-31 17:22:33.068-07
uk74dsudpgd94faf3n	4bogh4osbaqg6acmro	3rnpsi5qegpt3	563o7s8:110	t	00:05:00	1969-12-31 17:22:33.068-07
uk74dsudpgd94faf3n	4bogh4osbaqg6acmro	3se2qu476j7tg	563o7s8:110	t	00:05:00	1969-12-31 17:22:33.068-07
uk74dsudpgd94faf3n	4bogh4osbaqg6acmro	caqm13mxzbdr	563o7s8:110	t	00:05:00	1969-12-31 17:22:33.068-07
uk74dsudpgd94faf3n	4bogh4osbaqg6acmro	817el2k23zdp	563o7s8:110	t	00:05:00	1969-12-31 17:22:33.068-07
uk74dsudpgd94faf3n	oalchlrla83ltr14mq	2blc6xwom46ss	563o7s8:111	t	00:05:00	1969-12-31 17:22:33.657-07
uk74dsudpgd94faf3n	oalchlrla83ltr14mq	2g43j83a271g9	563o7s8:111	t	00:05:00	1969-12-31 17:22:33.657-07
uk74dsudpgd94faf3n	oalchlrla83ltr14mq	3rnpsi5qegpt3	563o7s8:111	t	00:05:00	1969-12-31 17:22:33.657-07
uk74dsudpgd94faf3n	oalchlrla83ltr14mq	3se2qu476j7tg	563o7s8:111	t	00:05:00	1969-12-31 17:22:33.657-07
uk74dsudpgd94faf3n	oalchlrla83ltr14mq	817el2k23zdp	563o7s8:111	t	00:05:00	1969-12-31 17:22:33.657-07
uk74dsudpgd94faf3n	oalchlrla83ltr14mq	caqm13mxzbdr	563o7s8:111	t	00:05:00	1969-12-31 17:22:33.657-07
uk74dsudpgd94faf3n	oalchlrla83ltr14mq	gt8yfqbqc7ca	563o7s8:111	t	00:05:00	1969-12-31 17:22:33.657-07
uk74dsudpgd94faf3n	smnifr9gs9eb8d8a0e	2g43j83a271g9	563o7s8:112	t	00:05:00	1969-12-31 17:22:41.546-07
uk74dsudpgd94faf3n	smnifr9gs9eb8d8a0e	gt8yfqbqc7ca	563o7s8:112	t	00:05:00	1969-12-31 17:22:41.546-07
uk74dsudpgd94faf3n	smnifr9gs9eb8d8a0e	2blc6xwom46ss	563o7s8:112	t	00:05:00	1969-12-31 17:22:41.546-07
uk74dsudpgd94faf3n	smnifr9gs9eb8d8a0e	3rnpsi5qegpt3	563o7s8:112	t	00:05:00	1969-12-31 17:22:41.546-07
uk74dsudpgd94faf3n	smnifr9gs9eb8d8a0e	3se2qu476j7tg	563o7s8:112	t	00:05:00	1969-12-31 17:22:41.546-07
uk74dsudpgd94faf3n	smnifr9gs9eb8d8a0e	caqm13mxzbdr	563o7s8:112	t	00:05:00	1969-12-31 17:22:41.546-07
uk74dsudpgd94faf3n	lnlelq9f6dgc0hvmeu	2g43j83a271g9	563o7s8:137	t	00:05:00	1969-12-31 17:30:00.987-07
uk74dsudpgd94faf3n	lnlelq9f6dgc0hvmeu	3se2qu476j7tg	563o7s8:137	t	00:05:00	1969-12-31 17:30:00.987-07
uk74dsudpgd94faf3n	lnlelq9f6dgc0hvmeu	caqm13mxzbdr	563o7s8:137	t	00:05:00	1969-12-31 17:30:00.987-07
uk74dsudpgd94faf3n	smnifr9gs9eb8d8a0e	817el2k23zdp	563o7s8:112	t	00:05:00	1969-12-31 17:22:41.546-07
uk74dsudpgd94faf3n	5oj3q6vvkuflq3qpjm	2g43j83a271g9	563o7s8:113	t	00:05:00	1969-12-31 17:22:51.927-07
uk74dsudpgd94faf3n	5oj3q6vvkuflq3qpjm	gt8yfqbqc7ca	563o7s8:113	t	00:05:00	1969-12-31 17:22:51.927-07
uk74dsudpgd94faf3n	5oj3q6vvkuflq3qpjm	2blc6xwom46ss	563o7s8:113	t	00:05:00	1969-12-31 17:22:51.927-07
uk74dsudpgd94faf3n	5oj3q6vvkuflq3qpjm	3rnpsi5qegpt3	563o7s8:113	t	00:05:00	1969-12-31 17:22:51.927-07
uk74dsudpgd94faf3n	5oj3q6vvkuflq3qpjm	3se2qu476j7tg	563o7s8:113	t	00:05:00	1969-12-31 17:22:51.927-07
uk74dsudpgd94faf3n	5oj3q6vvkuflq3qpjm	caqm13mxzbdr	563o7s8:113	t	00:05:00	1969-12-31 17:22:51.927-07
uk74dsudpgd94faf3n	5oj3q6vvkuflq3qpjm	817el2k23zdp	563o7s8:113	t	00:05:00	1969-12-31 17:22:51.927-07
uk74dsudpgd94faf3n	p41upbna4gjbbh9k96	2blc6xwom46ss	563o7s8:114	t	00:05:00	1969-12-31 17:22:52.067-07
uk74dsudpgd94faf3n	p41upbna4gjbbh9k96	2g43j83a271g9	563o7s8:114	t	00:05:00	1969-12-31 17:22:52.067-07
uk74dsudpgd94faf3n	p41upbna4gjbbh9k96	3rnpsi5qegpt3	563o7s8:114	t	00:05:00	1969-12-31 17:22:52.067-07
uk74dsudpgd94faf3n	p41upbna4gjbbh9k96	3se2qu476j7tg	563o7s8:114	t	00:05:00	1969-12-31 17:22:52.067-07
uk74dsudpgd94faf3n	p41upbna4gjbbh9k96	817el2k23zdp	563o7s8:114	t	00:05:00	1969-12-31 17:22:52.067-07
uk74dsudpgd94faf3n	p41upbna4gjbbh9k96	caqm13mxzbdr	563o7s8:114	t	00:05:00	1969-12-31 17:22:52.067-07
uk74dsudpgd94faf3n	p41upbna4gjbbh9k96	gt8yfqbqc7ca	563o7s8:114	t	00:05:00	1969-12-31 17:22:52.067-07
uk74dsudpgd94faf3n	75sq7kl6dhsr1qgsui	2g43j83a271g9	563o7s8:115	t	00:05:00	1969-12-31 17:23:00.5-07
uk74dsudpgd94faf3n	75sq7kl6dhsr1qgsui	gt8yfqbqc7ca	563o7s8:115	t	00:05:00	1969-12-31 17:23:00.5-07
uk74dsudpgd94faf3n	75sq7kl6dhsr1qgsui	2blc6xwom46ss	563o7s8:115	t	00:05:00	1969-12-31 17:23:00.5-07
uk74dsudpgd94faf3n	75sq7kl6dhsr1qgsui	3rnpsi5qegpt3	563o7s8:115	t	00:05:00	1969-12-31 17:23:00.5-07
uk74dsudpgd94faf3n	75sq7kl6dhsr1qgsui	3se2qu476j7tg	563o7s8:115	t	00:05:00	1969-12-31 17:23:00.5-07
uk74dsudpgd94faf3n	75sq7kl6dhsr1qgsui	caqm13mxzbdr	563o7s8:115	t	00:05:00	1969-12-31 17:23:00.5-07
uk74dsudpgd94faf3n	75sq7kl6dhsr1qgsui	817el2k23zdp	563o7s8:115	t	00:05:00	1969-12-31 17:23:00.5-07
uk74dsudpgd94faf3n	g95klm2721b6fqdd7o	2g43j83a271g9	563o7s8:116	t	00:05:00	1969-12-31 17:23:07.514-07
uk74dsudpgd94faf3n	g95klm2721b6fqdd7o	gt8yfqbqc7ca	563o7s8:116	t	00:05:00	1969-12-31 17:23:07.514-07
uk74dsudpgd94faf3n	g95klm2721b6fqdd7o	2blc6xwom46ss	563o7s8:116	t	00:05:00	1969-12-31 17:23:07.514-07
uk74dsudpgd94faf3n	g95klm2721b6fqdd7o	3rnpsi5qegpt3	563o7s8:116	t	00:05:00	1969-12-31 17:23:07.514-07
uk74dsudpgd94faf3n	g95klm2721b6fqdd7o	3se2qu476j7tg	563o7s8:116	t	00:05:00	1969-12-31 17:23:07.514-07
uk74dsudpgd94faf3n	g95klm2721b6fqdd7o	caqm13mxzbdr	563o7s8:116	t	00:05:00	1969-12-31 17:23:07.514-07
uk74dsudpgd94faf3n	g95klm2721b6fqdd7o	817el2k23zdp	563o7s8:116	t	00:05:00	1969-12-31 17:23:07.514-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	uizv2xjm3zqw	563o7s8:11b	t	00:05:00	1969-12-31 17:23:33.69-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	1z8ikb5cnznqy	563o7s8:11b	t	00:05:00	1969-12-31 17:23:33.69-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	343u9rvx540f6	563o7s8:11b	t	00:05:00	1969-12-31 17:23:33.69-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	351uuya4pj2ql	563o7s8:11b	t	00:05:00	1969-12-31 17:23:33.69-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	gt8yfqbqc7ca	563o7s8:11d	t	00:05:00	1969-12-31 17:23:36.262-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	3rnpsi5qegpt3	563o7s8:11d	t	00:05:00	1969-12-31 17:23:36.262-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	3se2qu476j7tg	563o7s8:11d	t	00:05:00	1969-12-31 17:23:36.262-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	caqm13mxzbdr	563o7s8:11d	t	00:05:00	1969-12-31 17:23:36.262-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	2blc6xwom46ss	563o7s8:11d	t	00:05:00	1969-12-31 17:23:36.262-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	2g43j83a271g9	563o7s8:11e	t	00:05:00	1969-12-31 17:23:48.646-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	817el2k23zdp	563o7s8:11e	t	00:05:00	1969-12-31 17:23:48.646-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	3t09dyzubc9zp	563o7s8:11e	t	00:05:00	1969-12-31 17:23:48.646-07
uk74dsudpgd94faf3n	kbbvm4h2vj3j8g2ant	3unh7411ka0tz	563o7s8:11e	t	00:05:00	1969-12-31 17:23:48.646-07
uk74dsudpgd94faf3n	8r6tflbgdmqfr5osl4	2g43j83a271g9	563o7s8:11f	t	00:05:00	1969-12-31 17:23:48.703-07
uk74dsudpgd94faf3n	8r6tflbgdmqfr5osl4	3t09dyzubc9zp	563o7s8:11f	t	00:05:00	1969-12-31 17:23:48.703-07
uk74dsudpgd94faf3n	8r6tflbgdmqfr5osl4	3unh7411ka0tz	563o7s8:11f	t	00:05:00	1969-12-31 17:23:48.703-07
uk74dsudpgd94faf3n	8r6tflbgdmqfr5osl4	817el2k23zdp	563o7s8:11f	t	00:05:00	1969-12-31 17:23:48.703-07
uk74dsudpgd94faf3n	arskg3tg6eguuoionj	2g43j83a271g9	563o7s8:11g	t	00:05:00	1969-12-31 17:24:04.337-07
uk74dsudpgd94faf3n	arskg3tg6eguuoionj	3t09dyzubc9zp	563o7s8:11g	t	00:05:00	1969-12-31 17:24:04.337-07
uk74dsudpgd94faf3n	arskg3tg6eguuoionj	3unh7411ka0tz	563o7s8:11g	t	00:05:00	1969-12-31 17:24:04.337-07
uk74dsudpgd94faf3n	arskg3tg6eguuoionj	817el2k23zdp	563o7s8:11g	t	00:05:00	1969-12-31 17:24:04.337-07
uk74dsudpgd94faf3n	p2ijd35djf9o1tkvt4	2g43j83a271g9	563o7s8:11h	t	00:05:00	1969-12-31 17:24:13.041-07
uk74dsudpgd94faf3n	p2ijd35djf9o1tkvt4	3t09dyzubc9zp	563o7s8:11h	t	00:05:00	1969-12-31 17:24:13.041-07
uk74dsudpgd94faf3n	p2ijd35djf9o1tkvt4	3unh7411ka0tz	563o7s8:11h	t	00:05:00	1969-12-31 17:24:13.041-07
uk74dsudpgd94faf3n	p2ijd35djf9o1tkvt4	817el2k23zdp	563o7s8:11h	t	00:05:00	1969-12-31 17:24:13.041-07
uk74dsudpgd94faf3n	e7v1dta5dvq9pia2pf	2g43j83a271g9	563o7s8:11i	t	00:05:00	1969-12-31 17:24:20.321-07
uk74dsudpgd94faf3n	e7v1dta5dvq9pia2pf	3t09dyzubc9zp	563o7s8:11i	t	00:05:00	1969-12-31 17:24:20.321-07
uk74dsudpgd94faf3n	e7v1dta5dvq9pia2pf	3unh7411ka0tz	563o7s8:11i	t	00:05:00	1969-12-31 17:24:20.321-07
uk74dsudpgd94faf3n	g6g2hvotouqm83pjjs	2g43j83a271g9	563o7s8:11j	t	00:05:00	1969-12-31 17:24:32.651-07
uk74dsudpgd94faf3n	g6g2hvotouqm83pjjs	3t09dyzubc9zp	563o7s8:11j	t	00:05:00	1969-12-31 17:24:32.651-07
uk74dsudpgd94faf3n	g6g2hvotouqm83pjjs	3unh7411ka0tz	563o7s8:11j	t	00:05:00	1969-12-31 17:24:32.651-07
uk74dsudpgd94faf3n	g6g2hvotouqm83pjjs	817el2k23zdp	563o7s8:11j	t	00:05:00	1969-12-31 17:24:32.651-07
uk74dsudpgd94faf3n	e7v1dta5dvq9pia2pf	817el2k23zdp	563o7s8:11i	t	00:05:00	1969-12-31 17:24:20.321-07
88nh1g3umqn4ia48q0	8m9dcke4ovmr236vr3	2g43j83a271g9	56bncow:0k	t	00:05:00	1969-12-31 17:18:09.292-07
uk74dsudpgd94faf3n	u5e5assb1fusv3925n	2g43j83a271g9	563o7s8:11k	t	00:05:00	1969-12-31 17:24:33.295-07
uk74dsudpgd94faf3n	u5e5assb1fusv3925n	3t09dyzubc9zp	563o7s8:11k	t	00:05:00	1969-12-31 17:24:33.295-07
uk74dsudpgd94faf3n	u5e5assb1fusv3925n	3unh7411ka0tz	563o7s8:11k	t	00:05:00	1969-12-31 17:24:33.295-07
uk74dsudpgd94faf3n	u5e5assb1fusv3925n	817el2k23zdp	563o7s8:11k	t	00:05:00	1969-12-31 17:24:33.295-07
uk74dsudpgd94faf3n	7js5icvm1pksjli02g	2g43j83a271g9	563o7s8:11l	t	00:05:00	1969-12-31 17:24:41.959-07
uk74dsudpgd94faf3n	7js5icvm1pksjli02g	3t09dyzubc9zp	563o7s8:11l	t	00:05:00	1969-12-31 17:24:41.959-07
uk74dsudpgd94faf3n	7js5icvm1pksjli02g	3unh7411ka0tz	563o7s8:11l	t	00:05:00	1969-12-31 17:24:41.959-07
uk74dsudpgd94faf3n	7js5icvm1pksjli02g	817el2k23zdp	563o7s8:11l	t	00:05:00	1969-12-31 17:24:41.959-07
uk74dsudpgd94faf3n	v61jtdtq6a6793iv3t	2g43j83a271g9	563o7s8:11m	t	00:05:00	1969-12-31 17:24:42.755-07
uk74dsudpgd94faf3n	v61jtdtq6a6793iv3t	3t09dyzubc9zp	563o7s8:11m	t	00:05:00	1969-12-31 17:24:42.755-07
uk74dsudpgd94faf3n	v61jtdtq6a6793iv3t	3unh7411ka0tz	563o7s8:11m	t	00:05:00	1969-12-31 17:24:42.755-07
uk74dsudpgd94faf3n	v61jtdtq6a6793iv3t	817el2k23zdp	563o7s8:11m	t	00:05:00	1969-12-31 17:24:42.755-07
uk74dsudpgd94faf3n	14u34rtc0seqli8vma	2g43j83a271g9	563o7s8:11n	t	00:05:00	1969-12-31 17:24:48.336-07
uk74dsudpgd94faf3n	14u34rtc0seqli8vma	3t09dyzubc9zp	563o7s8:11n	t	00:05:00	1969-12-31 17:24:48.336-07
uk74dsudpgd94faf3n	14u34rtc0seqli8vma	3unh7411ka0tz	563o7s8:11n	t	00:05:00	1969-12-31 17:24:48.336-07
uk74dsudpgd94faf3n	14u34rtc0seqli8vma	817el2k23zdp	563o7s8:11n	t	00:05:00	1969-12-31 17:24:48.336-07
uk74dsudpgd94faf3n	8ofdeicr1jg5p7t9a9	2g43j83a271g9	563o7s8:11o	t	00:05:00	1969-12-31 17:25:03.508-07
uk74dsudpgd94faf3n	8ofdeicr1jg5p7t9a9	3t09dyzubc9zp	563o7s8:11o	t	00:05:00	1969-12-31 17:25:03.508-07
uk74dsudpgd94faf3n	8ofdeicr1jg5p7t9a9	3unh7411ka0tz	563o7s8:11o	t	00:05:00	1969-12-31 17:25:03.508-07
uk74dsudpgd94faf3n	8ofdeicr1jg5p7t9a9	817el2k23zdp	563o7s8:11o	t	00:05:00	1969-12-31 17:25:03.508-07
uk74dsudpgd94faf3n	k8qaam522nlvaqd8p6	2g43j83a271g9	563o7s8:11p	t	00:05:00	1969-12-31 17:25:12.29-07
uk74dsudpgd94faf3n	k8qaam522nlvaqd8p6	3t09dyzubc9zp	563o7s8:11p	t	00:05:00	1969-12-31 17:25:12.29-07
uk74dsudpgd94faf3n	k8qaam522nlvaqd8p6	3unh7411ka0tz	563o7s8:11p	t	00:05:00	1969-12-31 17:25:12.29-07
uk74dsudpgd94faf3n	k8qaam522nlvaqd8p6	817el2k23zdp	563o7s8:11p	t	00:05:00	1969-12-31 17:25:12.29-07
uk74dsudpgd94faf3n	885dr0oika8tihp8lg	2g43j83a271g9	563o7s8:11q	t	00:05:00	1969-12-31 17:25:12.971-07
uk74dsudpgd94faf3n	885dr0oika8tihp8lg	3t09dyzubc9zp	563o7s8:11q	t	00:05:00	1969-12-31 17:25:12.971-07
uk74dsudpgd94faf3n	885dr0oika8tihp8lg	3unh7411ka0tz	563o7s8:11q	t	00:05:00	1969-12-31 17:25:12.971-07
uk74dsudpgd94faf3n	885dr0oika8tihp8lg	817el2k23zdp	563o7s8:11q	t	00:05:00	1969-12-31 17:25:12.971-07
uk74dsudpgd94faf3n	avvqkm6m9dq557v3mo	2g43j83a271g9	563o7s8:11r	t	00:05:00	1969-12-31 17:25:29.407-07
uk74dsudpgd94faf3n	avvqkm6m9dq557v3mo	3t09dyzubc9zp	563o7s8:11r	t	00:05:00	1969-12-31 17:25:29.407-07
uk74dsudpgd94faf3n	avvqkm6m9dq557v3mo	3unh7411ka0tz	563o7s8:11r	t	00:05:00	1969-12-31 17:25:29.407-07
uk74dsudpgd94faf3n	avvqkm6m9dq557v3mo	817el2k23zdp	563o7s8:11r	t	00:05:00	1969-12-31 17:25:29.407-07
uk74dsudpgd94faf3n	17lfpads81ouue9j5j	2g43j83a271g9	563o7s8:11s	t	00:05:00	1969-12-31 17:25:30.121-07
uk74dsudpgd94faf3n	17lfpads81ouue9j5j	3t09dyzubc9zp	563o7s8:11s	t	00:05:00	1969-12-31 17:25:30.121-07
uk74dsudpgd94faf3n	17lfpads81ouue9j5j	3unh7411ka0tz	563o7s8:11s	t	00:05:00	1969-12-31 17:25:30.121-07
uk74dsudpgd94faf3n	17lfpads81ouue9j5j	817el2k23zdp	563o7s8:11s	t	00:05:00	1969-12-31 17:25:30.121-07
uk74dsudpgd94faf3n	np1lav1dkdbhtv2qo3	2g43j83a271g9	563o7s8:11t	t	00:05:00	1969-12-31 17:25:41.324-07
uk74dsudpgd94faf3n	np1lav1dkdbhtv2qo3	3t09dyzubc9zp	563o7s8:11t	t	00:05:00	1969-12-31 17:25:41.324-07
uk74dsudpgd94faf3n	np1lav1dkdbhtv2qo3	3unh7411ka0tz	563o7s8:11t	t	00:05:00	1969-12-31 17:25:41.324-07
uk74dsudpgd94faf3n	np1lav1dkdbhtv2qo3	817el2k23zdp	563o7s8:11t	t	00:05:00	1969-12-31 17:25:41.324-07
uk74dsudpgd94faf3n	oh7ger7mikevnue9gt	2g43j83a271g9	563o7s8:11u	t	00:05:00	1969-12-31 17:25:42.967-07
uk74dsudpgd94faf3n	oh7ger7mikevnue9gt	3t09dyzubc9zp	563o7s8:11u	t	00:05:00	1969-12-31 17:25:42.967-07
uk74dsudpgd94faf3n	oh7ger7mikevnue9gt	3unh7411ka0tz	563o7s8:11u	t	00:05:00	1969-12-31 17:25:42.967-07
uk74dsudpgd94faf3n	oh7ger7mikevnue9gt	817el2k23zdp	563o7s8:11u	t	00:05:00	1969-12-31 17:25:42.967-07
uk74dsudpgd94faf3n	i65joojcnnd53udggf	817el2k23zdp	563o7s8:11w	t	00:05:00	1969-12-31 17:25:46.898-07
uk74dsudpgd94faf3n	i65joojcnnd53udggf	3t09dyzubc9zp	563o7s8:11w	t	00:05:00	1969-12-31 17:25:46.898-07
uk74dsudpgd94faf3n	i65joojcnnd53udggf	3unh7411ka0tz	563o7s8:11w	t	00:05:00	1969-12-31 17:25:46.898-07
uk74dsudpgd94faf3n	i65joojcnnd53udggf	3rnpsi5qegpt3	563o7s8:120	t	00:05:00	1969-12-31 17:25:56.441-07
uk74dsudpgd94faf3n	i65joojcnnd53udggf	2g43j83a271g9	563o7s8:121	t	00:05:00	1969-12-31 17:26:04.126-07
uk74dsudpgd94faf3n	i65joojcnnd53udggf	caqm13mxzbdr	563o7s8:121	t	00:05:00	1969-12-31 17:26:04.126-07
uk74dsudpgd94faf3n	i65joojcnnd53udggf	2blc6xwom46ss	563o7s8:121	t	00:05:00	1969-12-31 17:26:04.126-07
uk74dsudpgd94faf3n	i65joojcnnd53udggf	3se2qu476j7tg	563o7s8:121	t	00:05:00	1969-12-31 17:26:04.126-07
uk74dsudpgd94faf3n	kcg2t37568ug4uci8p	2blc6xwom46ss	563o7s8:122	t	00:05:00	1969-12-31 17:26:07.466-07
uk74dsudpgd94faf3n	kcg2t37568ug4uci8p	2g43j83a271g9	563o7s8:122	t	00:05:00	1969-12-31 17:26:07.466-07
uk74dsudpgd94faf3n	kcg2t37568ug4uci8p	3se2qu476j7tg	563o7s8:122	t	00:05:00	1969-12-31 17:26:07.466-07
uk74dsudpgd94faf3n	kcg2t37568ug4uci8p	caqm13mxzbdr	563o7s8:122	t	00:05:00	1969-12-31 17:26:07.466-07
uk74dsudpgd94faf3n	qr3tklsd5p1ouqlen1	2blc6xwom46ss	563o7s8:124	t	00:05:00	1969-12-31 17:26:09.163-07
uk74dsudpgd94faf3n	qr3tklsd5p1ouqlen1	3se2qu476j7tg	563o7s8:124	t	00:05:00	1969-12-31 17:26:09.163-07
uk74dsudpgd94faf3n	qr3tklsd5p1ouqlen1	caqm13mxzbdr	563o7s8:124	t	00:05:00	1969-12-31 17:26:09.163-07
uk74dsudpgd94faf3n	qr3tklsd5p1ouqlen1	2g43j83a271g9	563o7s8:125	t	00:05:00	1969-12-31 17:26:13.641-07
uk74dsudpgd94faf3n	8j2299tstks8f50dqj	3se2qu476j7tg	563o7s8:138	t	00:05:00	1969-12-31 17:30:07.934-07
88nh1g3umqn4ia48q0	8m9dcke4ovmr236vr3	3t09dyzubc9zp	56bncow:0k	t	00:05:00	1969-12-31 17:18:09.292-07
88nh1g3umqn4ia48q0	8m9dcke4ovmr236vr3	3unh7411ka0tz	56bncow:0k	t	00:05:00	1969-12-31 17:18:09.292-07
88nh1g3umqn4ia48q0	8m9dcke4ovmr236vr3	817el2k23zdp	56bncow:0k	t	00:05:00	1969-12-31 17:18:09.292-07
uk74dsudpgd94faf3n	qr3tklsd5p1ouqlen1	3t09dyzubc9zp	563o7s8:125	t	00:05:00	1969-12-31 17:26:13.641-07
uk74dsudpgd94faf3n	qr3tklsd5p1ouqlen1	3unh7411ka0tz	563o7s8:125	t	00:05:00	1969-12-31 17:26:13.641-07
uk74dsudpgd94faf3n	qr3tklsd5p1ouqlen1	817el2k23zdp	563o7s8:125	t	00:05:00	1969-12-31 17:26:13.641-07
uk74dsudpgd94faf3n	ur66tl07fir5fkbvd0	2g43j83a271g9	563o7s8:127	t	00:05:00	1969-12-31 17:26:50.591-07
uk74dsudpgd94faf3n	ur66tl07fir5fkbvd0	3t09dyzubc9zp	563o7s8:127	t	00:05:00	1969-12-31 17:26:50.591-07
uk74dsudpgd94faf3n	ur66tl07fir5fkbvd0	3unh7411ka0tz	563o7s8:127	t	00:05:00	1969-12-31 17:26:50.591-07
uk74dsudpgd94faf3n	ur66tl07fir5fkbvd0	817el2k23zdp	563o7s8:127	t	00:05:00	1969-12-31 17:26:50.591-07
uk74dsudpgd94faf3n	ur66tl07fir5fkbvd0	e2hz9kajle2s	563o7s8:127	t	00:05:00	1969-12-31 17:26:50.591-07
uk74dsudpgd94faf3n	g090qse9c5hjcf7sui	2g43j83a271g9	563o7s8:128	t	00:05:00	1969-12-31 17:26:58.305-07
uk74dsudpgd94faf3n	g090qse9c5hjcf7sui	3t09dyzubc9zp	563o7s8:128	t	00:05:00	1969-12-31 17:26:58.305-07
uk74dsudpgd94faf3n	g090qse9c5hjcf7sui	3unh7411ka0tz	563o7s8:128	t	00:05:00	1969-12-31 17:26:58.305-07
uk74dsudpgd94faf3n	g090qse9c5hjcf7sui	817el2k23zdp	563o7s8:128	t	00:05:00	1969-12-31 17:26:58.305-07
uk74dsudpgd94faf3n	g090qse9c5hjcf7sui	e2hz9kajle2s	563o7s8:128	t	00:05:00	1969-12-31 17:26:58.305-07
uk74dsudpgd94faf3n	uv2aj367gmegdm78kn	2g43j83a271g9	563o7s8:129	t	00:05:00	1969-12-31 17:26:59.926-07
uk74dsudpgd94faf3n	uv2aj367gmegdm78kn	3t09dyzubc9zp	563o7s8:129	t	00:05:00	1969-12-31 17:26:59.926-07
uk74dsudpgd94faf3n	uv2aj367gmegdm78kn	3unh7411ka0tz	563o7s8:129	t	00:05:00	1969-12-31 17:26:59.926-07
uk74dsudpgd94faf3n	uv2aj367gmegdm78kn	817el2k23zdp	563o7s8:129	t	00:05:00	1969-12-31 17:26:59.926-07
uk74dsudpgd94faf3n	uv2aj367gmegdm78kn	e2hz9kajle2s	563o7s8:129	t	00:05:00	1969-12-31 17:26:59.926-07
uk74dsudpgd94faf3n	apgolhf7o1tc25oojl	e2hz9kajle2s	563o7s8:12a	t	00:05:00	1969-12-31 17:27:03.083-07
uk74dsudpgd94faf3n	apgolhf7o1tc25oojl	2g43j83a271g9	563o7s8:12b	t	00:05:00	1969-12-31 17:27:09.403-07
uk74dsudpgd94faf3n	apgolhf7o1tc25oojl	3t09dyzubc9zp	563o7s8:12b	t	00:05:00	1969-12-31 17:27:09.403-07
uk74dsudpgd94faf3n	apgolhf7o1tc25oojl	3unh7411ka0tz	563o7s8:12b	t	00:05:00	1969-12-31 17:27:09.403-07
uk74dsudpgd94faf3n	apgolhf7o1tc25oojl	817el2k23zdp	563o7s8:12b	t	00:05:00	1969-12-31 17:27:09.403-07
uk74dsudpgd94faf3n	rl619m320gf08820fk	1j8dxewufrst5	563o7s8:12e	t	00:05:00	1969-12-31 17:27:51.615-07
uk74dsudpgd94faf3n	rl619m320gf08820fk	2g43j83a271g9	563o7s8:12f	t	00:05:00	1969-12-31 17:27:55.892-07
uk74dsudpgd94faf3n	rl619m320gf08820fk	3t09dyzubc9zp	563o7s8:12f	t	00:05:00	1969-12-31 17:27:55.892-07
uk74dsudpgd94faf3n	rl619m320gf08820fk	3unh7411ka0tz	563o7s8:12f	t	00:05:00	1969-12-31 17:27:55.892-07
uk74dsudpgd94faf3n	rl619m320gf08820fk	817el2k23zdp	563o7s8:12f	t	00:05:00	1969-12-31 17:27:55.892-07
uk74dsudpgd94faf3n	kdumfji0k6ep1b5beq	2g43j83a271g9	563o7s8:12g	t	00:05:00	1969-12-31 17:28:10.929-07
uk74dsudpgd94faf3n	kdumfji0k6ep1b5beq	3t09dyzubc9zp	563o7s8:12g	t	00:05:00	1969-12-31 17:28:10.929-07
uk74dsudpgd94faf3n	kdumfji0k6ep1b5beq	3unh7411ka0tz	563o7s8:12g	t	00:05:00	1969-12-31 17:28:10.929-07
uk74dsudpgd94faf3n	kdumfji0k6ep1b5beq	817el2k23zdp	563o7s8:12g	t	00:05:00	1969-12-31 17:28:10.929-07
uk74dsudpgd94faf3n	esvo7j6mh7mna871cb	2g43j83a271g9	563o7s8:12h	t	00:05:00	1969-12-31 17:28:11.569-07
uk74dsudpgd94faf3n	esvo7j6mh7mna871cb	3t09dyzubc9zp	563o7s8:12h	t	00:05:00	1969-12-31 17:28:11.569-07
uk74dsudpgd94faf3n	esvo7j6mh7mna871cb	3unh7411ka0tz	563o7s8:12h	t	00:05:00	1969-12-31 17:28:11.569-07
uk74dsudpgd94faf3n	esvo7j6mh7mna871cb	817el2k23zdp	563o7s8:12h	t	00:05:00	1969-12-31 17:28:11.569-07
uk74dsudpgd94faf3n	u1f7lki89jfb1ssu81	817el2k23zdp	563o7s8:12j	t	00:05:00	1969-12-31 17:28:12.263-07
uk74dsudpgd94faf3n	u1f7lki89jfb1ssu81	3t09dyzubc9zp	563o7s8:12j	t	00:05:00	1969-12-31 17:28:12.263-07
uk74dsudpgd94faf3n	u1f7lki89jfb1ssu81	3unh7411ka0tz	563o7s8:12j	t	00:05:00	1969-12-31 17:28:12.263-07
uk74dsudpgd94faf3n	u1f7lki89jfb1ssu81	2g43j83a271g9	563o7s8:12k	t	00:05:00	1969-12-31 17:28:26.838-07
uk74dsudpgd94faf3n	u1f7lki89jfb1ssu81	caqm13mxzbdr	563o7s8:12k	t	00:05:00	1969-12-31 17:28:26.838-07
uk74dsudpgd94faf3n	u1f7lki89jfb1ssu81	2blc6xwom46ss	563o7s8:12k	t	00:05:00	1969-12-31 17:28:26.838-07
uk74dsudpgd94faf3n	u1f7lki89jfb1ssu81	3se2qu476j7tg	563o7s8:12k	t	00:05:00	1969-12-31 17:28:26.838-07
uk74dsudpgd94faf3n	brq0hagc20b4m2r3pq	2g43j83a271g9	563o7s8:12l	t	00:05:00	1969-12-31 17:28:29.381-07
uk74dsudpgd94faf3n	brq0hagc20b4m2r3pq	caqm13mxzbdr	563o7s8:12l	t	00:05:00	1969-12-31 17:28:29.381-07
uk74dsudpgd94faf3n	brq0hagc20b4m2r3pq	2blc6xwom46ss	563o7s8:12l	t	00:05:00	1969-12-31 17:28:29.381-07
uk74dsudpgd94faf3n	brq0hagc20b4m2r3pq	3se2qu476j7tg	563o7s8:12l	t	00:05:00	1969-12-31 17:28:29.381-07
uk74dsudpgd94faf3n	imdfjoj7p2uc5o6oe0	2blc6xwom46ss	563o7s8:12m	t	00:05:00	1969-12-31 17:28:30.104-07
uk74dsudpgd94faf3n	imdfjoj7p2uc5o6oe0	2g43j83a271g9	563o7s8:12m	t	00:05:00	1969-12-31 17:28:30.104-07
uk74dsudpgd94faf3n	imdfjoj7p2uc5o6oe0	3se2qu476j7tg	563o7s8:12m	t	00:05:00	1969-12-31 17:28:30.104-07
uk74dsudpgd94faf3n	imdfjoj7p2uc5o6oe0	caqm13mxzbdr	563o7s8:12m	t	00:05:00	1969-12-31 17:28:30.104-07
uk74dsudpgd94faf3n	dfujlkp0fa82vc2t6f	2g43j83a271g9	563o7s8:12p	t	00:05:00	1969-12-31 17:28:37.596-07
uk74dsudpgd94faf3n	dfujlkp0fa82vc2t6f	caqm13mxzbdr	563o7s8:12p	t	00:05:00	1969-12-31 17:28:37.596-07
uk74dsudpgd94faf3n	dfujlkp0fa82vc2t6f	2blc6xwom46ss	563o7s8:12p	t	00:05:00	1969-12-31 17:28:37.596-07
uk74dsudpgd94faf3n	dfujlkp0fa82vc2t6f	3se2qu476j7tg	563o7s8:12p	t	00:05:00	1969-12-31 17:28:37.596-07
uk74dsudpgd94faf3n	12nukpphl4q6al7vda	2blc6xwom46ss	563o7s8:12q	t	00:05:00	1969-12-31 17:28:38.243-07
uk74dsudpgd94faf3n	12nukpphl4q6al7vda	2g43j83a271g9	563o7s8:12q	t	00:05:00	1969-12-31 17:28:38.243-07
uk74dsudpgd94faf3n	bd7f88e0kvv63tnu3i	2blc6xwom46ss	563o7s8:12s	t	00:05:00	1969-12-31 17:28:49.524-07
uk74dsudpgd94faf3n	bd7f88e0kvv63tnu3i	2g43j83a271g9	563o7s8:12s	t	00:05:00	1969-12-31 17:28:49.524-07
uk74dsudpgd94faf3n	bd7f88e0kvv63tnu3i	3se2qu476j7tg	563o7s8:12s	t	00:05:00	1969-12-31 17:28:49.524-07
uk74dsudpgd94faf3n	bd7f88e0kvv63tnu3i	caqm13mxzbdr	563o7s8:12s	t	00:05:00	1969-12-31 17:28:49.524-07
uk74dsudpgd94faf3n	12nukpphl4q6al7vda	3se2qu476j7tg	563o7s8:12q	t	00:05:00	1969-12-31 17:28:38.243-07
uk74dsudpgd94faf3n	12nukpphl4q6al7vda	caqm13mxzbdr	563o7s8:12q	t	00:05:00	1969-12-31 17:28:38.243-07
uk74dsudpgd94faf3n	jnmgb0pst9tpddh9d0	2g43j83a271g9	563o7s8:139	t	00:05:00	1969-12-31 17:30:16.075-07
uk74dsudpgd94faf3n	jnmgb0pst9tpddh9d0	caqm13mxzbdr	563o7s8:139	t	00:05:00	1969-12-31 17:30:16.075-07
uk74dsudpgd94faf3n	jnmgb0pst9tpddh9d0	2blc6xwom46ss	563o7s8:139	t	00:05:00	1969-12-31 17:30:16.075-07
uk74dsudpgd94faf3n	jnmgb0pst9tpddh9d0	3se2qu476j7tg	563o7s8:139	t	00:05:00	1969-12-31 17:30:16.075-07
uk74dsudpgd94faf3n	pfe9l2l9p2lpp8ngu5	2g43j83a271g9	563o7s8:13a	t	00:05:00	1969-12-31 17:30:36.641-07
uk74dsudpgd94faf3n	pfe9l2l9p2lpp8ngu5	caqm13mxzbdr	563o7s8:13a	t	00:05:00	1969-12-31 17:30:36.641-07
uk74dsudpgd94faf3n	pfe9l2l9p2lpp8ngu5	2blc6xwom46ss	563o7s8:13a	t	00:05:00	1969-12-31 17:30:36.641-07
uk74dsudpgd94faf3n	pfe9l2l9p2lpp8ngu5	3se2qu476j7tg	563o7s8:13a	t	00:05:00	1969-12-31 17:30:36.641-07
uk74dsudpgd94faf3n	s05k82gumghfflk2m8	2blc6xwom46ss	566ttgw:02	t	00:05:00	1969-12-31 17:31:17.428-07
uk74dsudpgd94faf3n	s05k82gumghfflk2m8	3se2qu476j7tg	566ttgw:02	t	00:05:00	1969-12-31 17:31:17.428-07
uk74dsudpgd94faf3n	s05k82gumghfflk2m8	caqm13mxzbdr	566ttgw:02	t	00:05:00	1969-12-31 17:31:17.428-07
uk74dsudpgd94faf3n	s05k82gumghfflk2m8	2g43j83a271g9	566ttgw:03	t	00:05:00	1969-12-31 17:31:21.286-07
uk74dsudpgd94faf3n	s05k82gumghfflk2m8	3t09dyzubc9zp	566ttgw:03	t	00:05:00	1969-12-31 17:31:21.286-07
uk74dsudpgd94faf3n	s05k82gumghfflk2m8	3unh7411ka0tz	566ttgw:03	t	00:05:00	1969-12-31 17:31:21.286-07
uk74dsudpgd94faf3n	s05k82gumghfflk2m8	817el2k23zdp	566ttgw:03	t	00:05:00	1969-12-31 17:31:21.286-07
uk74dsudpgd94faf3n	f609pplifl8o1uv39h	2g43j83a271g9	566ttgw:04	t	00:05:00	1969-12-31 17:31:31.473-07
uk74dsudpgd94faf3n	f609pplifl8o1uv39h	3t09dyzubc9zp	566ttgw:04	t	00:05:00	1969-12-31 17:31:31.473-07
uk74dsudpgd94faf3n	f609pplifl8o1uv39h	3unh7411ka0tz	566ttgw:04	t	00:05:00	1969-12-31 17:31:31.473-07
uk74dsudpgd94faf3n	f609pplifl8o1uv39h	817el2k23zdp	566ttgw:04	t	00:05:00	1969-12-31 17:31:31.473-07
uk74dsudpgd94faf3n	p4uj6dbf6us64ab8nj	2g43j83a271g9	566ttgw:05	t	00:05:00	1969-12-31 17:31:39.557-07
uk74dsudpgd94faf3n	p4uj6dbf6us64ab8nj	3t09dyzubc9zp	566ttgw:05	t	00:05:00	1969-12-31 17:31:39.557-07
uk74dsudpgd94faf3n	p4uj6dbf6us64ab8nj	3unh7411ka0tz	566ttgw:05	t	00:05:00	1969-12-31 17:31:39.557-07
uk74dsudpgd94faf3n	p4uj6dbf6us64ab8nj	817el2k23zdp	566ttgw:05	t	00:05:00	1969-12-31 17:31:39.557-07
uk74dsudpgd94faf3n	sn3eiju0ph79ab5eif	2g43j83a271g9	566ttgw:06	t	00:05:00	1969-12-31 17:31:46.319-07
uk74dsudpgd94faf3n	sn3eiju0ph79ab5eif	3t09dyzubc9zp	566ttgw:06	t	00:05:00	1969-12-31 17:31:46.319-07
uk74dsudpgd94faf3n	sn3eiju0ph79ab5eif	3unh7411ka0tz	566ttgw:06	t	00:05:00	1969-12-31 17:31:46.319-07
uk74dsudpgd94faf3n	sn3eiju0ph79ab5eif	817el2k23zdp	566ttgw:06	t	00:05:00	1969-12-31 17:31:46.319-07
uk74dsudpgd94faf3n	6hk5ro0c6c0ocs3sra	2g43j83a271g9	566ttgw:07	t	00:05:00	1969-12-31 17:31:47.049-07
uk74dsudpgd94faf3n	6hk5ro0c6c0ocs3sra	3t09dyzubc9zp	566ttgw:07	t	00:05:00	1969-12-31 17:31:47.049-07
uk74dsudpgd94faf3n	6hk5ro0c6c0ocs3sra	3unh7411ka0tz	566ttgw:07	t	00:05:00	1969-12-31 17:31:47.049-07
uk74dsudpgd94faf3n	6hk5ro0c6c0ocs3sra	817el2k23zdp	566ttgw:07	t	00:05:00	1969-12-31 17:31:47.049-07
uk74dsudpgd94faf3n	ec7glp359ubho75dbn	2g43j83a271g9	566ttgw:08	t	00:05:00	1969-12-31 17:31:53.682-07
uk74dsudpgd94faf3n	ec7glp359ubho75dbn	3t09dyzubc9zp	566ttgw:08	t	00:05:00	1969-12-31 17:31:53.682-07
uk74dsudpgd94faf3n	ec7glp359ubho75dbn	3unh7411ka0tz	566ttgw:08	t	00:05:00	1969-12-31 17:31:53.682-07
uk74dsudpgd94faf3n	ec7glp359ubho75dbn	817el2k23zdp	566ttgw:08	t	00:05:00	1969-12-31 17:31:53.682-07
uk74dsudpgd94faf3n	vnlgufk31qa9usa3qo	2g43j83a271g9	566ttgw:09	t	00:05:00	1969-12-31 17:32:00.627-07
uk74dsudpgd94faf3n	vnlgufk31qa9usa3qo	3t09dyzubc9zp	566ttgw:09	t	00:05:00	1969-12-31 17:32:00.627-07
uk74dsudpgd94faf3n	vnlgufk31qa9usa3qo	3unh7411ka0tz	566ttgw:09	t	00:05:00	1969-12-31 17:32:00.627-07
uk74dsudpgd94faf3n	vnlgufk31qa9usa3qo	817el2k23zdp	566ttgw:09	t	00:05:00	1969-12-31 17:32:00.627-07
uk74dsudpgd94faf3n	7f0bgmiscgvjj41ri6	2g43j83a271g9	566ttgw:0a	t	00:05:00	1969-12-31 17:32:14.985-07
uk74dsudpgd94faf3n	7f0bgmiscgvjj41ri6	3t09dyzubc9zp	566ttgw:0a	t	00:05:00	1969-12-31 17:32:14.985-07
uk74dsudpgd94faf3n	7f0bgmiscgvjj41ri6	3unh7411ka0tz	566ttgw:0a	t	00:05:00	1969-12-31 17:32:14.985-07
uk74dsudpgd94faf3n	7f0bgmiscgvjj41ri6	817el2k23zdp	566ttgw:0a	t	00:05:00	1969-12-31 17:32:14.985-07
uk74dsudpgd94faf3n	htqj14b766pt62unfe	2g43j83a271g9	566ttgw:0q	t	00:05:00	1969-12-31 17:34:07.188-07
uk74dsudpgd94faf3n	htqj14b766pt62unfe	3t09dyzubc9zp	566ttgw:0q	t	00:05:00	1969-12-31 17:34:07.188-07
uk74dsudpgd94faf3n	htqj14b766pt62unfe	3unh7411ka0tz	566ttgw:0q	t	00:05:00	1969-12-31 17:34:07.188-07
uk74dsudpgd94faf3n	htqj14b766pt62unfe	817el2k23zdp	566ttgw:0q	t	00:05:00	1969-12-31 17:34:07.188-07
uk74dsudpgd94faf3n	h47nl234fh3h9lbl91	2g43j83a271g9	566ttgw:0r	t	00:05:00	1969-12-31 17:34:15.432-07
uk74dsudpgd94faf3n	h47nl234fh3h9lbl91	3t09dyzubc9zp	566ttgw:0r	t	00:05:00	1969-12-31 17:34:15.432-07
uk74dsudpgd94faf3n	h47nl234fh3h9lbl91	3unh7411ka0tz	566ttgw:0r	t	00:05:00	1969-12-31 17:34:15.432-07
uk74dsudpgd94faf3n	h47nl234fh3h9lbl91	817el2k23zdp	566ttgw:0r	t	00:05:00	1969-12-31 17:34:15.432-07
uk74dsudpgd94faf3n	4tu8ikiktu4r4vpl47	2g43j83a271g9	566ttgw:0s	t	00:05:00	1969-12-31 17:34:17.399-07
uk74dsudpgd94faf3n	4tu8ikiktu4r4vpl47	3t09dyzubc9zp	566ttgw:0s	t	00:05:00	1969-12-31 17:34:17.399-07
uk74dsudpgd94faf3n	4tu8ikiktu4r4vpl47	3unh7411ka0tz	566ttgw:0s	t	00:05:00	1969-12-31 17:34:17.399-07
uk74dsudpgd94faf3n	4tu8ikiktu4r4vpl47	817el2k23zdp	566ttgw:0s	t	00:05:00	1969-12-31 17:34:17.399-07
uk74dsudpgd94faf3n	qf3uetqe4i1ue08bcc	2g43j83a271g9	566ttgw:0t	f	00:05:00	\N
uk74dsudpgd94faf3n	qf3uetqe4i1ue08bcc	3t09dyzubc9zp	566ttgw:0t	f	00:05:00	\N
uk74dsudpgd94faf3n	qf3uetqe4i1ue08bcc	3unh7411ka0tz	566ttgw:0t	f	00:05:00	\N
uk74dsudpgd94faf3n	qf3uetqe4i1ue08bcc	817el2k23zdp	566ttgw:0t	f	00:05:00	\N
uk74dsudpgd94faf3n	qff0c2v22u7d53ijpd	2g43j83a271g9	566ttgw:0t	t	00:05:00	1969-12-31 17:34:25.375-07
uk74dsudpgd94faf3n	qff0c2v22u7d53ijpd	3t09dyzubc9zp	566ttgw:0t	t	00:05:00	1969-12-31 17:34:25.375-07
uk74dsudpgd94faf3n	qff0c2v22u7d53ijpd	3unh7411ka0tz	566ttgw:0t	t	00:05:00	1969-12-31 17:34:25.375-07
uk74dsudpgd94faf3n	pspobk2sr48m3ljf1h	2g43j83a271g9	563o7s8:12r	t	00:05:00	1969-12-31 17:28:46.185-07
uk74dsudpgd94faf3n	pspobk2sr48m3ljf1h	caqm13mxzbdr	563o7s8:12r	t	00:05:00	1969-12-31 17:28:46.185-07
uk74dsudpgd94faf3n	pspobk2sr48m3ljf1h	2blc6xwom46ss	563o7s8:12r	t	00:05:00	1969-12-31 17:28:46.185-07
uk74dsudpgd94faf3n	pspobk2sr48m3ljf1h	3se2qu476j7tg	563o7s8:12r	t	00:05:00	1969-12-31 17:28:46.185-07
88nh1g3umqn4ia48q0	27h3i67vugqbc4js5v	2g43j83a271g9	56bncow:0l	t	00:05:00	1969-12-31 17:18:09.968-07
88nh1g3umqn4ia48q0	27h3i67vugqbc4js5v	3t09dyzubc9zp	56bncow:0l	t	00:05:00	1969-12-31 17:18:09.968-07
88nh1g3umqn4ia48q0	27h3i67vugqbc4js5v	3unh7411ka0tz	56bncow:0l	t	00:05:00	1969-12-31 17:18:09.968-07
88nh1g3umqn4ia48q0	27h3i67vugqbc4js5v	817el2k23zdp	56bncow:0l	t	00:05:00	1969-12-31 17:18:09.968-07
uk74dsudpgd94faf3n	p7bp91fq4pbqtqpa7u	2g43j83a271g9	563o7s8:12t	t	00:05:00	1969-12-31 17:29:02.23-07
uk74dsudpgd94faf3n	p7bp91fq4pbqtqpa7u	caqm13mxzbdr	563o7s8:12t	t	00:05:00	1969-12-31 17:29:02.23-07
uk74dsudpgd94faf3n	p7bp91fq4pbqtqpa7u	2blc6xwom46ss	563o7s8:12t	t	00:05:00	1969-12-31 17:29:02.23-07
uk74dsudpgd94faf3n	p7bp91fq4pbqtqpa7u	3se2qu476j7tg	563o7s8:12t	t	00:05:00	1969-12-31 17:29:02.23-07
uk74dsudpgd94faf3n	naq4moq5o1t5fk81dh	2g43j83a271g9	566ttgw:0b	t	00:05:00	1969-12-31 17:32:17.197-07
uk74dsudpgd94faf3n	naq4moq5o1t5fk81dh	3t09dyzubc9zp	566ttgw:0b	t	00:05:00	1969-12-31 17:32:17.197-07
uk74dsudpgd94faf3n	naq4moq5o1t5fk81dh	3unh7411ka0tz	566ttgw:0b	t	00:05:00	1969-12-31 17:32:17.197-07
uk74dsudpgd94faf3n	naq4moq5o1t5fk81dh	817el2k23zdp	566ttgw:0b	t	00:05:00	1969-12-31 17:32:17.197-07
uk74dsudpgd94faf3n	78i512ffoptgmko16s	2g43j83a271g9	566ttgw:0c	t	00:05:00	1969-12-31 17:32:24.371-07
uk74dsudpgd94faf3n	78i512ffoptgmko16s	3t09dyzubc9zp	566ttgw:0c	t	00:05:00	1969-12-31 17:32:24.371-07
uk74dsudpgd94faf3n	78i512ffoptgmko16s	3unh7411ka0tz	566ttgw:0c	t	00:05:00	1969-12-31 17:32:24.371-07
uk74dsudpgd94faf3n	78i512ffoptgmko16s	817el2k23zdp	566ttgw:0c	t	00:05:00	1969-12-31 17:32:24.371-07
uk74dsudpgd94faf3n	d3e7vf4cm76mjlfr2g	2g43j83a271g9	566ttgw:0d	t	00:05:00	1969-12-31 17:32:25.064-07
uk74dsudpgd94faf3n	d3e7vf4cm76mjlfr2g	3t09dyzubc9zp	566ttgw:0d	t	00:05:00	1969-12-31 17:32:25.064-07
uk74dsudpgd94faf3n	d3e7vf4cm76mjlfr2g	3unh7411ka0tz	566ttgw:0d	t	00:05:00	1969-12-31 17:32:25.064-07
uk74dsudpgd94faf3n	d3e7vf4cm76mjlfr2g	817el2k23zdp	566ttgw:0d	t	00:05:00	1969-12-31 17:32:25.064-07
uk74dsudpgd94faf3n	0fiqet9uhudinsop85	e2hz9kajle2s	566ttgw:0f	t	00:05:00	1969-12-31 17:32:34.302-07
uk74dsudpgd94faf3n	0fiqet9uhudinsop85	2g43j83a271g9	566ttgw:0g	t	00:05:00	1969-12-31 17:32:57.431-07
uk74dsudpgd94faf3n	0fiqet9uhudinsop85	3t09dyzubc9zp	566ttgw:0g	t	00:05:00	1969-12-31 17:32:57.431-07
uk74dsudpgd94faf3n	0fiqet9uhudinsop85	3unh7411ka0tz	566ttgw:0g	t	00:05:00	1969-12-31 17:32:57.431-07
uk74dsudpgd94faf3n	0fiqet9uhudinsop85	817el2k23zdp	566ttgw:0g	t	00:05:00	1969-12-31 17:32:57.431-07
uk74dsudpgd94faf3n	2rg72v51qpcdiouqam	2g43j83a271g9	566ttgw:0h	t	00:05:00	1969-12-31 17:33:04.305-07
uk74dsudpgd94faf3n	2rg72v51qpcdiouqam	3t09dyzubc9zp	566ttgw:0h	t	00:05:00	1969-12-31 17:33:04.305-07
uk74dsudpgd94faf3n	2rg72v51qpcdiouqam	3unh7411ka0tz	566ttgw:0h	t	00:05:00	1969-12-31 17:33:04.305-07
uk74dsudpgd94faf3n	2rg72v51qpcdiouqam	817el2k23zdp	566ttgw:0h	t	00:05:00	1969-12-31 17:33:04.305-07
uk74dsudpgd94faf3n	0h2fk36he6t6ilcitb	2g43j83a271g9	566ttgw:0i	t	00:05:00	1969-12-31 17:33:04.64-07
uk74dsudpgd94faf3n	0h2fk36he6t6ilcitb	3t09dyzubc9zp	566ttgw:0i	t	00:05:00	1969-12-31 17:33:04.64-07
uk74dsudpgd94faf3n	0h2fk36he6t6ilcitb	3unh7411ka0tz	566ttgw:0i	t	00:05:00	1969-12-31 17:33:04.64-07
uk74dsudpgd94faf3n	0h2fk36he6t6ilcitb	817el2k23zdp	566ttgw:0i	t	00:05:00	1969-12-31 17:33:04.64-07
uk74dsudpgd94faf3n	030h21qo29pvtgv9jr	2g43j83a271g9	566ttgw:0j	t	00:05:00	1969-12-31 17:33:14.775-07
uk74dsudpgd94faf3n	030h21qo29pvtgv9jr	3t09dyzubc9zp	566ttgw:0j	t	00:05:00	1969-12-31 17:33:14.775-07
uk74dsudpgd94faf3n	030h21qo29pvtgv9jr	3unh7411ka0tz	566ttgw:0j	t	00:05:00	1969-12-31 17:33:14.775-07
uk74dsudpgd94faf3n	030h21qo29pvtgv9jr	817el2k23zdp	566ttgw:0j	t	00:05:00	1969-12-31 17:33:14.775-07
uk74dsudpgd94faf3n	eqr61ssoa6tutfcq9p	2g43j83a271g9	566ttgw:0k	t	00:05:00	1969-12-31 17:33:24.743-07
uk74dsudpgd94faf3n	eqr61ssoa6tutfcq9p	3t09dyzubc9zp	566ttgw:0k	t	00:05:00	1969-12-31 17:33:24.743-07
uk74dsudpgd94faf3n	eqr61ssoa6tutfcq9p	3unh7411ka0tz	566ttgw:0k	t	00:05:00	1969-12-31 17:33:24.743-07
uk74dsudpgd94faf3n	eqr61ssoa6tutfcq9p	817el2k23zdp	566ttgw:0k	t	00:05:00	1969-12-31 17:33:24.743-07
uk74dsudpgd94faf3n	qff0c2v22u7d53ijpd	817el2k23zdp	566ttgw:0t	t	00:05:00	1969-12-31 17:34:25.375-07
88nh1g3umqn4ia48q0	fmsegpj0dhcru0asvn	2blc6xwom46ss	5687g3c:04	t	00:05:00	1969-12-31 17:00:00.119-07
88nh1g3umqn4ia48q0	fmsegpj0dhcru0asvn	2g43j83a271g9	5687g3c:04	t	00:05:00	1969-12-31 17:00:00.119-07
88nh1g3umqn4ia48q0	fmsegpj0dhcru0asvn	3se2qu476j7tg	5687g3c:04	t	00:05:00	1969-12-31 17:00:00.119-07
88nh1g3umqn4ia48q0	fmsegpj0dhcru0asvn	caqm13mxzbdr	5687g3c:04	t	00:05:00	1969-12-31 17:00:00.119-07
88nh1g3umqn4ia48q0	ud9ejpv6r0okfkotm6	3rnpsi5qegpt3	5687g3c:0g	t	00:05:00	1969-12-31 17:00:25.918-07
88nh1g3umqn4ia48q0	ud9ejpv6r0okfkotm6	2blc6xwom46ss	5687g3c:0i	t	00:05:00	1969-12-31 17:00:27.11-07
88nh1g3umqn4ia48q0	ud9ejpv6r0okfkotm6	3se2qu476j7tg	5687g3c:0i	t	00:05:00	1969-12-31 17:00:27.11-07
88nh1g3umqn4ia48q0	ud9ejpv6r0okfkotm6	caqm13mxzbdr	5687g3c:0i	t	00:05:00	1969-12-31 17:00:27.11-07
88nh1g3umqn4ia48q0	ud9ejpv6r0okfkotm6	2g43j83a271g9	5687g3c:0j	t	00:05:00	1969-12-31 17:00:36.26-07
88nh1g3umqn4ia48q0	ud9ejpv6r0okfkotm6	3t09dyzubc9zp	5687g3c:0j	t	00:05:00	1969-12-31 17:00:36.26-07
88nh1g3umqn4ia48q0	ud9ejpv6r0okfkotm6	3unh7411ka0tz	5687g3c:0j	t	00:05:00	1969-12-31 17:00:36.26-07
88nh1g3umqn4ia48q0	ud9ejpv6r0okfkotm6	817el2k23zdp	5687g3c:0j	t	00:05:00	1969-12-31 17:00:36.26-07
88nh1g3umqn4ia48q0	02jav6mldaen5bi573	2g43j83a271g9	5687g3c:0l	t	00:05:00	1969-12-31 17:00:36.845-07
88nh1g3umqn4ia48q0	02jav6mldaen5bi573	3t09dyzubc9zp	5687g3c:0l	t	00:05:00	1969-12-31 17:00:36.845-07
88nh1g3umqn4ia48q0	02jav6mldaen5bi573	3unh7411ka0tz	5687g3c:0l	t	00:05:00	1969-12-31 17:00:36.845-07
88nh1g3umqn4ia48q0	02jav6mldaen5bi573	817el2k23zdp	5687g3c:0l	t	00:05:00	1969-12-31 17:00:36.845-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	3unh7411ka0tz	5687g3c:0o	t	00:05:00	1969-12-31 17:00:41.901-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	3se2qu476j7tg	5687g3c:0r	t	00:05:00	1969-12-31 17:00:45.541-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	caqm13mxzbdr	5687g3c:0r	t	00:05:00	1969-12-31 17:00:45.541-07
88nh1g3umqn4ia48q0	3nmdd5d7vmgqh143f9	2g43j83a271g9	5687g3c:0t	t	00:05:00	1969-12-31 17:01:14.484-07
88nh1g3umqn4ia48q0	3nmdd5d7vmgqh143f9	gt8yfqbqc7ca	5687g3c:0t	t	00:05:00	1969-12-31 17:01:14.484-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	3t09dyzubc9zp	5687g3c:0o	t	00:05:00	1969-12-31 17:00:41.901-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	817el2k23zdp	5687g3c:0r	t	00:05:00	1969-12-31 17:00:45.541-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	1z8ikb5cnznqy	5687g3c:0s	t	00:05:00	1969-12-31 17:01:03.901-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	uizv2xjm3zqw	5687g3c:0s	t	00:05:00	1969-12-31 17:01:03.901-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	343u9rvx540f6	5687g3c:0s	t	00:05:00	1969-12-31 17:01:03.901-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	351uuya4pj2ql	5687g3c:0s	t	00:05:00	1969-12-31 17:01:03.901-07
88nh1g3umqn4ia48q0	34p6khmg6kgggq3c6k	2g43j83a271g9	56bncow:0m	t	00:05:00	1969-12-31 17:18:17.619-07
88nh1g3umqn4ia48q0	34p6khmg6kgggq3c6k	3t09dyzubc9zp	56bncow:0m	t	00:05:00	1969-12-31 17:18:17.619-07
88nh1g3umqn4ia48q0	34p6khmg6kgggq3c6k	3unh7411ka0tz	56bncow:0m	t	00:05:00	1969-12-31 17:18:17.619-07
88nh1g3umqn4ia48q0	34p6khmg6kgggq3c6k	817el2k23zdp	56bncow:0m	t	00:05:00	1969-12-31 17:18:17.619-07
88nh1g3umqn4ia48q0	4b2shk9h9eanc0uhnf	2g43j83a271g9	56bncow:0n	t	00:05:00	1969-12-31 17:18:24.132-07
88nh1g3umqn4ia48q0	4b2shk9h9eanc0uhnf	3t09dyzubc9zp	56bncow:0n	t	00:05:00	1969-12-31 17:18:24.132-07
88nh1g3umqn4ia48q0	4b2shk9h9eanc0uhnf	3unh7411ka0tz	56bncow:0n	t	00:05:00	1969-12-31 17:18:24.132-07
88nh1g3umqn4ia48q0	4b2shk9h9eanc0uhnf	817el2k23zdp	56bncow:0n	t	00:05:00	1969-12-31 17:18:24.132-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	2g43j83a271g9	5687g3c:0s	t	00:05:00	1969-12-31 17:01:03.901-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	gt8yfqbqc7ca	5687g3c:0s	t	00:05:00	1969-12-31 17:01:03.901-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	2blc6xwom46ss	5687g3c:0s	t	00:05:00	1969-12-31 17:01:03.901-07
88nh1g3umqn4ia48q0	4pr3t0o00ga19phf55	3rnpsi5qegpt3	5687g3c:0s	t	00:05:00	1969-12-31 17:01:03.901-07
88nh1g3umqn4ia48q0	3nmdd5d7vmgqh143f9	2blc6xwom46ss	5687g3c:0t	t	00:05:00	1969-12-31 17:01:14.484-07
88nh1g3umqn4ia48q0	3nmdd5d7vmgqh143f9	3rnpsi5qegpt3	5687g3c:0t	t	00:05:00	1969-12-31 17:01:14.484-07
88nh1g3umqn4ia48q0	3nmdd5d7vmgqh143f9	1z8ikb5cnznqy	5687g3c:0t	t	00:05:00	1969-12-31 17:01:14.484-07
88nh1g3umqn4ia48q0	3nmdd5d7vmgqh143f9	uizv2xjm3zqw	5687g3c:0t	t	00:05:00	1969-12-31 17:01:14.484-07
88nh1g3umqn4ia48q0	3nmdd5d7vmgqh143f9	343u9rvx540f6	5687g3c:0t	t	00:05:00	1969-12-31 17:01:14.484-07
88nh1g3umqn4ia48q0	3nmdd5d7vmgqh143f9	351uuya4pj2ql	5687g3c:0t	t	00:05:00	1969-12-31 17:01:14.484-07
88nh1g3umqn4ia48q0	2o2k5nm26gk546pc6e	1z8ikb5cnznqy	5687g3c:0u	t	00:05:00	1969-12-31 17:01:15.018-07
88nh1g3umqn4ia48q0	2o2k5nm26gk546pc6e	2blc6xwom46ss	5687g3c:0u	t	00:05:00	1969-12-31 17:01:15.018-07
88nh1g3umqn4ia48q0	2o2k5nm26gk546pc6e	2g43j83a271g9	5687g3c:0u	t	00:05:00	1969-12-31 17:01:15.018-07
88nh1g3umqn4ia48q0	2o2k5nm26gk546pc6e	343u9rvx540f6	5687g3c:0u	t	00:05:00	1969-12-31 17:01:15.018-07
88nh1g3umqn4ia48q0	2o2k5nm26gk546pc6e	351uuya4pj2ql	5687g3c:0u	t	00:05:00	1969-12-31 17:01:15.018-07
88nh1g3umqn4ia48q0	2o2k5nm26gk546pc6e	3rnpsi5qegpt3	5687g3c:0u	t	00:05:00	1969-12-31 17:01:15.018-07
88nh1g3umqn4ia48q0	2o2k5nm26gk546pc6e	gt8yfqbqc7ca	5687g3c:0u	t	00:05:00	1969-12-31 17:01:15.018-07
88nh1g3umqn4ia48q0	2o2k5nm26gk546pc6e	uizv2xjm3zqw	5687g3c:0u	t	00:05:00	1969-12-31 17:01:15.018-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	gt8yfqbqc7ca	5687g3c:0w	t	00:05:00	1969-12-31 17:01:17.024-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	uizv2xjm3zqw	5687g3c:0w	t	00:05:00	1969-12-31 17:01:17.024-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	3rnpsi5qegpt3	5687g3c:0w	t	00:05:00	1969-12-31 17:01:17.024-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	1z8ikb5cnznqy	5687g3c:0w	t	00:05:00	1969-12-31 17:01:17.024-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	343u9rvx540f6	5687g3c:0w	t	00:05:00	1969-12-31 17:01:17.024-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	351uuya4pj2ql	5687g3c:0w	t	00:05:00	1969-12-31 17:01:17.024-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	2blc6xwom46ss	5687g3c:0x	t	00:05:00	1969-12-31 17:01:18.051-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	2g43j83a271g9	5687g3c:0x	t	00:05:00	1969-12-31 17:01:18.051-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	3se2qu476j7tg	5687g3c:0x	t	00:05:00	1969-12-31 17:01:18.051-07
88nh1g3umqn4ia48q0	f5d43mjlmnvcdnfk6e	caqm13mxzbdr	5687g3c:0x	t	00:05:00	1969-12-31 17:01:18.051-07
88nh1g3umqn4ia48q0	kvtirummsmmh5sv6vj	2blc6xwom46ss	5687g3c:110	t	00:05:00	1969-12-31 17:01:21.408-07
88nh1g3umqn4ia48q0	kvtirummsmmh5sv6vj	3se2qu476j7tg	5687g3c:110	t	00:05:00	1969-12-31 17:01:21.408-07
88nh1g3umqn4ia48q0	kvtirummsmmh5sv6vj	caqm13mxzbdr	5687g3c:110	t	00:05:00	1969-12-31 17:01:21.408-07
88nh1g3umqn4ia48q0	kvtirummsmmh5sv6vj	2g43j83a271g9	5687g3c:111	t	00:05:00	1969-12-31 17:01:47.229-07
88nh1g3umqn4ia48q0	kvtirummsmmh5sv6vj	3t09dyzubc9zp	5687g3c:111	t	00:05:00	1969-12-31 17:01:47.229-07
88nh1g3umqn4ia48q0	kvtirummsmmh5sv6vj	3unh7411ka0tz	5687g3c:111	t	00:05:00	1969-12-31 17:01:47.229-07
88nh1g3umqn4ia48q0	kvtirummsmmh5sv6vj	817el2k23zdp	5687g3c:111	t	00:05:00	1969-12-31 17:01:47.229-07
88nh1g3umqn4ia48q0	t9cud0se38qc0tsc90	2g43j83a271g9	5687g3c:112	t	00:05:00	1969-12-31 17:01:47.897-07
88nh1g3umqn4ia48q0	t9cud0se38qc0tsc90	3t09dyzubc9zp	5687g3c:112	t	00:05:00	1969-12-31 17:01:47.897-07
88nh1g3umqn4ia48q0	t9cud0se38qc0tsc90	3unh7411ka0tz	5687g3c:112	t	00:05:00	1969-12-31 17:01:47.897-07
88nh1g3umqn4ia48q0	t9cud0se38qc0tsc90	817el2k23zdp	5687g3c:112	t	00:05:00	1969-12-31 17:01:47.897-07
88nh1g3umqn4ia48q0	unn0hlkldvi143vi6j	2g43j83a271g9	5687g3c:119	t	00:05:00	1969-12-31 17:02:21.281-07
88nh1g3umqn4ia48q0	unn0hlkldvi143vi6j	3t09dyzubc9zp	5687g3c:119	t	00:05:00	1969-12-31 17:02:21.281-07
88nh1g3umqn4ia48q0	unn0hlkldvi143vi6j	3unh7411ka0tz	5687g3c:119	t	00:05:00	1969-12-31 17:02:21.281-07
88nh1g3umqn4ia48q0	unn0hlkldvi143vi6j	817el2k23zdp	5687g3c:119	t	00:05:00	1969-12-31 17:02:21.281-07
88nh1g3umqn4ia48q0	tms41r02c872jtf7po	2g43j83a271g9	5687g3c:11a	t	00:05:00	1969-12-31 17:02:21.82-07
88nh1g3umqn4ia48q0	tms41r02c872jtf7po	3t09dyzubc9zp	5687g3c:11a	t	00:05:00	1969-12-31 17:02:21.82-07
88nh1g3umqn4ia48q0	tms41r02c872jtf7po	3unh7411ka0tz	5687g3c:11a	t	00:05:00	1969-12-31 17:02:21.82-07
88nh1g3umqn4ia48q0	tms41r02c872jtf7po	817el2k23zdp	5687g3c:11a	t	00:05:00	1969-12-31 17:02:21.82-07
88nh1g3umqn4ia48q0	tbatlgl4oe8b1lhas3	2g43j83a271g9	5687g3c:11b	t	00:05:00	1969-12-31 17:02:31.043-07
88nh1g3umqn4ia48q0	tbatlgl4oe8b1lhas3	3t09dyzubc9zp	5687g3c:11b	t	00:05:00	1969-12-31 17:02:31.043-07
88nh1g3umqn4ia48q0	tbatlgl4oe8b1lhas3	3unh7411ka0tz	5687g3c:11b	t	00:05:00	1969-12-31 17:02:31.043-07
88nh1g3umqn4ia48q0	tbatlgl4oe8b1lhas3	817el2k23zdp	5687g3c:11b	t	00:05:00	1969-12-31 17:02:31.043-07
88nh1g3umqn4ia48q0	leqlj4drl3698trnca	817el2k23zdp	5687g3c:11c	t	00:05:00	1969-12-31 17:02:31.714-07
88nh1g3umqn4ia48q0	leqlj4drl3698trnca	2g43j83a271g9	5687g3c:11d	t	00:05:00	1969-12-31 17:02:36.436-07
88nh1g3umqn4ia48q0	leqlj4drl3698trnca	3t09dyzubc9zp	5687g3c:11d	t	00:05:00	1969-12-31 17:02:36.436-07
88nh1g3umqn4ia48q0	leqlj4drl3698trnca	3unh7411ka0tz	5687g3c:11d	t	00:05:00	1969-12-31 17:02:36.436-07
88nh1g3umqn4ia48q0	pkem1fj5345gn48egp	2g43j83a271g9	5687g3c:11e	t	00:05:00	1969-12-31 17:02:36.993-07
88nh1g3umqn4ia48q0	pkem1fj5345gn48egp	3t09dyzubc9zp	5687g3c:11e	t	00:05:00	1969-12-31 17:02:36.993-07
88nh1g3umqn4ia48q0	pkem1fj5345gn48egp	3unh7411ka0tz	5687g3c:11e	t	00:05:00	1969-12-31 17:02:36.993-07
88nh1g3umqn4ia48q0	8ejmpg24orsudhr3i5	2g43j83a271g9	5687g3c:11f	t	00:05:00	1969-12-31 17:02:48.797-07
88nh1g3umqn4ia48q0	8ejmpg24orsudhr3i5	3t09dyzubc9zp	5687g3c:11f	t	00:05:00	1969-12-31 17:02:48.797-07
88nh1g3umqn4ia48q0	4i1c4f0omsghvtvk6d	2g43j83a271g9	5687g3c:11g	t	00:05:00	1969-12-31 17:03:00.732-07
88nh1g3umqn4ia48q0	4i1c4f0omsghvtvk6d	3t09dyzubc9zp	5687g3c:11g	t	00:05:00	1969-12-31 17:03:00.732-07
88nh1g3umqn4ia48q0	4i1c4f0omsghvtvk6d	3unh7411ka0tz	5687g3c:11g	t	00:05:00	1969-12-31 17:03:00.732-07
88nh1g3umqn4ia48q0	8ejmpg24orsudhr3i5	3unh7411ka0tz	5687g3c:11f	t	00:05:00	1969-12-31 17:02:48.797-07
88nh1g3umqn4ia48q0	sfsktf6embntcghg0b	2g43j83a271g9	56bncow:0o	f	00:05:00	\N
88nh1g3umqn4ia48q0	sfsktf6embntcghg0b	3t09dyzubc9zp	56bncow:0o	f	00:05:00	\N
88nh1g3umqn4ia48q0	sfsktf6embntcghg0b	3unh7411ka0tz	56bncow:0o	f	00:05:00	\N
88nh1g3umqn4ia48q0	4foq3b3dqbgkalbsk8	2g43j83a271g9	5687g3c:11h	t	00:05:00	1969-12-31 17:03:01.616-07
88nh1g3umqn4ia48q0	4foq3b3dqbgkalbsk8	3t09dyzubc9zp	5687g3c:11h	t	00:05:00	1969-12-31 17:03:01.616-07
88nh1g3umqn4ia48q0	4foq3b3dqbgkalbsk8	3unh7411ka0tz	5687g3c:11h	t	00:05:00	1969-12-31 17:03:01.616-07
88nh1g3umqn4ia48q0	nc3lmbb64uk753ucah	2g43j83a271g9	5687g3c:11i	t	00:05:00	1969-12-31 17:03:11.091-07
88nh1g3umqn4ia48q0	nc3lmbb64uk753ucah	3t09dyzubc9zp	5687g3c:11i	t	00:05:00	1969-12-31 17:03:11.091-07
88nh1g3umqn4ia48q0	nc3lmbb64uk753ucah	3unh7411ka0tz	5687g3c:11i	t	00:05:00	1969-12-31 17:03:11.091-07
88nh1g3umqn4ia48q0	sim93npot749di2lpg	2g43j83a271g9	5687g3c:11j	t	00:05:00	1969-12-31 17:03:17.695-07
88nh1g3umqn4ia48q0	sim93npot749di2lpg	3t09dyzubc9zp	5687g3c:11j	t	00:05:00	1969-12-31 17:03:17.695-07
88nh1g3umqn4ia48q0	sim93npot749di2lpg	3unh7411ka0tz	5687g3c:11j	t	00:05:00	1969-12-31 17:03:17.695-07
88nh1g3umqn4ia48q0	e2l9pg9acahbcpjl69	2g43j83a271g9	5687g3c:11k	t	00:05:00	1969-12-31 17:03:32.038-07
88nh1g3umqn4ia48q0	e2l9pg9acahbcpjl69	3t09dyzubc9zp	5687g3c:11k	t	00:05:00	1969-12-31 17:03:32.038-07
88nh1g3umqn4ia48q0	e2l9pg9acahbcpjl69	3unh7411ka0tz	5687g3c:11k	t	00:05:00	1969-12-31 17:03:32.038-07
88nh1g3umqn4ia48q0	utqp7jn5qp5vhgqv9d	2g43j83a271g9	5687g3c:11l	t	00:05:00	1969-12-31 17:03:42.041-07
88nh1g3umqn4ia48q0	utqp7jn5qp5vhgqv9d	3t09dyzubc9zp	5687g3c:11l	t	00:05:00	1969-12-31 17:03:42.041-07
88nh1g3umqn4ia48q0	utqp7jn5qp5vhgqv9d	3unh7411ka0tz	5687g3c:11l	t	00:05:00	1969-12-31 17:03:42.041-07
88nh1g3umqn4ia48q0	qbir6a80n53bicv966	2g43j83a271g9	569f6ls:01	t	00:05:00	1969-12-31 17:04:28.708-07
88nh1g3umqn4ia48q0	qbir6a80n53bicv966	3t09dyzubc9zp	569f6ls:01	t	00:05:00	1969-12-31 17:04:28.708-07
88nh1g3umqn4ia48q0	qbir6a80n53bicv966	3unh7411ka0tz	569f6ls:01	t	00:05:00	1969-12-31 17:04:28.708-07
88nh1g3umqn4ia48q0	qbir6a80n53bicv966	817el2k23zdp	569f6ls:01	t	00:05:00	1969-12-31 17:04:28.708-07
88nh1g3umqn4ia48q0	becjutga722b3llbt3	2g43j83a271g9	569f6ls:04	t	00:05:00	1969-12-31 17:05:14.293-07
88nh1g3umqn4ia48q0	becjutga722b3llbt3	3t09dyzubc9zp	569f6ls:04	t	00:05:00	1969-12-31 17:05:14.293-07
88nh1g3umqn4ia48q0	becjutga722b3llbt3	3unh7411ka0tz	569f6ls:04	t	00:05:00	1969-12-31 17:05:14.293-07
88nh1g3umqn4ia48q0	becjutga722b3llbt3	817el2k23zdp	569f6ls:04	t	00:05:00	1969-12-31 17:05:14.293-07
88nh1g3umqn4ia48q0	e4co4neh1921u6epag	2g43j83a271g9	569f6ls:05	t	00:05:00	1969-12-31 17:05:59.443-07
88nh1g3umqn4ia48q0	e4co4neh1921u6epag	3t09dyzubc9zp	569f6ls:05	t	00:05:00	1969-12-31 17:05:59.443-07
88nh1g3umqn4ia48q0	e4co4neh1921u6epag	3unh7411ka0tz	569f6ls:05	t	00:05:00	1969-12-31 17:05:59.443-07
88nh1g3umqn4ia48q0	e4co4neh1921u6epag	817el2k23zdp	569f6ls:05	t	00:05:00	1969-12-31 17:05:59.443-07
88nh1g3umqn4ia48q0	ciak1jblqct6n4a5qb	2g43j83a271g9	569f6ls:06	t	00:05:00	1969-12-31 17:05:59.522-07
88nh1g3umqn4ia48q0	ciak1jblqct6n4a5qb	3t09dyzubc9zp	569f6ls:06	t	00:05:00	1969-12-31 17:05:59.522-07
88nh1g3umqn4ia48q0	ciak1jblqct6n4a5qb	3unh7411ka0tz	569f6ls:06	t	00:05:00	1969-12-31 17:05:59.522-07
88nh1g3umqn4ia48q0	ciak1jblqct6n4a5qb	817el2k23zdp	569f6ls:06	t	00:05:00	1969-12-31 17:05:59.522-07
88nh1g3umqn4ia48q0	pjkg8ad476f4ei3pim	817el2k23zdp	569f6ls:07	t	00:05:00	1969-12-31 17:06:01.062-07
88nh1g3umqn4ia48q0	pjkg8ad476f4ei3pim	2g43j83a271g9	569f6ls:08	t	00:05:00	1969-12-31 17:06:04.505-07
88nh1g3umqn4ia48q0	pjkg8ad476f4ei3pim	3t09dyzubc9zp	569f6ls:08	t	00:05:00	1969-12-31 17:06:04.505-07
88nh1g3umqn4ia48q0	pjkg8ad476f4ei3pim	3unh7411ka0tz	569f6ls:08	t	00:05:00	1969-12-31 17:06:04.505-07
88nh1g3umqn4ia48q0	prelrg04aqtmm5q6h6	2g43j83a271g9	569f6ls:0b	t	00:05:00	1969-12-31 17:06:17.368-07
88nh1g3umqn4ia48q0	prelrg04aqtmm5q6h6	3t09dyzubc9zp	569f6ls:0b	t	00:05:00	1969-12-31 17:06:17.368-07
88nh1g3umqn4ia48q0	prelrg04aqtmm5q6h6	3unh7411ka0tz	569f6ls:0b	t	00:05:00	1969-12-31 17:06:17.368-07
88nh1g3umqn4ia48q0	fts8ef19he2t33ucvm	2g43j83a271g9	569f6ls:0d	t	00:05:00	1969-12-31 17:06:27.59-07
88nh1g3umqn4ia48q0	fts8ef19he2t33ucvm	3t09dyzubc9zp	569f6ls:0d	t	00:05:00	1969-12-31 17:06:27.59-07
88nh1g3umqn4ia48q0	fts8ef19he2t33ucvm	3unh7411ka0tz	569f6ls:0d	t	00:05:00	1969-12-31 17:06:27.59-07
88nh1g3umqn4ia48q0	vj5vit0arv3mp32v1r	e2hz9kajle2s	569f6ls:0n	t	00:05:00	1969-12-31 17:06:49.358-07
88nh1g3umqn4ia48q0	vj5vit0arv3mp32v1r	2g43j83a271g9	569f6ls:0o	t	00:05:00	1969-12-31 17:06:57.416-07
88nh1g3umqn4ia48q0	vj5vit0arv3mp32v1r	3t09dyzubc9zp	569f6ls:0o	t	00:05:00	1969-12-31 17:06:57.416-07
88nh1g3umqn4ia48q0	vj5vit0arv3mp32v1r	3unh7411ka0tz	569f6ls:0o	t	00:05:00	1969-12-31 17:06:57.416-07
88nh1g3umqn4ia48q0	vj5vit0arv3mp32v1r	817el2k23zdp	569f6ls:0o	t	00:05:00	1969-12-31 17:06:57.416-07
88nh1g3umqn4ia48q0	n138kkpp7mo10ee0dd	2g43j83a271g9	569f6ls:0p	t	00:05:00	1969-12-31 17:06:57.923-07
88nh1g3umqn4ia48q0	n138kkpp7mo10ee0dd	3t09dyzubc9zp	569f6ls:0p	t	00:05:00	1969-12-31 17:06:57.923-07
88nh1g3umqn4ia48q0	n138kkpp7mo10ee0dd	3unh7411ka0tz	569f6ls:0p	t	00:05:00	1969-12-31 17:06:57.923-07
88nh1g3umqn4ia48q0	n138kkpp7mo10ee0dd	817el2k23zdp	569f6ls:0p	t	00:05:00	1969-12-31 17:06:57.923-07
88nh1g3umqn4ia48q0	segm04cgb43ir1l514	2g43j83a271g9	569f6ls:0s	t	00:05:00	1969-12-31 17:07:12.768-07
88nh1g3umqn4ia48q0	segm04cgb43ir1l514	3t09dyzubc9zp	569f6ls:0s	t	00:05:00	1969-12-31 17:07:12.768-07
88nh1g3umqn4ia48q0	segm04cgb43ir1l514	3unh7411ka0tz	569f6ls:0s	t	00:05:00	1969-12-31 17:07:12.768-07
88nh1g3umqn4ia48q0	segm04cgb43ir1l514	817el2k23zdp	569f6ls:0s	t	00:05:00	1969-12-31 17:07:12.768-07
88nh1g3umqn4ia48q0	15vovggackulaosh7a	817el2k23zdp	56aednc:01	t	00:05:00	1969-12-31 17:07:21.176-07
88nh1g3umqn4ia48q0	15vovggackulaosh7a	2g43j83a271g9	56aednc:02	t	00:05:00	1969-12-31 17:07:30.212-07
88nh1g3umqn4ia48q0	15vovggackulaosh7a	3t09dyzubc9zp	56aednc:02	t	00:05:00	1969-12-31 17:07:30.212-07
88nh1g3umqn4ia48q0	15vovggackulaosh7a	3unh7411ka0tz	56aednc:02	t	00:05:00	1969-12-31 17:07:30.212-07
88nh1g3umqn4ia48q0	81ktqag4udp9olh8to	2g43j83a271g9	56aednc:03	t	00:05:00	1969-12-31 17:07:30.828-07
88nh1g3umqn4ia48q0	81ktqag4udp9olh8to	3t09dyzubc9zp	56aednc:03	t	00:05:00	1969-12-31 17:07:30.828-07
88nh1g3umqn4ia48q0	81ktqag4udp9olh8to	3unh7411ka0tz	56aednc:03	t	00:05:00	1969-12-31 17:07:30.828-07
88nh1g3umqn4ia48q0	lrs7ufi9g76h0lucql	2g43j83a271g9	56aednc:05	t	00:05:00	1969-12-31 17:07:58.023-07
88nh1g3umqn4ia48q0	sfsktf6embntcghg0b	817el2k23zdp	56bncow:0o	f	00:05:00	\N
88nh1g3umqn4ia48q0	sar1kj3r7tubk3qrs3	3unh7411ka0tz	56aednc:04	t	00:05:00	1969-12-31 17:07:49.919-07
88nh1g3umqn4ia48q0	mnjlbaqkpm11db25o2	2g43j83a271g9	56bncow:0o	t	00:05:00	1969-12-31 17:18:24.733-07
88nh1g3umqn4ia48q0	mnjlbaqkpm11db25o2	3t09dyzubc9zp	56bncow:0o	t	00:05:00	1969-12-31 17:18:24.733-07
88nh1g3umqn4ia48q0	mnjlbaqkpm11db25o2	3unh7411ka0tz	56bncow:0o	t	00:05:00	1969-12-31 17:18:24.733-07
88nh1g3umqn4ia48q0	l9o59sm80ars4dhj2a	2g43j83a271g9	56aednc:08	t	00:05:00	1969-12-31 17:08:23.424-07
88nh1g3umqn4ia48q0	l9o59sm80ars4dhj2a	3t09dyzubc9zp	56aednc:08	t	00:05:00	1969-12-31 17:08:23.424-07
88nh1g3umqn4ia48q0	l9o59sm80ars4dhj2a	3unh7411ka0tz	56aednc:08	t	00:05:00	1969-12-31 17:08:23.424-07
88nh1g3umqn4ia48q0	mnjlbaqkpm11db25o2	817el2k23zdp	56bncow:0o	t	00:05:00	1969-12-31 17:18:24.733-07
88nh1g3umqn4ia48q0	sar1kj3r7tubk3qrs3	2g43j83a271g9	56aednc:04	t	00:05:00	1969-12-31 17:07:49.919-07
88nh1g3umqn4ia48q0	sar1kj3r7tubk3qrs3	3t09dyzubc9zp	56aednc:04	t	00:05:00	1969-12-31 17:07:49.919-07
88nh1g3umqn4ia48q0	lrs7ufi9g76h0lucql	3t09dyzubc9zp	56aednc:05	t	00:05:00	1969-12-31 17:07:58.023-07
88nh1g3umqn4ia48q0	lrs7ufi9g76h0lucql	3unh7411ka0tz	56aednc:05	t	00:05:00	1969-12-31 17:07:58.023-07
88nh1g3umqn4ia48q0	73lqkdbl0qu8v84eh7	2g43j83a271g9	56aednc:06	t	00:05:00	1969-12-31 17:08:08.404-07
88nh1g3umqn4ia48q0	73lqkdbl0qu8v84eh7	3t09dyzubc9zp	56aednc:06	t	00:05:00	1969-12-31 17:08:08.404-07
88nh1g3umqn4ia48q0	73lqkdbl0qu8v84eh7	3unh7411ka0tz	56aednc:06	t	00:05:00	1969-12-31 17:08:08.404-07
88nh1g3umqn4ia48q0	8ldenjq2i9a8loasgn	2g43j83a271g9	56aednc:07	t	00:05:00	1969-12-31 17:08:09.031-07
88nh1g3umqn4ia48q0	8ldenjq2i9a8loasgn	3t09dyzubc9zp	56aednc:07	t	00:05:00	1969-12-31 17:08:09.031-07
88nh1g3umqn4ia48q0	8ldenjq2i9a8loasgn	3unh7411ka0tz	56aednc:07	t	00:05:00	1969-12-31 17:08:09.031-07
88nh1g3umqn4ia48q0	p459bevej9u7est219	2zrt25uo1nmxy	56aednc:0b	t	00:05:00	1969-12-31 17:08:26.343-07
88nh1g3umqn4ia48q0	p459bevej9u7est219	213g7dw9zr8d1	56aednc:0f	t	00:05:00	1969-12-31 17:08:30.401-07
88nh1g3umqn4ia48q0	p459bevej9u7est219	817el2k23zdp	56aednc:0g	t	00:05:00	1969-12-31 17:08:31.297-07
88nh1g3umqn4ia48q0	p459bevej9u7est219	2g43j83a271g9	56aednc:0h	t	00:05:00	1969-12-31 17:08:39.41-07
88nh1g3umqn4ia48q0	p459bevej9u7est219	3t09dyzubc9zp	56aednc:0h	t	00:05:00	1969-12-31 17:08:39.41-07
88nh1g3umqn4ia48q0	p459bevej9u7est219	3unh7411ka0tz	56aednc:0h	t	00:05:00	1969-12-31 17:08:39.41-07
88nh1g3umqn4ia48q0	5dfiutusosatb4des2	2g43j83a271g9	56aednc:0i	t	00:05:00	1969-12-31 17:09:08.249-07
88nh1g3umqn4ia48q0	5dfiutusosatb4des2	3t09dyzubc9zp	56aednc:0i	t	00:05:00	1969-12-31 17:09:08.249-07
88nh1g3umqn4ia48q0	5dfiutusosatb4des2	3unh7411ka0tz	56aednc:0i	t	00:05:00	1969-12-31 17:09:08.249-07
88nh1g3umqn4ia48q0	ij1rhqihvskj3dmu9i	2g43j83a271g9	56aednc:0j	t	00:05:00	1969-12-31 17:09:08.895-07
88nh1g3umqn4ia48q0	ij1rhqihvskj3dmu9i	3t09dyzubc9zp	56aednc:0j	t	00:05:00	1969-12-31 17:09:08.895-07
88nh1g3umqn4ia48q0	ij1rhqihvskj3dmu9i	3unh7411ka0tz	56aednc:0j	t	00:05:00	1969-12-31 17:09:08.895-07
88nh1g3umqn4ia48q0	0n14sbpj3bguu63qsg	qkrcav8v0rkn	56aednc:0n	t	00:05:00	1969-12-31 17:09:12.301-07
88nh1g3umqn4ia48q0	0n14sbpj3bguu63qsg	2zrt25uo1nmxy	56aednc:0q	t	00:05:00	1969-12-31 17:09:16.244-07
88nh1g3umqn4ia48q0	0n14sbpj3bguu63qsg	2g43j83a271g9	56aednc:0s	t	00:05:00	1969-12-31 17:09:24.216-07
88nh1g3umqn4ia48q0	0n14sbpj3bguu63qsg	3t09dyzubc9zp	56aednc:0s	t	00:05:00	1969-12-31 17:09:24.216-07
88nh1g3umqn4ia48q0	0n14sbpj3bguu63qsg	3unh7411ka0tz	56aednc:0s	t	00:05:00	1969-12-31 17:09:24.216-07
88nh1g3umqn4ia48q0	0n14sbpj3bguu63qsg	817el2k23zdp	56aednc:0s	t	00:05:00	1969-12-31 17:09:24.216-07
88nh1g3umqn4ia48q0	6k28037bjqkjevb3lc	2g43j83a271g9	56aednc:0t	t	00:05:00	1969-12-31 17:09:24.852-07
88nh1g3umqn4ia48q0	6k28037bjqkjevb3lc	3t09dyzubc9zp	56aednc:0t	t	00:05:00	1969-12-31 17:09:24.852-07
88nh1g3umqn4ia48q0	6k28037bjqkjevb3lc	3unh7411ka0tz	56aednc:0t	t	00:05:00	1969-12-31 17:09:24.852-07
88nh1g3umqn4ia48q0	6k28037bjqkjevb3lc	817el2k23zdp	56aednc:0t	t	00:05:00	1969-12-31 17:09:24.852-07
88nh1g3umqn4ia48q0	uuigjoj29dpmtalhsp	817el2k23zdp	56aednc:0u	t	00:05:00	1969-12-31 17:09:25.698-07
88nh1g3umqn4ia48q0	uuigjoj29dpmtalhsp	2g43j83a271g9	56auau8:01	t	00:05:00	1969-12-31 17:09:54.385-07
88nh1g3umqn4ia48q0	uuigjoj29dpmtalhsp	3t09dyzubc9zp	56auau8:01	t	00:05:00	1969-12-31 17:09:54.385-07
88nh1g3umqn4ia48q0	uuigjoj29dpmtalhsp	3unh7411ka0tz	56auau8:01	t	00:05:00	1969-12-31 17:09:54.385-07
88nh1g3umqn4ia48q0	33csrm0ck95qrpb1km	2g43j83a271g9	56auau8:03	t	00:05:00	1969-12-31 17:10:40.378-07
88nh1g3umqn4ia48q0	33csrm0ck95qrpb1km	3t09dyzubc9zp	56auau8:03	t	00:05:00	1969-12-31 17:10:40.378-07
88nh1g3umqn4ia48q0	33csrm0ck95qrpb1km	3unh7411ka0tz	56auau8:03	t	00:05:00	1969-12-31 17:10:40.378-07
88nh1g3umqn4ia48q0	33csrm0ck95qrpb1km	817el2k23zdp	56auau8:03	t	00:05:00	1969-12-31 17:10:40.378-07
88nh1g3umqn4ia48q0	33csrm0ck95qrpb1km	qkrcav8v0rkn	56auau8:03	t	00:05:00	1969-12-31 17:10:40.378-07
88nh1g3umqn4ia48q0	2dngfhe13l1cvf97a3	817el2k23zdp	56auau8:04	t	00:05:00	1969-12-31 17:10:41.289-07
88nh1g3umqn4ia48q0	2dngfhe13l1cvf97a3	qkrcav8v0rkn	56auau8:04	t	00:05:00	1969-12-31 17:10:41.289-07
88nh1g3umqn4ia48q0	2dngfhe13l1cvf97a3	2g43j83a271g9	56auau8:05	t	00:05:00	1969-12-31 17:11:13.348-07
88nh1g3umqn4ia48q0	2dngfhe13l1cvf97a3	3t09dyzubc9zp	56auau8:05	t	00:05:00	1969-12-31 17:11:13.348-07
88nh1g3umqn4ia48q0	2dngfhe13l1cvf97a3	3unh7411ka0tz	56auau8:05	t	00:05:00	1969-12-31 17:11:13.348-07
88nh1g3umqn4ia48q0	kr6tnl3rpb9e001reu	2g43j83a271g9	56auau8:06	t	00:05:00	1969-12-31 17:11:13.974-07
88nh1g3umqn4ia48q0	kr6tnl3rpb9e001reu	3t09dyzubc9zp	56auau8:06	t	00:05:00	1969-12-31 17:11:13.974-07
88nh1g3umqn4ia48q0	kr6tnl3rpb9e001reu	3unh7411ka0tz	56auau8:06	t	00:05:00	1969-12-31 17:11:13.974-07
88nh1g3umqn4ia48q0	gnt6d9nihm37ll0oq4	2g43j83a271g9	56auau8:07	t	00:05:00	1969-12-31 17:11:19.435-07
88nh1g3umqn4ia48q0	gnt6d9nihm37ll0oq4	3t09dyzubc9zp	56auau8:07	t	00:05:00	1969-12-31 17:11:19.435-07
88nh1g3umqn4ia48q0	gnt6d9nihm37ll0oq4	3unh7411ka0tz	56auau8:07	t	00:05:00	1969-12-31 17:11:19.435-07
88nh1g3umqn4ia48q0	m8u4o4ib30l29v4orn	2g43j83a271g9	56auau8:08	t	00:05:00	1969-12-31 17:11:26.172-07
88nh1g3umqn4ia48q0	m8u4o4ib30l29v4orn	3t09dyzubc9zp	56auau8:08	t	00:05:00	1969-12-31 17:11:26.172-07
88nh1g3umqn4ia48q0	m8u4o4ib30l29v4orn	3unh7411ka0tz	56auau8:08	t	00:05:00	1969-12-31 17:11:26.172-07
88nh1g3umqn4ia48q0	gklomm7php8m8k38ho	2g43j83a271g9	56auau8:09	t	00:05:00	1969-12-31 17:11:26.893-07
88nh1g3umqn4ia48q0	gklomm7php8m8k38ho	3t09dyzubc9zp	56auau8:09	t	00:05:00	1969-12-31 17:11:26.893-07
88nh1g3umqn4ia48q0	gklomm7php8m8k38ho	3unh7411ka0tz	56auau8:09	t	00:05:00	1969-12-31 17:11:26.893-07
88nh1g3umqn4ia48q0	fv739bri9isrvqtfq6	2g43j83a271g9	56auau8:0b	t	00:05:00	1969-12-31 17:11:57.753-07
88nh1g3umqn4ia48q0	fv739bri9isrvqtfq6	3t09dyzubc9zp	56auau8:0b	t	00:05:00	1969-12-31 17:11:57.753-07
88nh1g3umqn4ia48q0	fv739bri9isrvqtfq6	3unh7411ka0tz	56auau8:0b	t	00:05:00	1969-12-31 17:11:57.753-07
88nh1g3umqn4ia48q0	663h0vj118b0l61m8m	2g43j83a271g9	56auau8:0c	t	00:05:00	1969-12-31 17:12:49.029-07
88nh1g3umqn4ia48q0	puar9ddtqvvkbh16nl	2g43j83a271g9	56auau8:0e	t	00:05:00	1969-12-31 17:13:35.332-07
88nh1g3umqn4ia48q0	puar9ddtqvvkbh16nl	3t09dyzubc9zp	56auau8:0e	t	00:05:00	1969-12-31 17:13:35.332-07
88nh1g3umqn4ia48q0	puar9ddtqvvkbh16nl	3unh7411ka0tz	56auau8:0e	t	00:05:00	1969-12-31 17:13:35.332-07
88nh1g3umqn4ia48q0	663h0vj118b0l61m8m	3t09dyzubc9zp	56auau8:0c	t	00:05:00	1969-12-31 17:12:49.029-07
88nh1g3umqn4ia48q0	663h0vj118b0l61m8m	3unh7411ka0tz	56auau8:0c	t	00:05:00	1969-12-31 17:12:49.029-07
88nh1g3umqn4ia48q0	mjrji9ugnn9o5v60ns	2g43j83a271g9	56auau8:0p	t	00:05:00	1969-12-31 17:15:21.993-07
88nh1g3umqn4ia48q0	mjrji9ugnn9o5v60ns	3t09dyzubc9zp	56auau8:0p	t	00:05:00	1969-12-31 17:15:21.993-07
88nh1g3umqn4ia48q0	mjrji9ugnn9o5v60ns	3unh7411ka0tz	56auau8:0p	t	00:05:00	1969-12-31 17:15:21.993-07
88nh1g3umqn4ia48q0	1t6vgshfga0o1e8m5k	2g43j83a271g9	56auau8:0g	t	00:05:00	1969-12-31 17:14:18.162-07
88nh1g3umqn4ia48q0	1t6vgshfga0o1e8m5k	3t09dyzubc9zp	56auau8:0g	t	00:05:00	1969-12-31 17:14:18.162-07
88nh1g3umqn4ia48q0	1t6vgshfga0o1e8m5k	3unh7411ka0tz	56auau8:0g	t	00:05:00	1969-12-31 17:14:18.162-07
88nh1g3umqn4ia48q0	19crcn92gsj9r2atqk	2g43j83a271g9	56auau8:0h	t	00:05:00	1969-12-31 17:14:18.832-07
88nh1g3umqn4ia48q0	19crcn92gsj9r2atqk	3t09dyzubc9zp	56auau8:0h	t	00:05:00	1969-12-31 17:14:18.832-07
88nh1g3umqn4ia48q0	19crcn92gsj9r2atqk	3unh7411ka0tz	56auau8:0h	t	00:05:00	1969-12-31 17:14:18.832-07
88nh1g3umqn4ia48q0	ppvpgtgppts1g7q7ol	2g43j83a271g9	56auau8:0i	t	00:05:00	1969-12-31 17:14:31.898-07
88nh1g3umqn4ia48q0	ppvpgtgppts1g7q7ol	3t09dyzubc9zp	56auau8:0i	t	00:05:00	1969-12-31 17:14:31.898-07
88nh1g3umqn4ia48q0	ppvpgtgppts1g7q7ol	3unh7411ka0tz	56auau8:0i	t	00:05:00	1969-12-31 17:14:31.898-07
88nh1g3umqn4ia48q0	gjr4r5hg8jjsrj408b	2g43j83a271g9	56auau8:0j	t	00:05:00	1969-12-31 17:14:32.547-07
88nh1g3umqn4ia48q0	gjr4r5hg8jjsrj408b	3t09dyzubc9zp	56auau8:0j	t	00:05:00	1969-12-31 17:14:32.547-07
88nh1g3umqn4ia48q0	gjr4r5hg8jjsrj408b	3unh7411ka0tz	56auau8:0j	t	00:05:00	1969-12-31 17:14:32.547-07
88nh1g3umqn4ia48q0	g792sd9h8c5ckvtn9u	2g43j83a271g9	56auau8:0k	t	00:05:00	1969-12-31 17:14:57.688-07
88nh1g3umqn4ia48q0	g792sd9h8c5ckvtn9u	3t09dyzubc9zp	56auau8:0k	t	00:05:00	1969-12-31 17:14:57.688-07
88nh1g3umqn4ia48q0	g792sd9h8c5ckvtn9u	3unh7411ka0tz	56auau8:0k	t	00:05:00	1969-12-31 17:14:57.688-07
88nh1g3umqn4ia48q0	uqrj3gm06l0v8ct347	2g43j83a271g9	56auau8:0l	t	00:05:00	1969-12-31 17:15:06.852-07
88nh1g3umqn4ia48q0	uqrj3gm06l0v8ct347	3t09dyzubc9zp	56auau8:0l	t	00:05:00	1969-12-31 17:15:06.852-07
88nh1g3umqn4ia48q0	uqrj3gm06l0v8ct347	3unh7411ka0tz	56auau8:0l	t	00:05:00	1969-12-31 17:15:06.852-07
88nh1g3umqn4ia48q0	c7c4f0vrmd4ejsnlfi	2g43j83a271g9	56auau8:0m	t	00:05:00	1969-12-31 17:15:07.481-07
88nh1g3umqn4ia48q0	c7c4f0vrmd4ejsnlfi	3t09dyzubc9zp	56auau8:0m	t	00:05:00	1969-12-31 17:15:07.481-07
88nh1g3umqn4ia48q0	c7c4f0vrmd4ejsnlfi	3unh7411ka0tz	56auau8:0m	t	00:05:00	1969-12-31 17:15:07.481-07
88nh1g3umqn4ia48q0	n7punt45ofm6artcda	2g43j83a271g9	56auau8:0n	t	00:05:00	1969-12-31 17:15:14.985-07
88nh1g3umqn4ia48q0	n7punt45ofm6artcda	3t09dyzubc9zp	56auau8:0n	t	00:05:00	1969-12-31 17:15:14.985-07
88nh1g3umqn4ia48q0	n7punt45ofm6artcda	3unh7411ka0tz	56auau8:0n	t	00:05:00	1969-12-31 17:15:14.985-07
88nh1g3umqn4ia48q0	tdm3a402g2hbekrud4	2g43j83a271g9	56auau8:0o	t	00:05:00	1969-12-31 17:15:16.028-07
88nh1g3umqn4ia48q0	tdm3a402g2hbekrud4	3t09dyzubc9zp	56auau8:0o	t	00:05:00	1969-12-31 17:15:16.028-07
88nh1g3umqn4ia48q0	tdm3a402g2hbekrud4	3unh7411ka0tz	56auau8:0o	t	00:05:00	1969-12-31 17:15:16.028-07
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: zero_0/cvr; Owner: mattpardini
--

COPY "zero_0/cvr".instances ("clientGroupID", version, "lastActive", "ttlClock", "replicaVersion", owner, "grantedAt", "clientSchema") FROM stdin;
03t8qgkk1nqfk9vv0c	00:01	2025-11-29 06:27:40.764-07	23	\N	fHdN61kp5Ih7BzhHKtcre	2025-11-29 06:27:40.728-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
g3v14ttgpg24ikddc2	00:01	2025-11-29 06:35:49.668-07	18	\N	hhre6ZuwpsO41ZNnzpmOc	2025-11-29 06:35:49.645-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
qnohrfdk062faauu7h	00:01	2025-11-29 06:33:57.585-07	12	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:57.568-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
287ctj7acmbh2aediu	00:01	2025-11-29 06:36:13.076-07	15	\N	hhre6ZuwpsO41ZNnzpmOc	2025-11-29 06:36:13.057-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
htc76aifuod9vqouk8	00:01	2025-11-29 06:34:44.396-07	16	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:34:44.373-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
l8mvh560r0fbhr8lj3	00:01	2025-11-29 06:27:41.137-07	26	\N	fHdN61kp5Ih7BzhHKtcre	2025-11-29 06:27:41.096-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
fnfm99oelq3cqe42ki	00:01	2025-11-29 06:33:58.072-07	17	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:58.051-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
31mc88jnq97se1qfd3	00:01	2025-11-29 06:27:46.438-07	4	\N	fHdN61kp5Ih7BzhHKtcre	2025-11-29 06:27:46.434-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
gb84jvct157rn24agr	00:01	2025-11-29 06:34:44.859-07	18	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:34:44.836-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
kir8njkgnkqiu0b650	00:01	2025-11-29 06:28:11.054-07	6	\N	fHdN61kp5Ih7BzhHKtcre	2025-11-29 06:28:11.047-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
hnan605eembon699el	00:01	2025-11-29 06:35:50.115-07	23	\N	hhre6ZuwpsO41ZNnzpmOc	2025-11-29 06:35:50.084-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
um9oencbpuv57ete7t	00:01	2025-11-29 06:27:46.801-07	19	\N	fHdN61kp5Ih7BzhHKtcre	2025-11-29 06:27:46.772-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
k8nqtfgdt1gfua17hj	00:01	2025-11-29 06:34:45.226-07	13	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:34:45.204-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
fdm9fr3m544qman1r0	00:01	2025-11-29 06:33:29.491-07	19	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:29.466-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
88nh1g3umqn4ia48q0	56bncow:0o	2025-11-29 12:13:43.576-07	1112239	554tsug	g8qA2eOgNEZW_5aMdfPGB	2025-11-29 12:13:36.07-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
hduufqspughbcleqlh	00:01	2025-11-29 06:28:11.311-07	7	\N	fHdN61kp5Ih7BzhHKtcre	2025-11-29 06:28:11.301-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
ihvkgj53a883ci6pfj	00:01	2025-11-29 06:34:46.271-07	14	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:34:46.253-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
cm2q3g8j0kgtd3grm7	00:01	2025-11-29 06:33:31.565-07	30	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:31.531-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
5f9babhn73rfvnj9rd	00:01	2025-11-29 06:34:01.434-07	16	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:34:01.414-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
j7bhrg08dkl0ut6f8e	00:01	2025-11-29 06:33:27.677-07	17	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:27.654-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
hk190gb9r62o0nurct	00:01	2025-11-29 06:36:12.577-07	24	\N	hhre6ZuwpsO41ZNnzpmOc	2025-11-29 06:36:12.547-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
amdndj578iksr3ndab	00:01	2025-11-29 06:36:13.427-07	10	\N	hhre6ZuwpsO41ZNnzpmOc	2025-11-29 06:36:13.409-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
2jgaqgbq1bcrckcvu9	00:01	2025-11-29 06:33:59.448-07	8	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:59.439-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
f6ensgggfospg8ohnh	00:01	2025-11-29 06:34:48.247-07	8	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:34:48.238-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
uk74dsudpgd94faf3n	566ttgw:0t	2025-11-29 10:27:32.64-07	2072418	554tsug	2c0Xf-GaT7ilvDlCRHWVU	2025-11-29 10:27:25.597-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
lananaqcj6js8htau4	55xripk:09	2025-11-29 06:18:48.437-07	4923630	554tsug	fHdN61kp5Ih7BzhHKtcre	2025-11-29 06:18:42.88-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
5ph82kuone893qddig	00:01	2025-11-29 06:33:27.981-07	16	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:27.96-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
uspqnc772u0gl3atvk	00:01	2025-11-29 06:33:58.4-07	13	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:58.383-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
s7a0o435h2ri4c12g5	00:01	2025-11-29 06:33:28.582-07	16	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:28.558-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
nucjcspfqppevp3r6i	00:01	2025-11-29 06:33:35.821-07	17	\N	91s1wDhfKLPfFcXGBD8xW	2025-11-29 06:33:35.799-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
t6msrosengq3p4a7ce	00:01	2025-11-29 06:36:14.439-07	13	\N	hhre6ZuwpsO41ZNnzpmOc	2025-11-29 06:36:14.422-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
o3nc60rubd8sueu3n3	00:01	2025-11-29 06:36:16.452-07	14	\N	hhre6ZuwpsO41ZNnzpmOc	2025-11-29 06:36:16.432-07	{"tables": {"task": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "due_date": {"type": "number"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}, "completed_by": {"type": "string"}, "task_template_id": {"type": "string"}}, "primaryKey": ["id"]}, "user": {"columns": {"id": {"type": "string"}, "role": {"type": "string"}, "email": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "display_name": {"type": "string"}, "onboarding_completed": {"type": "boolean"}}, "primaryKey": ["id"]}, "vine": {"columns": {"id": {"type": "string"}, "block": {"type": "string"}, "notes": {"type": "string"}, "health": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "qr_generated": {"type": "number"}, "planting_date": {"type": "number"}, "sequence_number": {"type": "number"}, "training_method": {"type": "string"}, "training_method_other": {"type": "string"}}, "primaryKey": ["id"]}, "wine": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "user_id": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vintage_id": {"type": "string"}, "vineyard_id": {"type": "string"}, "current_stage": {"type": "string"}, "volume_gallons": {"type": "number"}, "blend_components": {"type": "json"}, "last_tasting_notes": {"type": "string"}, "current_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "block": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "soil_type": {"type": "string"}, "created_at": {"type": "number"}, "size_acres": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "vintage": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "variety": {"type": "string"}, "block_ids": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "vineyard_id": {"type": "string"}, "grape_source": {"type": "string"}, "harvest_date": {"type": "number"}, "vintage_year": {"type": "number"}, "current_stage": {"type": "string"}, "supplier_name": {"type": "string"}, "harvest_weight_lbs": {"type": "number"}, "harvest_volume_gallons": {"type": "number"}}, "primaryKey": ["id"]}, "vineyard": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "user_id": {"type": "string"}, "location": {"type": "string"}, "varieties": {"type": "json"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}}, "primaryKey": ["id"]}, "measurement": {"columns": {"id": {"type": "string"}, "ph": {"type": "number"}, "ta": {"type": "number"}, "brix": {"type": "number"}, "date": {"type": "number"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "temperature": {"type": "number"}, "tasting_notes": {"type": "string"}}, "primaryKey": ["id"]}, "pruning_log": {"columns": {"id": {"type": "string"}, "date": {"type": "number"}, "notes": {"type": "string"}, "user_id": {"type": "string"}, "vine_id": {"type": "string"}, "photo_id": {"type": "string"}, "created_at": {"type": "number"}, "spurs_left": {"type": "number"}, "updated_at": {"type": "number"}, "canes_after": {"type": "number"}, "canes_before": {"type": "number"}, "pruning_type": {"type": "string"}}, "primaryKey": ["id"]}, "stage_history": {"columns": {"id": {"type": "string"}, "notes": {"type": "string"}, "stage": {"type": "string"}, "skipped": {"type": "boolean"}, "user_id": {"type": "string"}, "entity_id": {"type": "string"}, "created_at": {"type": "number"}, "started_at": {"type": "number"}, "updated_at": {"type": "number"}, "entity_type": {"type": "string"}, "completed_at": {"type": "number"}}, "primaryKey": ["id"]}, "task_template": {"columns": {"id": {"type": "string"}, "name": {"type": "string"}, "stage": {"type": "string"}, "user_id": {"type": "string"}, "frequency": {"type": "string"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "sort_order": {"type": "number"}, "updated_at": {"type": "number"}, "description": {"type": "string"}, "entity_type": {"type": "string"}, "vineyard_id": {"type": "string"}, "frequency_unit": {"type": "string"}, "default_enabled": {"type": "boolean"}, "frequency_count": {"type": "number"}}, "primaryKey": ["id"]}, "measurement_range": {"columns": {"id": {"type": "string"}, "ideal_max": {"type": "number"}, "ideal_min": {"type": "number"}, "max_value": {"type": "number"}, "min_value": {"type": "number"}, "wine_type": {"type": "string"}, "created_at": {"type": "number"}, "low_warning": {"type": "string"}, "high_warning": {"type": "string"}, "measurement_type": {"type": "string"}}, "primaryKey": ["id"]}}}
\.


--
-- Data for Name: queries; Type: TABLE DATA; Schema: zero_0/cvr; Owner: mattpardini
--

COPY "zero_0/cvr".queries ("clientGroupID", "queryHash", "clientAST", "queryName", "queryArgs", "patchVersion", "transformationHash", "transformationVersion", internal, deleted) FROM stdin;
03t8qgkk1nqfk9vv0c	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "03t8qgkk1nqfk9vv0c"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
03t8qgkk1nqfk9vv0c	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "03t8qgkk1nqfk9vv0c"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
03t8qgkk1nqfk9vv0c	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
nucjcspfqppevp3r6i	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "nucjcspfqppevp3r6i"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
nucjcspfqppevp3r6i	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "nucjcspfqppevp3r6i"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
nucjcspfqppevp3r6i	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
k8nqtfgdt1gfua17hj	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "k8nqtfgdt1gfua17hj"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
k8nqtfgdt1gfua17hj	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "k8nqtfgdt1gfua17hj"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
k8nqtfgdt1gfua17hj	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
f6ensgggfospg8ohnh	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "f6ensgggfospg8ohnh"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
f6ensgggfospg8ohnh	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "f6ensgggfospg8ohnh"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
f6ensgggfospg8ohnh	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
t6msrosengq3p4a7ce	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "t6msrosengq3p4a7ce"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
t6msrosengq3p4a7ce	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "t6msrosengq3p4a7ce"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
t6msrosengq3p4a7ce	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
88nh1g3umqn4ia48q0	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "88nh1g3umqn4ia48q0"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	24bs2hdjoon1m	5687g3c:0k	t	f
88nh1g3umqn4ia48q0	e2hz9kajle2s	\N	myPruningLogsByVine	["463eea8f-3a3d-42a5-9982-c377928ca021"]	56auau8:0a	\N	\N	\N	t
uk74dsudpgd94faf3n	3unh7411ka0tz	\N	myBlocks	[]	561nv60:0e	b09y6jih7vqi	561nv60:0e	\N	f
uk74dsudpgd94faf3n	uizv2xjm3zqw	\N	myMeasurementsByEntity	["wine","579e7c78-a3b7-4632-8a97-5125582b115b"]	563o7s8:12n	\N	\N	\N	t
uk74dsudpgd94faf3n	1z8ikb5cnznqy	\N	myStageHistoryByEntity	["wine","579e7c78-a3b7-4632-8a97-5125582b115b"]	563o7s8:12n	\N	\N	\N	t
uk74dsudpgd94faf3n	343u9rvx540f6	\N	taskTemplates	[]	563o7s8:12n	\N	\N	\N	t
uk74dsudpgd94faf3n	351uuya4pj2ql	\N	myTasksByEntity	["wine","579e7c78-a3b7-4632-8a97-5125582b115b"]	563o7s8:12n	\N	\N	\N	t
uk74dsudpgd94faf3n	e2hz9kajle2s	\N	myPruningLogsByVine	["463eea8f-3a3d-42a5-9982-c377928ca021"]	5627l1k	2i9mbtm2h7ojk	5627l1k	\N	f
uk74dsudpgd94faf3n	5yw2tu9v1pca	\N	myPruningLogsByVine	[""]	561nv60:0c	\N	\N	\N	t
l8mvh560r0fbhr8lj3	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "l8mvh560r0fbhr8lj3"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
l8mvh560r0fbhr8lj3	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "l8mvh560r0fbhr8lj3"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
l8mvh560r0fbhr8lj3	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
31mc88jnq97se1qfd3	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "31mc88jnq97se1qfd3"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
31mc88jnq97se1qfd3	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "31mc88jnq97se1qfd3"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
31mc88jnq97se1qfd3	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
kir8njkgnkqiu0b650	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "kir8njkgnkqiu0b650"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
kir8njkgnkqiu0b650	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "kir8njkgnkqiu0b650"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
kir8njkgnkqiu0b650	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
hduufqspughbcleqlh	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "hduufqspughbcleqlh"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
hduufqspughbcleqlh	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "hduufqspughbcleqlh"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
hduufqspughbcleqlh	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
qnohrfdk062faauu7h	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "qnohrfdk062faauu7h"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
qnohrfdk062faauu7h	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "qnohrfdk062faauu7h"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
qnohrfdk062faauu7h	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
ihvkgj53a883ci6pfj	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "ihvkgj53a883ci6pfj"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
ihvkgj53a883ci6pfj	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "ihvkgj53a883ci6pfj"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
lananaqcj6js8htau4	1h040veoau8up	\N	myTasksByEntity	["vintage","2019-cab"]	55oncwg:11t	\N	\N	\N	t
ihvkgj53a883ci6pfj	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
o3nc60rubd8sueu3n3	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "o3nc60rubd8sueu3n3"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
o3nc60rubd8sueu3n3	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "o3nc60rubd8sueu3n3"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
o3nc60rubd8sueu3n3	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
88nh1g3umqn4ia48q0	3rnpsi5qegpt3	\N	myWines	[]	569f6ls:0a	\N	\N	\N	t
uk74dsudpgd94faf3n	1tgahbk62pc9s	\N	myPruningLogsByVine	["9f2776bd-70d4-4e24-bf2b-ce7d4d0ad464"]	562jj60:0b	gy70npp7bpq9	562jj60:0b	\N	f
uk74dsudpgd94faf3n	6sslkw7ya3s8	\N	myPruningLogsByVine	["fe20b6dd-6e46-4ef6-a5fa-a73d453641cf"]	561nv60:0u	\N	\N	\N	t
uk74dsudpgd94faf3n	1j8dxewufrst5	\N	myPruningLogsByVine	["5c3a4732-bc09-4901-aa54-f70823d5e7ec"]	563o7s8:12d	147pt605a4kh1	563o7s8:12d	\N	f
88nh1g3umqn4ia48q0	213g7dw9zr8d1	\N	myPruningLogsByVine	["17681df8-07a0-4a2d-9cfe-8da24613d477"]	56auau8:0d	\N	\N	\N	t
88nh1g3umqn4ia48q0	2zrt25uo1nmxy	\N	myPruningLogsByVine	["028e179d-3cfd-4b33-bd3d-5d429de96989"]	56auau8:0f	\N	\N	\N	t
88nh1g3umqn4ia48q0	2g43j83a271g9	\N	myUser	[]	5687g3c	19mv6jozv5utk	5687g3c	\N	f
um9oencbpuv57ete7t	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "um9oencbpuv57ete7t"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
um9oencbpuv57ete7t	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "um9oencbpuv57ete7t"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
um9oencbpuv57ete7t	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
fnfm99oelq3cqe42ki	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "fnfm99oelq3cqe42ki"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
fnfm99oelq3cqe42ki	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "fnfm99oelq3cqe42ki"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
fnfm99oelq3cqe42ki	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
g3v14ttgpg24ikddc2	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "g3v14ttgpg24ikddc2"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
g3v14ttgpg24ikddc2	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "g3v14ttgpg24ikddc2"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
g3v14ttgpg24ikddc2	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
uk74dsudpgd94faf3n	gt8yfqbqc7ca	\N	activeWines	[]	563o7s8:12o	\N	\N	\N	t
uk74dsudpgd94faf3n	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "uk74dsudpgd94faf3n"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	1ice5c6q69knf	55zqif4:04	t	f
88nh1g3umqn4ia48q0	qkrcav8v0rkn	\N	myPruningLogsByVine	["089b7e15-448d-408d-83f5-597a2226a9c4"]	56bncow	\N	\N	\N	t
uk74dsudpgd94faf3n	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "uk74dsudpgd94faf3n"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	3mrfcbgy37xa8	55zqif4:04	t	f
uk74dsudpgd94faf3n	2g43j83a271g9	\N	myUser	[]	561nv60:02	19mv6jozv5utk	561nv60:02	\N	f
88nh1g3umqn4ia48q0	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "88nh1g3umqn4ia48q0"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	l7uz2u8fbkts	5687g3c:0k	t	f
uk74dsudpgd94faf3n	6cyrj6k89ujx	\N	myPruningLogsByVine	["4eda86cf-aaf5-4e7c-9664-bc5a94fe3de7"]	561nv60:0m	\N	\N	\N	t
uk74dsudpgd94faf3n	38xozpcnh6zqd	\N	myPruningLogsByVine	["b8fe40b5-7833-4b0d-9014-c2ded9959864"]	561nv60:0w	\N	\N	\N	t
j7bhrg08dkl0ut6f8e	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "j7bhrg08dkl0ut6f8e"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
j7bhrg08dkl0ut6f8e	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "j7bhrg08dkl0ut6f8e"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
j7bhrg08dkl0ut6f8e	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
uspqnc772u0gl3atvk	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "uspqnc772u0gl3atvk"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
uspqnc772u0gl3atvk	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "uspqnc772u0gl3atvk"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
uspqnc772u0gl3atvk	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
2jgaqgbq1bcrckcvu9	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "2jgaqgbq1bcrckcvu9"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
2jgaqgbq1bcrckcvu9	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "2jgaqgbq1bcrckcvu9"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
2jgaqgbq1bcrckcvu9	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
hnan605eembon699el	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "hnan605eembon699el"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
hnan605eembon699el	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "hnan605eembon699el"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
hnan605eembon699el	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
uk74dsudpgd94faf3n	wadifsltd94o	\N	myPruningLogsByVine	["98295f0d-4317-4fb9-b0b9-21d817a6974e"]	561nv60:0o	\N	\N	\N	t
uk74dsudpgd94faf3n	3vom7mes0wp2i	\N	myPruningLogsByVine	["db064127-e9da-43a8-9ceb-93297b028505"]	561nv60:0y	\N	\N	\N	t
lananaqcj6js8htau4	35ph2ne7hp4ab	\N	myMeasurementsByEntity	["vintage","2016-sauv"]	55oncwg:11e	\N	\N	\N	t
uk74dsudpgd94faf3n	2blc6xwom46ss	\N	myVintages	[]	563o7s8:05	nmcgkex4gmx2	563o7s8:05	\N	f
uk74dsudpgd94faf3n	3se2qu476j7tg	\N	myMeasurements	[]	563o7s8:05	4hpee0wp9spl	563o7s8:05	\N	f
uk74dsudpgd94faf3n	caqm13mxzbdr	\N	myTasks	[]	563o7s8:05	3kpu7pilmu5ej	563o7s8:05	\N	f
88nh1g3umqn4ia48q0	2blc6xwom46ss	\N	myVintages	[]	569f6ls:0c	\N	\N	\N	t
88nh1g3umqn4ia48q0	3se2qu476j7tg	\N	myMeasurements	[]	569f6ls:0c	\N	\N	\N	t
88nh1g3umqn4ia48q0	caqm13mxzbdr	\N	myTasks	[]	569f6ls:0c	\N	\N	\N	t
lananaqcj6js8htau4	v6o0pjus1qzv	\N	myTasksByEntity	["wine","71442004-0ed0-4446-90e2-d57d2ac8874c"]	55jzj5s:0h	\N	\N	\N	t
hk190gb9r62o0nurct	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "hk190gb9r62o0nurct"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
hk190gb9r62o0nurct	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "hk190gb9r62o0nurct"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
hk190gb9r62o0nurct	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
lananaqcj6js8htau4	1grmw7h98yohl	\N	myMeasurementsByEntity	["wine","f7d71f7d-43c5-463e-8ef5-653064278769"]	55lcleo:04	\N	\N	\N	t
uk74dsudpgd94faf3n	3t09dyzubc9zp	\N	myVines	[]	561nv60:0e	ym4032l0z0yb	561nv60:0e	\N	f
lananaqcj6js8htau4	gt8yfqbqc7ca	\N	activeWines	[]	55s721c:13w	1ttsvzfaw8kfe	55s721c:13w	\N	f
lananaqcj6js8htau4	3t09dyzubc9zp	\N	myVines	[]	55n1lqw:11c	ym4032l0z0yb	55n1lqw:11c	\N	f
lananaqcj6js8htau4	3unh7411ka0tz	\N	myBlocks	[]	55n1lqw:11c	b09y6jih7vqi	55n1lqw:11c	\N	f
5ph82kuone893qddig	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "5ph82kuone893qddig"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
5ph82kuone893qddig	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "5ph82kuone893qddig"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
5ph82kuone893qddig	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
5f9babhn73rfvnj9rd	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "5f9babhn73rfvnj9rd"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
5f9babhn73rfvnj9rd	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "5f9babhn73rfvnj9rd"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
5f9babhn73rfvnj9rd	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
88nh1g3umqn4ia48q0	3t09dyzubc9zp	\N	myVines	[]	5687g3c:06	ym4032l0z0yb	5687g3c:06	\N	f
88nh1g3umqn4ia48q0	3unh7411ka0tz	\N	myBlocks	[]	5687g3c:06	b09y6jih7vqi	5687g3c:06	\N	f
88nh1g3umqn4ia48q0	817el2k23zdp	\N	myVineyards	[]	56bncow:0b	25yr89hpe12kd	56bncow:0b	\N	f
lananaqcj6js8htau4	3mv5477qq3t7o	\N	myWinesByVintage	["2016-sauv"]	55oncwg:11e	\N	\N	\N	t
lananaqcj6js8htau4	2nl21rh92w0th	\N	myTasksByEntity	["vintage","2016-sauv"]	55oncwg:11e	\N	\N	\N	t
lananaqcj6js8htau4	2zyrhhob51crw	\N	myStageHistoryByEntity	["wine","none"]	55oncwg:11t	\N	\N	\N	t
lananaqcj6js8htau4	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "lananaqcj6js8htau4"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	358m66qlm4fp5	559ybag:07	t	f
lananaqcj6js8htau4	nz4m5nccr9f8	\N	myMeasurementsByEntity	["wine","6e3160ac-478a-4a4e-8399-e4cda18f53dd"]	55l0pe8:07	\N	\N	\N	t
lananaqcj6js8htau4	3e5j0so81l0e9	\N	myStageHistoryByEntity	["wine","6e3160ac-478a-4a4e-8399-e4cda18f53dd"]	55l0pe8:07	\N	\N	\N	t
lananaqcj6js8htau4	14fikkoi7zm0b	\N	myTasksByEntity	["wine","none"]	55oncwg:11t	\N	\N	\N	t
lananaqcj6js8htau4	37ysvekgvup14	\N	myStageHistoryByEntity	["wine","f7d71f7d-43c5-463e-8ef5-653064278769"]	55lcleo:04	\N	\N	\N	t
lananaqcj6js8htau4	17piv97wtngw8	\N	myMeasurementsByEntity	["wine","none"]	55oncwg:11t	\N	\N	\N	t
lananaqcj6js8htau4	1z8ikb5cnznqy	\N	myStageHistoryByEntity	["wine","579e7c78-a3b7-4632-8a97-5125582b115b"]	55poixs	\N	\N	\N	t
uk74dsudpgd94faf3n	m2ssjaqatowg	\N	myPruningLogsByVine	["ffb8a0c3-588a-40a0-9a69-96097cfa900e"]	561nv60:110	\N	\N	\N	t
88nh1g3umqn4ia48q0	gt8yfqbqc7ca	\N	activeWines	[]	569f6ls:0a	\N	\N	\N	t
lananaqcj6js8htau4	2bpfpzhrzpy8y	\N	myStageHistoryByEntity	["vintage","2016-sauv"]	55oncwg:11e	\N	\N	\N	t
lananaqcj6js8htau4	1drrclvyl30ag	\N	myMeasurementsByEntity	["vintage","2016-pinot"]	55oncwg:11l	\N	\N	\N	t
lananaqcj6js8htau4	3panrcehejw2b	\N	myMeasurementsByEntity	["vintage","2019-cab"]	55oncwg:11t	\N	\N	\N	t
lananaqcj6js8htau4	18mv2b14fqanq	\N	myStageHistoryByEntity	["vintage","2016-pinot"]	55oncwg:11l	\N	\N	\N	t
lananaqcj6js8htau4	2v7ryv0j5xwcn	\N	myStageHistoryByEntity	["wine","5bb02965-6215-4238-ab0d-9c56705b20ec"]	55lzb3c:05	\N	\N	\N	t
lananaqcj6js8htau4	2a3fejmu1ysvb	\N	myStageHistoryByEntity	["vintage","2019-cab"]	55oncwg:11t	\N	\N	\N	t
lananaqcj6js8htau4	2g43j83a271g9	\N	myUser	[]	559ybag	19mv6jozv5utk	559ybag	\N	f
s7a0o435h2ri4c12g5	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "s7a0o435h2ri4c12g5"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
s7a0o435h2ri4c12g5	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "s7a0o435h2ri4c12g5"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
lananaqcj6js8htau4	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "lananaqcj6js8htau4"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	2c2v7fem17t5z	559ybag:07	t	f
uk74dsudpgd94faf3n	jmcnhcd1etk2	\N	myPruningLogsByVine	["cb8ab73e-ada6-4816-861b-0c1b768ca8c1"]	561nv60:0s	\N	\N	\N	t
s7a0o435h2ri4c12g5	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
lananaqcj6js8htau4	2m5c2t3mg17an	\N	myTasksByEntity	["wine","6e3160ac-478a-4a4e-8399-e4cda18f53dd"]	55l0pe8:07	\N	\N	\N	t
lananaqcj6js8htau4	i50mbufn38bb	\N	myStageHistoryByEntity	["wine","4b374208-6e8d-4106-b23a-a0071f02170c"]	55n1lqw	\N	\N	\N	t
lananaqcj6js8htau4	2vp6wa4hseasz	\N	myMeasurementsByEntity	["wine","0a70de71-b8a0-4cbf-ad98-88ec72eefa03"]	55m0xcg:0j	\N	\N	\N	t
lananaqcj6js8htau4	2wha4nxhfryk5	\N	myMeasurementsByEntity	["wine","4b374208-6e8d-4106-b23a-a0071f02170c"]	55n1lqw	\N	\N	\N	t
lananaqcj6js8htau4	30cgn5q2a6wny	\N	myStageHistoryByEntity	["wine","0a70de71-b8a0-4cbf-ad98-88ec72eefa03"]	55m0xcg:0j	\N	\N	\N	t
lananaqcj6js8htau4	15h1mxjr1phlc	\N	myTasksByEntity	["wine","f7d71f7d-43c5-463e-8ef5-653064278769"]	55lcleo:04	\N	\N	\N	t
lananaqcj6js8htau4	15sxcxu95clcy	\N	myTasksByEntity	["wine","ed1430bb-2eca-44b4-9fb5-7376d039c357"]	55lcleo:03	\N	\N	\N	t
lananaqcj6js8htau4	3chlooy6k8yna	\N	myStageHistoryByEntity	["wine","71442004-0ed0-4446-90e2-d57d2ac8874c"]	55jzj5s:0h	\N	\N	\N	t
lananaqcj6js8htau4	2p7kal6uehti8	\N	myMeasurementsByEntity	["wine","71442004-0ed0-4446-90e2-d57d2ac8874c"]	55jzj5s:0h	\N	\N	\N	t
lananaqcj6js8htau4	32m30za7qqkmt	\N	myMeasurementsByEntity	["wine","f01886d9-9842-4d47-b260-5dc4c8641d0b"]	55n1lqw:01	\N	\N	\N	t
lananaqcj6js8htau4	36n5xz3rdvj0m	\N	myMeasurementsByEntity	["wine","5bb02965-6215-4238-ab0d-9c56705b20ec"]	55lzb3c:05	\N	\N	\N	t
lananaqcj6js8htau4	5fznhcfgml00	\N	myStageHistoryByEntity	["wine","f01886d9-9842-4d47-b260-5dc4c8641d0b"]	55n1lqw:01	\N	\N	\N	t
lananaqcj6js8htau4	1cpvv22ompl1s	\N	myStageHistoryByEntity	["wine","ed1430bb-2eca-44b4-9fb5-7376d039c357"]	55lcleo:03	\N	\N	\N	t
lananaqcj6js8htau4	1z5v4i1u68m1j	\N	myMeasurementsByEntity	["wine","ed1430bb-2eca-44b4-9fb5-7376d039c357"]	55lcleo:03	\N	\N	\N	t
lananaqcj6js8htau4	1vk9itlfaultr	\N	myTasksByEntity	["wine","0a70de71-b8a0-4cbf-ad98-88ec72eefa03"]	55m0xcg:0j	\N	\N	\N	t
lananaqcj6js8htau4	1gmg8bwlrxcds	\N	myTasksByEntity	["wine","5bb02965-6215-4238-ab0d-9c56705b20ec"]	55lzb3c:05	\N	\N	\N	t
lananaqcj6js8htau4	uizv2xjm3zqw	\N	myMeasurementsByEntity	["wine","579e7c78-a3b7-4632-8a97-5125582b115b"]	55poixs	\N	\N	\N	t
lananaqcj6js8htau4	1u0eoxj8ju3mp	\N	myWinesByVintage	["2019-cab"]	55oncwg:11t	\N	\N	\N	t
lananaqcj6js8htau4	817el2k23zdp	\N	myVineyards	[]	55n1lqw:0s	25yr89hpe12kd	55n1lqw:0s	\N	f
fdm9fr3m544qman1r0	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "fdm9fr3m544qman1r0"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
fdm9fr3m544qman1r0	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "fdm9fr3m544qman1r0"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
lananaqcj6js8htau4	a9fx3bveruwk	\N	myTasksByEntity	["wine","4b374208-6e8d-4106-b23a-a0071f02170c"]	55n1lqw	\N	\N	\N	t
lananaqcj6js8htau4	17pe85lz3g2fv	\N	myTasksByEntity	["wine","f01886d9-9842-4d47-b260-5dc4c8641d0b"]	55n1lqw:01	\N	\N	\N	t
fdm9fr3m544qman1r0	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
htc76aifuod9vqouk8	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "htc76aifuod9vqouk8"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
lananaqcj6js8htau4	3se2qu476j7tg	\N	myMeasurements	[]	55s721c:13w	4hpee0wp9spl	55s721c:13w	\N	f
lananaqcj6js8htau4	caqm13mxzbdr	\N	myTasks	[]	55s721c:13w	3kpu7pilmu5ej	55s721c:13w	\N	f
lananaqcj6js8htau4	3rnpsi5qegpt3	\N	myWines	[]	55s721c:13w	1mwnctav0qtq1	55s721c:13w	\N	f
lananaqcj6js8htau4	2blc6xwom46ss	\N	myVintages	[]	55s721c:13w	nmcgkex4gmx2	55s721c:13w	\N	f
htc76aifuod9vqouk8	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "htc76aifuod9vqouk8"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
htc76aifuod9vqouk8	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
287ctj7acmbh2aediu	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "287ctj7acmbh2aediu"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
287ctj7acmbh2aediu	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "287ctj7acmbh2aediu"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
287ctj7acmbh2aediu	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
lananaqcj6js8htau4	351uuya4pj2ql	\N	myTasksByEntity	["wine","579e7c78-a3b7-4632-8a97-5125582b115b"]	55q2x20	\N	\N	\N	t
88nh1g3umqn4ia48q0	uizv2xjm3zqw	\N	myMeasurementsByEntity	["wine","579e7c78-a3b7-4632-8a97-5125582b115b"]	569f6ls:0a	\N	\N	\N	t
88nh1g3umqn4ia48q0	1z8ikb5cnznqy	\N	myStageHistoryByEntity	["wine","579e7c78-a3b7-4632-8a97-5125582b115b"]	569f6ls:0a	\N	\N	\N	t
88nh1g3umqn4ia48q0	343u9rvx540f6	\N	taskTemplates	[]	569f6ls:0a	\N	\N	\N	t
uk74dsudpgd94faf3n	3rnpsi5qegpt3	\N	myWines	[]	566ttgw	\N	\N	\N	t
88nh1g3umqn4ia48q0	351uuya4pj2ql	\N	myTasksByEntity	["wine","579e7c78-a3b7-4632-8a97-5125582b115b"]	569f6ls:0a	\N	\N	\N	t
lananaqcj6js8htau4	br0wk7u8e4ua	\N	myWinesByVintage	["2016-pinot"]	55oncwg:11l	\N	\N	\N	t
lananaqcj6js8htau4	1wome3bicijgv	\N	myTasksByEntity	["vintage","2016-pinot"]	55oncwg:11l	\N	\N	\N	t
lananaqcj6js8htau4	2cdupbt3tbg3e	\N	myWinesByVintage	["2016-cab"]	55oncwg:11o	\N	\N	\N	t
lananaqcj6js8htau4	26r7dxtpzufsx	\N	myTasksByEntity	["vintage","2016-cab"]	55oncwg:11o	\N	\N	\N	t
lananaqcj6js8htau4	36lad5gt0cgii	\N	myMeasurementsByEntity	["vintage","2016-cab"]	55oncwg:11o	\N	\N	\N	t
lananaqcj6js8htau4	jqnhyg2dpcei	\N	myStageHistoryByEntity	["vintage","2016-cab"]	55oncwg:11o	\N	\N	\N	t
lananaqcj6js8htau4	mloeoms5oc03	\N	myWinesByVintage	["2017-xxxxxx"]	55oncwg:11r	\N	\N	\N	t
lananaqcj6js8htau4	22m6rzcmzstfn	\N	myTasksByEntity	["vintage","2017-xxxxxx"]	55oncwg:11r	\N	\N	\N	t
lananaqcj6js8htau4	1x0yimne01jo1	\N	myMeasurementsByEntity	["vintage","2017-xxxxxx"]	55oncwg:11r	\N	\N	\N	t
lananaqcj6js8htau4	3igp6fph1aa0g	\N	myStageHistoryByEntity	["vintage","2017-xxxxxx"]	55oncwg:11r	\N	\N	\N	t
cm2q3g8j0kgtd3grm7	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "cm2q3g8j0kgtd3grm7"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
cm2q3g8j0kgtd3grm7	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "cm2q3g8j0kgtd3grm7"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
cm2q3g8j0kgtd3grm7	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
gb84jvct157rn24agr	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "gb84jvct157rn24agr"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
gb84jvct157rn24agr	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "gb84jvct157rn24agr"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
gb84jvct157rn24agr	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
amdndj578iksr3ndab	lmids	{"table": "zero_0.clients", "where": {"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "amdndj578iksr3ndab"}}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"]]}	\N	null	\N	\N	\N	t	f
amdndj578iksr3ndab	mutationResults	{"table": "zero_0.mutations", "where": {"type": "and", "conditions": [{"op": "=", "left": {"name": "clientGroupID", "type": "column"}, "type": "simple", "right": {"type": "literal", "value": "amdndj578iksr3ndab"}}]}, "schema": "", "orderBy": [["clientGroupID", "asc"], ["clientID", "asc"], ["mutationID", "asc"]]}	\N	null	\N	\N	\N	t	f
amdndj578iksr3ndab	2g43j83a271g9	\N	myUser	[]	\N	\N	\N	\N	f
uk74dsudpgd94faf3n	817el2k23zdp	\N	myVineyards	[]	561nv60:0e	25yr89hpe12kd	561nv60:0e	\N	f
lananaqcj6js8htau4	310t54w26gnab	\N	myTasksByEntity	["wine","12aff46d-6c82-45da-9eb5-e55f1e9e09c0"]	55oncwg:11t	\N	\N	\N	t
lananaqcj6js8htau4	3kpx9tkeqc8r2	\N	myMeasurementsByEntity	["wine","12aff46d-6c82-45da-9eb5-e55f1e9e09c0"]	55oncwg:11t	\N	\N	\N	t
lananaqcj6js8htau4	1oisugrazbrw2	\N	myStageHistoryByEntity	["wine","12aff46d-6c82-45da-9eb5-e55f1e9e09c0"]	55oncwg:11t	\N	\N	\N	t
lananaqcj6js8htau4	30jvdj0cnbssk	\N	myMeasurementsByEntity	["vintage","2025-pinot"]	55poixs:01	\N	\N	\N	t
lananaqcj6js8htau4	re8susfyu4m4	\N	myStageHistoryByEntity	["vintage","2025-pinot"]	55poixs:01	\N	\N	\N	t
lananaqcj6js8htau4	343u9rvx540f6	\N	taskTemplates	[]	55poixs:01	\N	\N	\N	t
lananaqcj6js8htau4	1057y377uomio	\N	myTasksByEntity	["vintage","2025-pinot"]	55poixs:01	\N	\N	\N	t
\.


--
-- Data for Name: rows; Type: TABLE DATA; Schema: zero_0/cvr; Owner: mattpardini
--

COPY "zero_0/cvr".rows ("clientGroupID", schema, "table", "rowKey", "rowVersion", "patchVersion", "refCounts") FROM stdin;
88nh1g3umqn4ia48q0		user	{"id": "user_34zvb6YsnjkI4IFo9qDJyUXGQfK"}	554tsug	5687g3c	{"2g43j83a271g9": 1}
88nh1g3umqn4ia48q0		wine	{"id": "579e7c78-a3b7-4632-8a97-5125582b115b"}	55om8sg	569f6ls:0a	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "upngfbg4kovohhrmf9", "clientGroupID": "lananaqcj6js8htau4"}	55xripk	55xripk	{"lmids": 1}
uk74dsudpgd94faf3n		wine	{"id": "579e7c78-a3b7-4632-8a97-5125582b115b"}	55om8sg	566ttgw	\N
uk74dsudpgd94faf3n		user	{"id": "user_34zvb6YsnjkI4IFo9qDJyUXGQfK"}	554tsug	561nv60:02	{"2g43j83a271g9": 1}
88nh1g3umqn4ia48q0		vintage	{"id": "2025-pinot", "variety": "PINOT", "vineyard_id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589", "vintage_year": 2025}	55og3e8	569f6ls:0c	\N
88nh1g3umqn4ia48q0		measurement	{"id": "2025-pinot-harvest-measurement-1764274276883"}	55ogcso	569f6ls:0c	\N
88nh1g3umqn4ia48q0		task	{"id": "0f9f3639-397a-4dcc-a5c4-1191a5974345"}	55xqy14	569f6ls:0c	\N
88nh1g3umqn4ia48q0		task	{"id": "9344d8bb-9906-4b18-8587-b3ac1a5a8b80"}	55xr8sw	569f6ls:0c	\N
88nh1g3umqn4ia48q0		task	{"id": "b6608997-0a00-4104-9577-afb3e23de3dc"}	55xrdq8	569f6ls:0c	\N
88nh1g3umqn4ia48q0		task	{"id": "f0627fba-1ba4-46d4-995f-8ae71dcbfc07"}	55xripk	569f6ls:0c	\N
uk74dsudpgd94faf3n		vintage	{"id": "2025-pinot", "variety": "PINOT", "vineyard_id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589", "vintage_year": 2025}	55og3e8	563o7s8:05	{"2blc6xwom46ss": 1}
uk74dsudpgd94faf3n		measurement	{"id": "2025-pinot-harvest-measurement-1764274276883"}	55ogcso	563o7s8:05	{"3se2qu476j7tg": 1}
88nh1g3umqn4ia48q0		vine	{"id": "463eea8f-3a3d-42a5-9982-c377928ca021"}	569d894	569d894	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "4eda86cf-aaf5-4e7c-9664-bc5a94fe3de7"}	569dug0	569dug0	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "5c3a4732-bc09-4901-aa54-f70823d5e7ec"}	569dz7k	569dz7k	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "98295f0d-4317-4fb9-b0b9-21d817a6974e"}	569e59c	569e59c	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "9f2776bd-70d4-4e24-bf2b-ce7d4d0ad464"}	569ea0w	569ea0w	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "b8fe40b5-7833-4b0d-9014-c2ded9959864"}	569eesw	569eesw	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "cb8ab73e-ada6-4816-861b-0c1b768ca8c1"}	569ek9c	569ek9c	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "db064127-e9da-43a8-9ceb-93297b028505"}	569epi8	569epi8	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		task	{"id": "0f9f3639-397a-4dcc-a5c4-1191a5974345"}	55xqy14	563o7s8:05	{"caqm13mxzbdr": 1}
uk74dsudpgd94faf3n		task	{"id": "9344d8bb-9906-4b18-8587-b3ac1a5a8b80"}	55xr8sw	563o7s8:05	{"caqm13mxzbdr": 1}
uk74dsudpgd94faf3n		task	{"id": "b6608997-0a00-4104-9577-afb3e23de3dc"}	55xrdq8	563o7s8:05	{"caqm13mxzbdr": 1}
uk74dsudpgd94faf3n		task	{"id": "f0627fba-1ba4-46d4-995f-8ae71dcbfc07"}	55xripk	563o7s8:05	{"caqm13mxzbdr": 1}
88nh1g3umqn4ia48q0		vine	{"id": "fe20b6dd-6e46-4ef6-a5fa-a73d453641cf"}	569eu9s	569eu9s	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "ffb8a0c3-588a-40a0-9a69-96097cfa900e"}	569ez1c	569ez1c	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		block	{"id": "AB"}	56auau8	56auau8	{"3unh7411ka0tz": 1}
88nh1g3umqn4ia48q0		vineyard	{"id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589"}	569f6ls	56bncow:0b	{"817el2k23zdp": 1}
88nh1g3umqn4ia48q0		stage_history	{"id": "33cbf3cb-220b-427c-9f4d-7a839677518a"}	55ollbc	569f6ls:0a	\N
88nh1g3umqn4ia48q0		stage_history	{"id": "54199732-420d-47bc-9a85-7b2911b76988"}	55olj8w	569f6ls:0a	\N
uk74dsudpgd94faf3n		vine	{"id": "4eda86cf-aaf5-4e7c-9664-bc5a94fe3de7"}	55zqfjs	561nv60:0e	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		vine	{"id": "5c3a4732-bc09-4901-aa54-f70823d5e7ec"}	55zqfjs	561nv60:0e	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		vine	{"id": "98295f0d-4317-4fb9-b0b9-21d817a6974e"}	55zqfjs	561nv60:0e	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		vine	{"id": "463eea8f-3a3d-42a5-9982-c377928ca021"}	562jj60	562jj60	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		vine	{"id": "9f2776bd-70d4-4e24-bf2b-ce7d4d0ad464"}	563l5c0	563l5c0	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		zero_0.clients	{"clientID": "qbir6a80n53bicv966", "clientGroupID": "88nh1g3umqn4ia48q0"}	569f6ls	569f6ls	{"lmids": 1}
88nh1g3umqn4ia48q0		task_template	{"id": "tt_aging_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_aging_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_bottling_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_bottling_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_bottling_3"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_bottling_4"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_bottling_5"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_bud_break_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_bud_break_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_crush_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_crush_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_crush_3"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_flowering_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_flowering_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_fruiting_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_fruiting_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_harvest_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_harvest_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_harvest_3"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_oaking_red_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_oaking_red_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_oaking_red_3"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_pre_harvest_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_pre_harvest_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_pre_harvest_3"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_red_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_red_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_red_3"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_red_4"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_rose_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_rose_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_rose_3"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_white_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_white_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_primary_white_3"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_racking_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_racking_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_racking_3"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_racking_4"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_secondary_red_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_secondary_red_2"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_secondary_rose_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_veraison_1"}	55z7nj4	569f6ls:0a	\N
88nh1g3umqn4ia48q0		task_template	{"id": "tt_veraison_2"}	55z7nj4	569f6ls:0a	\N
lananaqcj6js8htau4		user	{"id": "user_34zvb6YsnjkI4IFo9qDJyUXGQfK"}	554tsug	559ybag	{"2g43j83a271g9": 1}
88nh1g3umqn4ia48q0		vine	{"id": "aba05f6d-ad19-493f-890a-458082563dd6"}	569svew	569svew	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "265f42b6-38ef-414f-b8ab-ee8b1ecefa77"}	569t5xc	569t5xc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6792080d-a921-4f33-860a-a86de02c566d"}	569thgo	569thgo	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "cb93f719-6f93-41f2-93c8-587cdded165a"}	569trgo	569trgo	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		block	{"id": "B"}	554tsug	55bsyns	\N
88nh1g3umqn4ia48q0		vine	{"id": "983499dd-793d-40ae-b7ba-69c5b4e79e7c"}	569u0yw	569u0yw	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "2fee47fe-e154-4b93-9773-b863bead54b1"}	569uago	569uago	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "c179406c-ed2c-47f7-b4cd-d19b80310f5f"}	569um2g	569um2g	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "866cbb44-4032-4536-98bb-442aeffc0003"}	569uvkg	569uvkg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "7c726a27-0472-43fc-b19c-9c45a0485e47"}	569v55k	569v55k	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "8248f6ff-50d9-4117-a787-46966eda9cf7"}	569vgko	569vgko	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6cd2ed45-1c67-4933-a6a6-fbc5db603407"}	569vq54	569vq54	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "493ec648-8daa-4658-8d0a-9247b67df304"}	569w0c8	569w0c8	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "ef5a56cb-dbe0-4a68-ac2c-46b0180af9b6"}	569w9w8	569w9w8	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "42ac871a-2b48-4f83-b4bc-572d0c378e8b"}	569wjew	569wjew	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "c29f4129-d560-487b-bb7d-49dacf08f35a"}	569wz0w	569wz0w	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "5e9dc619-6677-4232-b203-18977041d0fc"}	569xef4	569xef4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "4cdb8fe7-4a38-4882-9277-7fe3ba2abb26"}	569xnz4	569xnz4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "5963f7f1-bd29-44b6-b847-2b2323758dbc"}	569xxjk	569xxjk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "75dc882a-3549-4081-b030-f7ccb13f8559"}	569y73c	569y73c	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "711dd89e-923b-40c5-925e-e80aab36879e"}	569ygns	569ygns	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "04e10296-795b-4c69-bc3c-69d96957307b"}	569yqaw	569yqaw	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "ff9511d7-39be-4e90-88e0-14c6ee275f63"}	569z8vk	569z8vk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "33ab6f29-bdfd-4592-aa39-dc24bd4690ee"}	569zio0	569zio0	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "58d4c676-da7b-4e92-b03a-8c619419b5cc"}	569zyjk	569zyjk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6947e9c9-b791-412c-84c5-ecbd0974023c"}	56a08wo	56a08wo	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "d52449ed-f7cc-4455-a348-9d900e7ba5d5"}	56a0ihc	56a0ihc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "089b7e15-448d-408d-83f5-597a2226a9c4"}	56a0s2o	56a0s2o	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "851bb749-1ff7-4b95-97ef-af2d4aab34ef"}	56a14r4	56a14r4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "1abd3cc6-b868-4ad0-94a0-d21ce4e6730d"}	56a1ld4	56a1ld4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "49bc3f66-bb2d-4b68-b515-3a03bf6d49ed"}	56a1uzk	56a1uzk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "4b8163f4-e7ff-4c4b-b552-cbc5784e9d2c"}	56a24jc	56a24jc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "5bdc9e16-d8a1-4d8b-a819-1b3c8e2fb83a"}	56a2e0w	56a2e0w	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "93dc1793-39ab-4009-93c6-e336fc27ae48"}	56a2nj4	56a2nj4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "1d47e671-d554-4c46-b0e5-d2f7cc783ab5"}	56a2x0o	56a2x0o	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "f1f22415-f614-4629-aaa7-5f5035726b1e"}	56a36iw	56a36iw	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "099d2eea-399b-4b19-99c0-4abae1b74993"}	56a3g5s	56a3g5s	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "2a07f0fb-fea9-4bce-9dad-7549809ef5d3"}	56a3po0	56a3po0	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "868d1356-89bf-4f4a-959c-371e72fc26a5"}	56a3zcg	56a3zcg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "1c6499d0-49f4-410e-aaa3-3e960cdee417"}	56a494o	56a494o	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "f5505923-529b-477c-bdf3-aa5722c3de51"}	56a4io8	56a4io8	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "291afa87-9b81-427f-9e0e-7f5a97823252"}	56a4s6g	56a4s6g	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "a4a9ef3e-ef91-45e4-bb72-7ccfdf69805c"}	56a51o0	56a51o0	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "f91245d9-3961-4689-92e0-5194af06701b"}	56a5b88	56a5b88	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6deed08a-f4cf-4f5f-9cb6-1af365602bb2"}	56a5ksg	56a5ksg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "df1fbaeb-2f61-49aa-a2f6-ca837aed5946"}	569sjo8	569sjo8	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "d746b050-13af-4e3e-a956-989c9b5b4256"}	569t060	569t060	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "028e179d-3cfd-4b33-bd3d-5d429de96989"}	569tcq8	569tcq8	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "d74fd4c5-42e1-4a38-a17d-2fdbb330f5fa"}	569tm7s	569tm7s	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "25d28f05-a541-4e4e-adb6-e2f2bcbcd280"}	569tw7s	569tw7s	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "8d19e073-88ad-4d26-9f41-10ec3db02e82"}	569u5pc	569u5pc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "1b8e4186-fe92-4462-b2d8-613dfbfa35ba"}	569uf80	569uf80	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "3f748ffb-fa51-436b-b826-76c22f4555ec"}	569uqts	569uqts	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "97944117-5c2d-4cf3-a5a5-eab8179601e6"}	569v0e8	569v0e8	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "33b5ee3c-8c71-4f26-a276-940a8eb27679"}	569vbtc	569vbtc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6f84ab7e-c90d-4ad1-bf8b-8c2e87bea86b"}	569vlbc	569vlbc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "46916dc5-629f-4187-a756-7062699cb9de"}	569vuwg	569vuwg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "91de66fd-9b21-4126-b64a-6c0a226cf07d"}	569w53k	569w53k	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6c44de73-015d-4c31-8cdb-1d7fe7469391"}	569wenk	569wenk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "286f379d-8810-4735-b503-3ecb7eeaae61"}	569wo68	569wo68	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "933c15c8-bf85-46e0-8f15-c77105f22d24"}	569x9ns	569x9ns	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "b83484e6-04be-4c99-a5f5-d1eec6dc3e3e"}	569xj8g	569xj8g	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "d794888f-76c0-4803-88ab-353710f1ec1b"}	569xsqg	569xsqg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "d995da8e-e86c-48c9-a1cf-78795f8727cb"}	569y2aw	569y2aw	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "002"}	555kxeg	55brdcg	\N
lananaqcj6js8htau4		vine	{"id": "003"}	555l1rk	55brhmo	\N
lananaqcj6js8htau4		vine	{"id": "004"}	555l6a8	55brme8	\N
lananaqcj6js8htau4		vine	{"id": "005"}	555lapk	55brq9s	\N
lananaqcj6js8htau4		vine	{"id": "006"}	555lhow	55bru60	\N
lananaqcj6js8htau4		vine	{"id": "007"}	555lm3k	55bry40	\N
lananaqcj6js8htau4		vine	{"id": "008"}	555lqiw	55bs1zk	\N
lananaqcj6js8htau4		vine	{"id": "009"}	555lv2g	55bs5xs	\N
lananaqcj6js8htau4		vine	{"id": "010"}	555lzh4	55bs9v4	\N
lananaqcj6js8htau4		vine	{"id": "011"}	555m3wg	55bsdrc	\N
lananaqcj6js8htau4		vine	{"id": "012"}	555m8dk	55bshnk	\N
lananaqcj6js8htau4		vine	{"id": "013"}	555mcs8	55bslkw	\N
lananaqcj6js8htau4		vine	{"id": "014"}	555mh60	55bsph4	\N
lananaqcj6js8htau4		vine	{"id": "015"}	555mlm8	55bstfc	\N
lananaqcj6js8htau4		vine	{"id": "016"}	555odyg	55btf8g	\N
lananaqcj6js8htau4		vine	{"id": "017"}	555oeig	55btj4o	\N
lananaqcj6js8htau4		vine	{"id": "018"}	555oka8	55btn20	\N
lananaqcj6js8htau4		vine	{"id": "019"}	555or4o	55btqy8	\N
lananaqcj6js8htau4		vine	{"id": "020"}	555ovjk	55btuwg	\N
lananaqcj6js8htau4		vine	{"id": "021"}	555ozwo	55btyts	\N
lananaqcj6js8htau4		vine	{"id": "022"}	555p494	55bu2q0	\N
lananaqcj6js8htau4		vine	{"id": "023"}	555p8q0	55bu6lk	\N
lananaqcj6js8htau4		vine	{"id": "024"}	555pd34	55buai0	\N
lananaqcj6js8htau4		vine	{"id": "025"}	555phfk	55bueeg	\N
lananaqcj6js8htau4		vine	{"id": "0015d27d-cd42-42a4-992e-4214ff85990b"}	559virk	55bvxmw	\N
88nh1g3umqn4ia48q0		vine	{"id": "471e0355-907d-4b73-bcbf-e6ea4d6cdb7b"}	569ybwg	569ybwg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "870be429-9f7b-4628-b077-50ac9cd34e0f"}	569ylio	569ylio	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "q6nn4anq1ollumgndb", "clientGroupID": "lananaqcj6js8htau4"}	55gew7s	55gew7s	{"lmids": 1}
88nh1g3umqn4ia48q0		vine	{"id": "bc6c011c-4dd4-499d-b340-187b31410f89"}	569z43c	569z43c	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "bcdf7992-f2e5-4e38-97f4-de120b45f266"}	569zdog	569zdog	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "12a935b7-7614-4a24-aa22-b712c72e798b"}	569zngw	569zngw	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "4f3c680c-2a8a-4a21-9a18-54da5159ffc4"}	56a0440	56a0440	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "741ad686-e3a0-4891-b43e-40a4303f9612"}	56a0dpc	56a0dpc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "f4ff844b-e352-4aef-ba36-cd46660982aa"}	56a0na0	56a0na0	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "1fcf0655-9f15-4c8e-963e-1e71892f760a"}	55cz2fc	55dfdpc	\N
lananaqcj6js8htau4		vine	{"id": "48ef9797-142a-4d83-b02c-438412b8c5e7"}	55czfx4	55didi0	\N
lananaqcj6js8htau4		vine	{"id": "5230c6b3-fed4-48ec-acb0-953645448515"}	55cxsi8	55dj1nk	\N
lananaqcj6js8htau4		vine	{"id": "78e4ab98-a589-4ed9-840b-4d4bf74e00b5"}	55cwbwo	55dllw0	\N
lananaqcj6js8htau4		vine	{"id": "b09ed508-534f-486f-90fe-781970245686"}	55cv26g	55dqai8	\N
88nh1g3umqn4ia48q0		vine	{"id": "be424e45-d07c-4b38-9a1f-89e94db7423f"}	56a0wvc	56a0wvc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "243e7805-3ace-44cc-aeac-39ec6ada09b9"}	56a1aag	56a1aag	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "b060b47a-1619-44b1-b2ac-c744d919bde5"}	56a1q54	56a1q54	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "88baa42c-e49d-4c19-8d31-c7e542b1ed90"}	56a1zs8	56a1zs8	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "9e7c6d0f-0a1f-46c8-8980-95777e4c1f70"}	56a299s	56a299s	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "4e4a2e41-6ad6-44cb-8999-6a9075359b1a"}	56a2is0	56a2is0	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "c75aa168-ed8a-4634-bce0-2c3daadf9df4"}	56a2s9k	56a2s9k	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "17681df8-07a0-4a2d-9cfe-8da24613d477"}	56a31rs	56a31rs	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "66d4b644-a731-428c-b396-c27c04dbb0b5"}	56a3bcg	56a3bcg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "2bfb082f-3a18-4586-abc9-e3cbf243e305"}	56a3kww	56a3kww	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6f989a5b-1aa7-4736-a62a-b30b59f08fca"}	56a3ueg	56a3ueg	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "00896936-230f-4745-bb9c-d993ce233311"}	55ehwbk	55fd0uw	\N
88nh1g3umqn4ia48q0		vine	{"id": "301b831b-bf8c-44cb-bb1b-b115a66db961"}	56a44dk	56a44dk	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "0160ccc0-ae63-47e2-86f9-a16c0da265f2"}	55ctsj4	55ddl1k	\N
lananaqcj6js8htau4		vine	{"id": "e3e62df1-06df-4df2-9c22-d4337653e174"}	55cvbco	55dsebk	\N
lananaqcj6js8htau4		vine	{"id": "f3f8fe38-b667-44ef-ac2f-b24c603593a7"}	55cu1ow	55dtu8w	\N
lananaqcj6js8htau4		vine	{"id": "f618ad3b-9a5e-4a11-abd1-525a31780bc9"}	55cwl1s	55du68w	\N
88nh1g3umqn4ia48q0		vine	{"id": "b091e11a-0aa2-4a72-82cb-6c765661bc60"}	56a4dvs	56a4dvs	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "f1bf75d0-4dd6-4c80-bc2c-38f201b251a0"}	56a4nfc	56a4nfc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "61953c50-102d-4b9c-ab07-12d19d7e9cd3"}	56a4wxk	56a4wxk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "4c8ace7b-adab-4912-9c8c-e46460a7319d"}	56a56f4	56a56f4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "41942f95-57f1-4d8e-b7cb-22f1cfa4f7f0"}	56a5fzc	56a5fzc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "1780ab1a-ceaf-4ffa-8322-e77748757fe6"}	56a5qjk	56a5qjk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "b2387bf2-0426-42c3-9ccb-856278f49407"}	56a65ig	56a65ig	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "026"}	555plug	55buii0	\N
lananaqcj6js8htau4		vine	{"id": "027"}	555pq7k	55buso0	\N
lananaqcj6js8htau4		vine	{"id": "028"}	555pumg	55buwjk	\N
lananaqcj6js8htau4		vine	{"id": "029"}	555pz0o	55bv3ow	\N
lananaqcj6js8htau4		vine	{"id": "030"}	555q3ds	55bv7m8	\N
lananaqcj6js8htau4		vine	{"id": "031"}	555q7so	55bvbig	\N
lananaqcj6js8htau4		vine	{"id": "032"}	555qc6w	55bvfk0	\N
lananaqcj6js8htau4		vine	{"id": "033"}	555qgls	55bvji0	\N
lananaqcj6js8htau4		vine	{"id": "034"}	555tce8	55bw1pc	\N
lananaqcj6js8htau4		vine	{"id": "035"}	555tcy8	55bw5lk	\N
lananaqcj6js8htau4		vine	{"id": "036"}	555tl7k	55bw9j4	\N
lananaqcj6js8htau4		vine	{"id": "037"}	555tpk0	55bwdh4	\N
lananaqcj6js8htau4		vine	{"id": "038"}	555tu0o	55bwhco	\N
lananaqcj6js8htau4		vine	{"id": "039"}	555tyds	55bwlco	\N
lananaqcj6js8htau4		vine	{"id": "03fd4586-2ca2-43c8-9ea7-323c70a867ea"}	559y6t4	55bwpbs	\N
lananaqcj6js8htau4		vine	{"id": "040"}	555u2so	55bwtbk	\N
lananaqcj6js8htau4		vine	{"id": "040e0e6c-be0d-45f4-a884-f3d6830176ed"}	559kkdk	55bx3lk	\N
lananaqcj6js8htau4		vine	{"id": "041"}	555u7a0	55bx7v4	\N
lananaqcj6js8htau4		vine	{"id": "042"}	555uboo	55bxbqo	\N
lananaqcj6js8htau4		vine	{"id": "043"}	555ujnk	55bxfmw	\N
lananaqcj6js8htau4		vine	{"id": "044"}	555uo2g	55bxjkw	\N
lananaqcj6js8htau4		vine	{"id": "045"}	555ut3c	55bxngg	\N
lananaqcj6js8htau4		vine	{"id": "046"}	555uxfs	55bxrl4	\N
lananaqcj6js8htau4		vine	{"id": "047"}	555uzbk	55bxvig	\N
lananaqcj6js8htau4		vine	{"id": "048"}	555v3ps	55bxzeo	\N
lananaqcj6js8htau4		vine	{"id": "049"}	555v5n4	55by39c	\N
lananaqcj6js8htau4		vine	{"id": "050"}	555v9y0	55by76w	\N
lananaqcj6js8htau4		vine	{"id": "051"}	555vevc	55byb1k	\N
lananaqcj6js8htau4		vine	{"id": "052"}	555vgqg	55byf4o	\N
lananaqcj6js8htau4		vine	{"id": "7d43b040-91f1-4c57-8cc9-c2df6441ff96"}	559mdyw	55cbgsg	\N
lananaqcj6js8htau4		vine	{"id": "ae077fa6-de8f-4bb3-b69b-86a9eea5851e"}	559rze0	55cgru0	\N
88nh1g3umqn4ia48q0		vine	{"id": "c9669f88-9b29-4415-88ce-bbd7b8eee0ec"}	56a6iao	56a6iao	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "3038ea4b-b66f-41de-80ab-3a062af43c45"}	56a6rvk	56a6rvk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "e38e27d6-a0a9-47d6-ac5a-f3a728e572ad"}	56a71lk	56a71lk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "a1789c1a-32ce-4ef1-8c34-0603cb170d5c"}	56a7b68	56a7b68	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "8f09fe50-abe4-4edf-92ae-9c9f2b427cdd"}	56a7krk	56a7krk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "01da32fc-85e1-430a-936b-71f7d53c7355"}	56a5ve0	56a5ve0	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "8276949e-4056-4266-9a6c-c8311b79a73b"}	56a6aao	56a6aao	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "f188608e-2eba-42b7-980d-e49458862b55"}	56a6n2w	56a6n2w	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "e877247d-01a0-4514-9d17-d52704783a1d"}	56a6wps	56a6wps	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "bbae4913-fac2-438a-87ff-aa9e86361627"}	56a76dk	56a76dk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "b135d00e-6b3d-42e3-980d-7d96a95f934a"}	56a7fyw	56a7fyw	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "397d6e65-5a33-49bd-b53e-4eecf36f6baf"}	56a7pjk	56a7pjk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "a90866df-e9ef-4640-aaee-4c9ece623454"}	56a829s	56a829s	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "669e78e2-732d-4f46-bab6-e4a87aaa449c"}	56a8i54	56a8i54	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "f6b18658-8c6a-46fa-a3bc-8d65a4915306"}	56a8rqg	56a8rqg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "8e02b464-c57d-480b-910e-2189bb103bae"}	56a91b4	56a91b4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "1e5fddd2-4808-4c60-85b3-6b6c9f2cc0c3"}	56a9awg	56a9awg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "e83c6161-7b3e-4410-9efc-3a038985a36b"}	56a9kh4	56a9kh4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "9cbc9cb6-4883-431d-b61f-6f029c90a17d"}	56a9u2g	56a9u2g	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "49f3eb9f-31e1-47fb-a39e-86384c2fb11a"}	56aa3ps	56aa3ps	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "64650a19-fcb8-45fc-b116-3e524c1c4f95"}	56aadb4	56aadb4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "2477b66c-42e9-4b14-83ee-e2d72a30a4dc"}	56aankw	56aankw	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "8d7a4cd8-cdd2-408a-baab-a2853c28f3a7"}	56aax68	56aax68	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "ab56d74a-4ade-4067-8711-e8fc53e26de0"}	56ab6so	56ab6so	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "9efe0375-e49a-4a0e-95fa-175f01ee83d4"}	56abgcg	56abgcg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "11b874f3-5350-4cb9-9a21-cf3472eeb6cb"}	56abpu0	56abpu0	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "80783890-aa16-4cab-8e09-351af84f4f64"}	56abze0	56abze0	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "80358e79-89de-4d1a-855e-2631c8a851ae"}	56ac8vk	56ac8vk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "766625e0-2489-4644-975f-8dcc9ea906a5"}	56acim8	56acim8	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "a207cd86-c5c2-423d-a6f6-8b0cc881ef92"}	56acs6g	56acs6g	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "53b30ce6-6704-45f0-8eba-732f18ef639a"}	56ad1qg	56ad1qg	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6f9fce41-4e42-4bfe-912c-72008107d1eb"}	56adbbc	56adbbc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "ebb4590a-d492-4388-9738-99c7bf9c1816"}	56adkwo	56adkwo	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "01b033e1-8711-4e15-baa7-3b9095aaf854"}	56aduhc	56aduhc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "e729e169-256a-40ef-bebb-8680d6394121"}	56ae42o	56ae42o	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6977f6d5-1cec-4173-a4a6-40cb3d53c5e5"}	56aednc	56aednc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "febda5b0-283b-4773-8e91-b7a05fd4de10"}	56a7uc8	56a7uc8	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "f6ddbc89-3105-483b-9bdc-5d753c6457ac"}	56a872g	56a872g	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "8c04fe54-84e4-47c6-9f27-86cf3a9671df"}	56a8mxs	56a8mxs	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "1bc475a2-e734-446a-8e9e-5890472eefc5"}	56a8wig	56a8wig	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "abfcb4af-bda4-4666-918a-37d2297c1177"}	56a963s	56a963s	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "76171cd9-8de2-4c54-ab51-a938e6378bfe"}	56a9fog	56a9fog	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "8a1c3652-5e2b-48a3-ba20-30be4c327629"}	56a9p9s	56a9p9s	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "db193ec1-3b92-497c-9c02-fe94ad018cfb"}	56a9yug	56a9yug	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "978c8e19-aa85-41d4-aaed-3c419bacf824"}	56aa8ig	56aa8ig	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "e3d9b913-bf62-4a07-9a02-729130177add"}	56aai34	56aai34	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "6af807fd-9253-46a4-a5d3-7e8f3fef9324"}	56aasdk	56aasdk	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "ac3ceded-91dc-4fde-92e3-a16c630c82b7"}	56ab1yw	56ab1yw	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "d83aab95-afb4-47e6-b933-b107331f6dde"}	56abblc	56abblc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "4411efca-6030-4a8b-913c-9b50a62380ba"}	56abl3k	56abl3k	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "25c758b2-4659-45ef-ad1f-a3b78615c7a1"}	56abul4	56abul4	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "877e26c8-1e25-4933-ba83-4be46a8e4d82"}	56ac454	56ac454	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "f27468d3-9029-4f42-a073-39070701c860"}	56acdmo	56acdmo	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "54m3rs68vas04rcqlk", "clientGroupID": "uk74dsudpgd94faf3n"}	560fif4	560fif4	{"lmids": 1}
88nh1g3umqn4ia48q0		vine	{"id": "e84975c5-4e97-4520-ad0b-ee7ae0484783"}	56acng0	56acng0	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		zero_0.mutations	{"clientID": "54m3rs68vas04rcqlk", "mutationID": 1, "clientGroupID": "uk74dsudpgd94faf3n"}	560fif4	560g6i8	\N
lananaqcj6js8htau4		vine	{"id": "0289f8f2-baa4-48c0-bb08-9d66c819be5b"}	55cu3o8	55ddp3k	\N
lananaqcj6js8htau4		vine	{"id": "04c24a54-50b9-4e57-a2a4-86f8c2f561bd"}	55cy64o	55de17k	\N
lananaqcj6js8htau4		vine	{"id": "783c917f-8b94-468b-8d8a-66edba8650b8"}	55cvfzc	55dlhu8	\N
lananaqcj6js8htau4		vine	{"id": "85a6b3c9-880e-4009-ab73-be7117228f59"}	55cwpmo	55dmq8w	\N
lananaqcj6js8htau4		vine	{"id": "9de4eb52-751a-4c64-b6fd-ed604aea0a3b"}	55csvx4	55doe5c	\N
88nh1g3umqn4ia48q0		vine	{"id": "c3444638-d886-4358-a82c-41d832a636ee"}	56acwzc	56acwzc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "806d4af9-e4cd-4358-bf5d-bc21394294e8"}	56ad6jc	56ad6jc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "8f449637-033e-4e5b-a3d1-84c93f8fa9a7"}	56adg40	56adg40	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "84e01b8c-a8c9-41de-8a74-490ed4881ba2"}	56adppc	56adppc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		vine	{"id": "a2d983f2-4f1d-40da-89c5-802dfcc17dd7"}	56adza0	56adza0	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "053"}	555vljc	55byvnk	\N
lananaqcj6js8htau4		vine	{"id": "05a97e93-e18b-4246-90e4-c8ff883fa99b"}	559bw48	55bz5x4	\N
lananaqcj6js8htau4		vine	{"id": "0650623f-f5e4-4284-899f-0baf8ca71c39"}	559bfvs	55bz9y0	\N
lananaqcj6js8htau4		vine	{"id": "0804cb0c-3ae6-4b7d-8164-5a1c9f593fc3"}	5598eaw	55bzkco	\N
lananaqcj6js8htau4		vine	{"id": "0c1ca87b-6257-4db1-8044-74232788148a"}	559ln00	55bzoe8	\N
lananaqcj6js8htau4		vine	{"id": "0c3cb357-b530-45ca-a61c-44b59152e951"}	559eiwg	55bzsh4	\N
lananaqcj6js8htau4		vine	{"id": "11e1cffd-5ee8-478e-86f8-fa9e4c33d254"}	559bbaw	55bzwkg	\N
lananaqcj6js8htau4		vine	{"id": "127e323a-2edb-430b-9b93-0aa696a02c1e"}	559t8l4	55c06wo	\N
lananaqcj6js8htau4		vine	{"id": "130b7c60-cfee-42d7-9f05-09f2f71b51ac"}	559lvyo	55c0axk	\N
lananaqcj6js8htau4		vine	{"id": "13c47608-f2f9-406c-91fb-067e5d3f2271"}	559sm3k	55c0f0w	\N
lananaqcj6js8htau4		vine	{"id": "14189762-f472-485f-9986-0c66d285e53c"}	559j5z4	55c0j2g	\N
lananaqcj6js8htau4		vine	{"id": "14a622e7-acd9-4b4d-a020-f27a55917cc0"}	559sv40	55c0n5c	\N
lananaqcj6js8htau4		vine	{"id": "14d3ee2e-c113-43c0-ba8e-2c3ecfe242ee"}	559s8fc	55c0rzc	\N
lananaqcj6js8htau4		vine	{"id": "154d450a-bd9a-460f-8802-f23b6d4e2725"}	559v0ds	55c0w0w	\N
lananaqcj6js8htau4		vine	{"id": "168ed994-ca43-4b0d-a570-55cbe3d89103"}	5598jls	55c101s	\N
lananaqcj6js8htau4		vine	{"id": "17de8518-bb0c-46ec-9465-94ff2ccc5411"}	559mz34	55c1454	\N
lananaqcj6js8htau4		vine	{"id": "189ebec6-f6f3-47f0-8a7e-c3b405d188e0"}	559ocq0	55c18ao	\N
lananaqcj6js8htau4		vine	{"id": "19abf3b4-2e5b-484d-842d-022ab77a3f7d"}	559ab6o	55c1cdk	\N
lananaqcj6js8htau4		vine	{"id": "1b9423cd-2473-4e26-83ad-f37d71748ccb"}	559ditc	55c1ggw	\N
lananaqcj6js8htau4		vine	{"id": "1bf8b12b-4785-4768-ba9d-fcb096c6bd0c"}	559ktdc	55c1kjc	\N
lananaqcj6js8htau4		vine	{"id": "1dc7f22e-8e7e-4c4a-824c-6bb72269295a"}	559jahk	55c1okw	\N
lananaqcj6js8htau4		vine	{"id": "1fcf9f86-17cb-4fce-b38b-36ac45b7dfb6"}	559tm40	55c1smo	\N
88nh1g3umqn4ia48q0		vine	{"id": "48f2c08e-e313-4d2c-81f9-11e913dcb659"}	56ae8vc	56ae8vc	{"3t09dyzubc9zp": 1}
88nh1g3umqn4ia48q0		zero_0.clients	{"clientID": "15vovggackulaosh7a", "clientGroupID": "88nh1g3umqn4ia48q0"}	56aednc	56aednc	{"lmids": 1}
88nh1g3umqn4ia48q0		zero_0.clients	{"clientID": "uuigjoj29dpmtalhsp", "clientGroupID": "88nh1g3umqn4ia48q0"}	56auau8	56auau8	{"lmids": 1}
uk74dsudpgd94faf3n		zero_0.mutations	{"clientID": "f0hjjppmk4879lddns", "mutationID": 1, "clientGroupID": "uk74dsudpgd94faf3n"}	560gna8	560gx2o	\N
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "f0hjjppmk4879lddns", "clientGroupID": "uk74dsudpgd94faf3n"}	560ieiw	560ieiw	{"lmids": 1}
lananaqcj6js8htau4		task_template	{"id": "tt_fruiting_1"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		vine	{"id": "32e0f6b3-6f00-4ff7-90f8-a4cb3acd43f4"}	55cwu7c	55dgl3s	\N
lananaqcj6js8htau4		vine	{"id": "35596f5e-6197-41b4-8f78-6d8bbf9bd568"}	55cvkhs	55dgp3s	\N
lananaqcj6js8htau4		vine	{"id": "6a6744b0-2a1a-4559-9c5d-7a01e6aa7243"}	55czkeo	55dkmf4	\N
lananaqcj6js8htau4		vine	{"id": "a56df6b5-6581-4547-896e-8a22a1c242a3"}	55cyapk	55dp2ag	\N
lananaqcj6js8htau4		vine	{"id": "ae53915b-5198-4e42-8e0d-3f39dc3b7bbd"}	55ct0jc	55dpuko	\N
uk74dsudpgd94faf3n		zero_0.mutations	{"clientID": "f0hjjppmk4879lddns", "mutationID": 2, "clientGroupID": "uk74dsudpgd94faf3n"}	560ieiw	560iits	\N
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "mimq96bbomdq325vbq", "clientGroupID": "uk74dsudpgd94faf3n"}	560jhfs	560jhfs	{"lmids": 1}
uk74dsudpgd94faf3n		zero_0.mutations	{"clientID": "mimq96bbomdq325vbq", "mutationID": 1, "clientGroupID": "uk74dsudpgd94faf3n"}	560jhfs	560jlo0	\N
lananaqcj6js8htau4		vine	{"id": "249a15f9-88a3-47f9-adb1-05cc4defbc42"}	559fiww	55c275c	\N
lananaqcj6js8htau4		vine	{"id": "259c34e0-15f5-4fa8-b31e-e461520e5cfc"}	5597uow	55c2b74	\N
lananaqcj6js8htau4		vine	{"id": "269bfe30-82d2-4c73-b405-eee309019aa6"}	559l2g0	55c2f80	\N
lananaqcj6js8htau4		vine	{"id": "2847029c-58c3-4ecf-9140-c15b10e1e00a"}	559a26w	55c2jb4	\N
lananaqcj6js8htau4		vine	{"id": "29e3cdc9-f8e4-482e-9e77-cbd92855004c"}	559afps	55c2qlc	\N
lananaqcj6js8htau4		vine	{"id": "2a8bc13d-fe76-41a6-92f7-d2e6f4efef3f"}	559jf14	55c2ulc	\N
lananaqcj6js8htau4		vine	{"id": "3013b129-9723-4799-87e3-0695f921bf2e"}	559ewfc	55c2ymo	\N
lananaqcj6js8htau4		vine	{"id": "30b13db1-fb7e-44cb-9253-82c2b43b3edd"}	559m0g0	55c32og	\N
lananaqcj6js8htau4		vine	{"id": "319e0b2d-9f70-426a-9c50-7e265ba9eacf"}	559iedk	55c36og	\N
lananaqcj6js8htau4		vine	{"id": "35916cd7-1c42-4aa3-806e-65d31a44185f"}	559v4ww	55c3ans	\N
lananaqcj6js8htau4		vine	{"id": "36b198ff-166c-43e8-9715-305222db2c0b"}	559m9fs	55c3er4	\N
lananaqcj6js8htau4		vine	{"id": "397b529e-90fa-4d1d-ae00-00a1e3f0c210"}	559xjns	55c3ir4	\N
lananaqcj6js8htau4		vine	{"id": "398e92a7-5065-4f35-b9a7-471286997b24"}	559wjn4	55c3mu0	\N
lananaqcj6js8htau4		vine	{"id": "3bf7c9e3-18a2-42e2-a230-aa40348971c9"}	559t43s	55c3qxc	\N
lananaqcj6js8htau4		vine	{"id": "3d7f24ed-aa55-4f6c-aeef-f4dd72635713"}	559nz3k	55c3uwo	\N
lananaqcj6js8htau4		vine	{"id": "3e23cfc7-4300-4f7e-b8e1-fd42e607c2cd"}	559wsl4	55c3ywo	\N
lananaqcj6js8htau4		vine	{"id": "3e2d7f0f-abcf-421c-97fe-8110e3b3048a"}	559xxv4	55c42yg	\N
lananaqcj6js8htau4		vine	{"id": "3e6d787e-60a0-48dc-b7a0-58c49072582c"}	559xta0	55c46xs	\N
lananaqcj6js8htau4		vine	{"id": "3e76d835-ad22-4165-866f-7b82239df328"}	559p8dc	55c4b94	\N
lananaqcj6js8htau4		vine	{"id": "3fa704c1-1e01-4085-bcd8-ecd6834ec30e"}	559u4jc	55c4faw	\N
88nh1g3umqn4ia48q0		pruning_log	{"id": "13803215-cdc0-4566-a1ba-6a77c83ede8f"}	562f7jc	56auau8:0a	\N
88nh1g3umqn4ia48q0		pruning_log	{"id": "59fa8aaf-9f63-41b6-97d3-70ce4f13d9be"}	562fnnc	56auau8:0a	\N
88nh1g3umqn4ia48q0		pruning_log	{"id": "7f2e0eea-1ce8-46dc-b8f2-b8bc5e800eda"}	562damg	56auau8:0a	\N
88nh1g3umqn4ia48q0		pruning_log	{"id": "80f1064f-4ad7-4ee2-b7c8-2067507fa71e"}	563hnrs	56auau8:0a	\N
uk74dsudpgd94faf3n		zero_0.mutations	{"clientID": "fi6emo63bpgt4jqqrn", "mutationID": 1, "clientGroupID": "uk74dsudpgd94faf3n"}	560sf48	560tfr4	\N
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "fi6emo63bpgt4jqqrn", "clientGroupID": "uk74dsudpgd94faf3n"}	560v3co	560v3co	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "7d339b82-f99e-413d-880a-18f543e488f1"}	55cufd4	55dltvc	\N
lananaqcj6js8htau4		vine	{"id": "85c84e8a-af6d-43f5-a212-760dad8bf2d5"}	55cvp2o	55dmu8w	\N
lananaqcj6js8htau4		vine	{"id": "aac5187d-ad96-4809-a7fc-2ba034107a1d"}	55ct53k	55dpebs	\N
lananaqcj6js8htau4		vine	{"id": "acbadbfc-158c-41a6-9b0c-0222a4dea161"}	55cwyt4	55dpqew	\N
uk74dsudpgd94faf3n		zero_0.mutations	{"clientID": "fi6emo63bpgt4jqqrn", "mutationID": 2, "clientGroupID": "uk74dsudpgd94faf3n"}	560v3co	560vfaw	\N
lananaqcj6js8htau4		vine	{"id": "430a01fb-c96c-4e90-ad22-06ed567a015b"}	559jjk8	55c4tiw	\N
lananaqcj6js8htau4		vine	{"id": "43d7745f-b64b-4674-b050-9a836cadf857"}	559pmi0	55c4xko	\N
lananaqcj6js8htau4		vine	{"id": "45931ba0-325f-4c09-8134-723f4ba6aa29"}	559y2bs	55c51k0	\N
lananaqcj6js8htau4		vine	{"id": "47f6f3bd-984f-418c-88a3-ae3943100d87"}	559ur9s	55c55m0	\N
lananaqcj6js8htau4		vine	{"id": "48692355-17f7-4b14-ba8c-8ba08935bf34"}	559m4yg	55c59q0	\N
lananaqcj6js8htau4		vine	{"id": "4a1103b8-76db-4d33-b736-8fa2862f9231"}	559q9hs	55c5ehk	\N
lananaqcj6js8htau4		vine	{"id": "4b01f209-8055-4dcf-8528-b2a4d7431623"}	559nck8	55c5ihk	\N
lananaqcj6js8htau4		vine	{"id": "4c9316b5-7d71-4947-b418-10977162e8e9"}	5599onk	55c5mjc	\N
lananaqcj6js8htau4		vine	{"id": "503aca1b-2d67-4968-a8db-e37fa3c97c6c"}	559pi1c	55c5qio	\N
lananaqcj6js8htau4		vine	{"id": "51ab19d7-2474-45e0-8833-ecab40202062"}	559ui9c	55c5uko	\N
lananaqcj6js8htau4		vine	{"id": "52a028ef-84f2-41a5-9289-b93af8cecfc7"}	559k2dc	55c5yls	\N
lananaqcj6js8htau4		vine	{"id": "535fd9ed-d50b-4859-b5a8-9c442f002e69"}	559bke0	55c62ls	\N
lananaqcj6js8htau4		vine	{"id": "5380a1f1-3cef-4df6-addf-a2eec851b2cd"}	559td48	55c66ls	\N
lananaqcj6js8htau4		vine	{"id": "54b6bed5-23b4-4e56-8806-c2d1fffffb72"}	559jo0w	55c6aqw	\N
lananaqcj6js8htau4		vine	{"id": "566582e0-fc9b-4ae6-8f43-7ea4a88728f3"}	559qrn4	55c6eug	\N
lananaqcj6js8htau4		vine	{"id": "585fd297-ed63-4ecb-b3b5-788cb7ab7443"}	559n83k	55c6iwg	\N
lananaqcj6js8htau4		vine	{"id": "68042c9b-7f69-4fd0-9e4e-8c0f190e704c"}	55cujw8	55dkae0	\N
lananaqcj6js8htau4		vine	{"id": "c283ea13-d639-411b-b3cd-04a969b778bb"}	55cvtnk	55dqyew	\N
lananaqcj6js8htau4		vine	{"id": "c461fc1e-8c45-45b9-a1e0-7fe58c7bb1ed"}	55ct9mo	55dr2go	\N
lananaqcj6js8htau4		task_template	{"id": "tt_harvest_3"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		vine	{"id": "58d21f2a-be30-4965-81bb-d9c169b4f51a"}	559pvyw	55c6mxk	\N
lananaqcj6js8htau4		vine	{"id": "5927ca21-4782-4872-84e3-99258f6b247c"}	559ve2w	55c6x4w	\N
lananaqcj6js8htau4		vine	{"id": "5cee503f-4fd7-440f-8fac-895f7f4a6f4e"}	559fs0g	55c714w	\N
lananaqcj6js8htau4		vine	{"id": "5e55645f-9057-4289-acf1-baff4cd3ae45"}	559kxuo	55c7560	\N
lananaqcj6js8htau4		vine	{"id": "5f31da8c-1d06-43dc-8063-a532b76beca6"}	559c0lk	55c7960	\N
lananaqcj6js8htau4		vine	{"id": "5ffb4869-9625-465e-b0f7-cfa7ee017409"}	559pcuo	55c7d7c	\N
lananaqcj6js8htau4		vine	{"id": "60702171-7ae7-45b2-9d96-42dbc87dde12"}	5598t28	55c7h94	\N
lananaqcj6js8htau4		vine	{"id": "61397991-535a-44dc-a794-33cd97797f92"}	559rcwg	55c7lao	\N
lananaqcj6js8htau4		vine	{"id": "615f3d35-9c81-4d4b-813a-2aeb05cc1870"}	559erww	55c7pa0	\N
lananaqcj6js8htau4		vine	{"id": "617c9bd7-a381-416c-a725-07efb4eb0336"}	559nh3c	55c7tbs	\N
lananaqcj6js8htau4		vine	{"id": "62600ac6-342e-4fa1-bc08-0dae0133ec2c"}	559tqlc	55c7xe8	\N
lananaqcj6js8htau4		vine	{"id": "65e80344-9275-40a0-b351-62fd0806800c"}	559qdz4	55c84oo	\N
lananaqcj6js8htau4		vine	{"id": "6692e543-7cb1-4a13-97fc-1e58729eeeda"}	559wx6g	55c88ps	\N
lananaqcj6js8htau4		vine	{"id": "66cbc029-580c-4c8f-bb93-2b4160995361"}	559p3q0	55c8cps	\N
lananaqcj6js8htau4		vine	{"id": "66edd819-2b41-4fe1-a8e8-6f2ee3dcb3df"}	559tzy0	55c8gps	\N
uk74dsudpgd94faf3n		vine	{"id": "b8fe40b5-7833-4b0d-9014-c2ded9959864"}	55zqfjs	561nv60:0e	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		vine	{"id": "cb8ab73e-ada6-4816-861b-0c1b768ca8c1"}	55zqfjs	561nv60:0e	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		block	{"id": "AB"}	55fyvq0	561nv60:0e	{"3unh7411ka0tz": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "eabmcuik4r5qhpjqfl", "clientGroupID": "lananaqcj6js8htau4"}	55f15wg	55f15wg	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "13fae376-c690-47e0-9d66-c81698a9fde8"}	55cyoxk	55delc8	\N
lananaqcj6js8htau4		vine	{"id": "5a33fed0-0f1c-4840-a716-34b08074c5ea"}	55cvy7s	55djmbs	\N
lananaqcj6js8htau4		vine	{"id": "841dce1c-5721-40ef-b034-bb8fc2fbec4b"}	55cte7k	55dmm8w	\N
lananaqcj6js8htau4		vine	{"id": "b207386d-9043-4952-83e5-4f76b814446c"}	55czy2w	55dqik8	\N
lananaqcj6js8htau4		vine	{"id": "eb7df657-4d98-40bc-8fe9-8d528eb64f27"}	55cx7yg	55dta8w	\N
uk74dsudpgd94faf3n		vine	{"id": "db064127-e9da-43a8-9ceb-93297b028505"}	55zqfjs	561nv60:0e	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		vine	{"id": "fe20b6dd-6e46-4ef6-a5fa-a73d453641cf"}	55zqfjs	561nv60:0e	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		vine	{"id": "ffb8a0c3-588a-40a0-9a69-96097cfa900e"}	55zqfjs	561nv60:0e	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		vineyard	{"id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589"}	55gew7s	561nv60:0e	{"817el2k23zdp": 1}
lananaqcj6js8htau4		vine	{"id": "685e2522-0628-4e3f-8c81-a539697980d1"}	559ht3k	55c8v14	\N
lananaqcj6js8htau4		vine	{"id": "6a896d68-e74c-499c-9bdc-ce4baf31e54d"}	559scyw	55c8zs8	\N
lananaqcj6js8htau4		vine	{"id": "6aea040b-b9ef-4b9b-ae0f-00d7db7ab547"}	559kbd4	55c93tc	\N
lananaqcj6js8htau4		vine	{"id": "6cac2813-7225-4a14-82ee-9e6812ce47bd"}	559cip4	55c97tc	\N
lananaqcj6js8htau4		vine	{"id": "6d0f4948-699b-42a8-8339-f5827873bb54"}	559gemw	55c9bzs	\N
lananaqcj6js8htau4		vine	{"id": "6e59ac09-51e3-47c1-b95a-8e064ae1f639"}	559r548	55c9g0w	\N
lananaqcj6js8htau4		vine	{"id": "6ec376d3-f4aa-4230-aed6-830b0d4e0486"}	559xo54	55c9k0w	\N
lananaqcj6js8htau4		vine	{"id": "6fc966e6-a39d-4b3b-b90c-9a6794c077aa"}	559f0wo	55c9o2w	\N
lananaqcj6js8htau4		vine	{"id": "70caa1c0-e5b4-4f2a-88ae-6c8d79f7a526"}	559lrfk	55c9s40	\N
lananaqcj6js8htau4		vine	{"id": "71eb460e-042a-4111-a3a2-84a98319c1ea"}	559at8w	55c9w40	\N
lananaqcj6js8htau4		vine	{"id": "7281af8e-1eda-4f26-85d0-14114eb7a4b1"}	559kfug	55ca0ag	\N
lananaqcj6js8htau4		vine	{"id": "72950a14-6d92-489e-9056-6f6f9195d4c1"}	559drts	55ca4c8	\N
lananaqcj6js8htau4		vine	{"id": "763851cf-e40d-4a42-91c9-bcd5605f2955"}	559g5mg	55ca8c8	\N
lananaqcj6js8htau4		vine	{"id": "7677dd52-7ff8-4a99-a586-14ee50e0ac5c"}	559hoko	55cacdk	\N
lananaqcj6js8htau4		vine	{"id": "77009532-89e9-4624-a8a0-740225665ce3"}	559crow	55cagfc	\N
lananaqcj6js8htau4		vine	{"id": "78bc2d1e-9108-4119-b371-7d71900ca3c8"}	5599948	55cakfc	\N
lananaqcj6js8htau4		vine	{"id": "79708b8c-9725-4036-9da2-ac422ea6f6bb"}	559hfhk	55caojs	\N
lananaqcj6js8htau4		vine	{"id": "7a125ff4-7ce9-4bbf-9429-3c9260bcb088"}	559mq1s	55caslk	\N
lananaqcj6js8htau4		vine	{"id": "7aba5063-5317-43bf-814c-d02273a4eb2a"}	559mig8	55cawlk	\N
lananaqcj6js8htau4		vine	{"id": "7ba32b03-1a14-4c53-b2f2-c58a041a8d84"}	559tvhc	55cb0mw	\N
lananaqcj6js8htau4		vine	{"id": "7ba8a939-4a57-42ec-b00b-90dcfcd64595"}	559h1ww	55cb4oo	\N
lananaqcj6js8htau4		vine	{"id": "7c2b9315-adbe-4e60-9d02-fbf3e7397c58"}	559k6u0	55cb8oo	\N
lananaqcj6js8htau4		vine	{"id": "7c404ad9-4ee5-4729-9b9e-944505dac8e9"}	559a6pc	55cbcqg	\N
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "9f3elvilaek4nrlmbn", "clientGroupID": "uk74dsudpgd94faf3n"}	5615m7c	5615m7c	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "b483d03d-d249-4875-8bb8-9ce151b0e5a5"}	55gag7c	55gdwkg	\N
uk74dsudpgd94faf3n		zero_0.mutations	{"clientID": "9f3elvilaek4nrlmbn", "mutationID": 1, "clientGroupID": "uk74dsudpgd94faf3n"}	5615m7c	5615vzc	\N
lananaqcj6js8htau4		vine	{"id": "36a64e07-01bf-471b-8cd1-931d1fbbd6fb"}	55cxjgo	55dgx6g	\N
lananaqcj6js8htau4		vine	{"id": "4eb1a378-1b7b-423a-8f5f-05b001da3af9"}	55cw2qw	55dipmg	\N
lananaqcj6js8htau4		vine	{"id": "7f4d860b-9b4f-4dca-950a-be5a2ac6efe0"}	55ctjhk	55dm5y8	\N
lananaqcj6js8htau4		vine	{"id": "9b0ed87a-f852-4b8d-aed1-0c3a771e4880"}	55cut1c	55do280	\N
lananaqcj6js8htau4		vine	{"id": "ccba5e7a-293e-42b5-ab3c-ccb872a65d51"}	55d02kg	55dreg8	\N
lananaqcj6js8htau4		vine	{"id": "801d5396-8c60-4227-a923-d28180d04627"}	559fefk	55cbr20	\N
lananaqcj6js8htau4		vine	{"id": "80a333ce-41cb-44f5-baca-f395c0c0d822"}	559c54o	55cbv40	\N
lananaqcj6js8htau4		vine	{"id": "81f1a699-ba83-4d87-a27f-c7dea9cfeafe"}	559qn1c	55cbz5s	\N
lananaqcj6js8htau4		vine	{"id": "8399eb1b-640e-4a27-88de-35f3fff7d466"}	559w1oo	55cc354	\N
lananaqcj6js8htau4		vine	{"id": "84099ac8-ac5e-41f3-8f8a-188341335b46"}	559prhk	55cc754	\N
lananaqcj6js8htau4		vine	{"id": "863a7077-9ce4-4803-a487-c99300cbee9e"}	559wamo	55ccb6w	\N
lananaqcj6js8htau4		vine	{"id": "873ff726-7ad7-4ff8-a2f1-452007317b82"}	559dncg	55ccf68	\N
lananaqcj6js8htau4		vine	{"id": "8b07db68-0ea7-4761-8e15-2d7b4a31a7ae"}	559wf5s	55ccj88	\N
lananaqcj6js8htau4		vine	{"id": "8b41cf29-e033-46ed-a05c-5732d7412900"}	559aork	55ccna0	\N
lananaqcj6js8htau4		vine	{"id": "9431fb03-d92c-4a35-803c-ecf3bab834ed"}	559w660	55ccr9c	\N
lananaqcj6js8htau4		vine	{"id": "94903442-6797-400b-8c34-f44af3d1a9e0"}	559fwjk	55ccv9c	\N
lananaqcj6js8htau4		vine	{"id": "96a82dc0-fd0f-4050-bacf-edd9311e18fe"}	559uds0	55cczag	\N
lananaqcj6js8htau4		vine	{"id": "97d39c3c-439f-4436-aa35-4a4259e84e6f"}	559oz9c	55cd3ag	\N
lananaqcj6js8htau4		vine	{"id": "9807d015-9841-49a3-ae07-2c67b9ea8bbf"}	559deco	55cd7cg	\N
lananaqcj6js8htau4		vine	{"id": "9a79cc31-62db-4169-bc18-013fc0e743b5"}	559hayg	55cdbgg	\N
lananaqcj6js8htau4		vine	{"id": "9ac9639b-6d40-4264-ab4d-7184f960cc5d"}	559qw4g	55cdiow	\N
lananaqcj6js8htau4		vine	{"id": "9b9bd8fd-42cd-4687-882e-c0151ed9c1b7"}	5597ge0	55cdmow	\N
lananaqcj6js8htau4		vine	{"id": "9be71cad-e1fa-4912-af38-5f0d9531eb61"}	559g140	55cdqqo	\N
lananaqcj6js8htau4		vine	{"id": "9db24dfc-432c-4a50-9075-3a15f7a03df7"}	559v9dk	55cduq0	\N
lananaqcj6js8htau4		vine	{"id": "9e071d58-ff70-4dcb-b646-c7d14af3a806"}	559enfk	55cdys0	\N
lananaqcj6js8htau4		vine	{"id": "9f199b7b-6bfd-42f2-835d-95ef54338793"}	559d0ts	55ce2ts	\N
lananaqcj6js8htau4		vine	{"id": "a0b4f7b3-eda3-4760-8c2e-1d380f518362"}	559oh94	55ce6t4	\N
lananaqcj6js8htau4		vine	{"id": "a0d56798-0120-47e7-8888-a42c61a01ebc"}	559u99k	55ceark	\N
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "4966gqdvsogft8umig", "clientGroupID": "uk74dsudpgd94faf3n"}	561nld4	561nld4	{"lmids": 1}
uk74dsudpgd94faf3n		zero_0.mutations	{"clientID": "4966gqdvsogft8umig", "mutationID": 1, "clientGroupID": "uk74dsudpgd94faf3n"}	561nld4	561nv60	\N
lananaqcj6js8htau4		vine	{"id": "74204fa4-53fb-4ebf-a709-b96c52f28c50"}	55cxnz4	55dkug8	\N
lananaqcj6js8htau4		vine	{"id": "8267fc2f-23a4-43be-8dc3-368353305b0e"}	55cyxwo	55dmi7s	\N
lananaqcj6js8htau4		vine	{"id": "f9ea2e65-cb68-4c14-bc2d-2e6a8d2d1d0a"}	55cto00	55duaco	\N
lananaqcj6js8htau4		vine	{"id": "fc232cf5-b001-459d-95bf-f04b5ea5a7b3"}	55cuxkg	55duihc	\N
lananaqcj6js8htau4		vine	{"id": "a286e247-ebdb-4b9a-9a7b-26ac20bea7f6"}	559e5co	55cep3c	\N
lananaqcj6js8htau4		vine	{"id": "a29e3671-b40c-4409-b71f-d07d8456730c"}	559oq8w	55cet8o	\N
lananaqcj6js8htau4		vine	{"id": "a3992d5b-003a-4130-b662-ffa6dfc429a8"}	559axs0	55cex9s	\N
lananaqcj6js8htau4		vine	{"id": "a3d3c065-3e94-4d1f-a0c9-e7de9b170517"}	559i5ds	55cf19s	\N
lananaqcj6js8htau4		vine	{"id": "a4882578-a22b-4a58-9e7d-231bddaaf84d"}	559n3kg	55cf59s	\N
lananaqcj6js8htau4		vine	{"id": "a5006c8f-ddb8-491f-8af3-98f7e75e4de6"}	559xf74	55cf9aw	\N
lananaqcj6js8htau4		vine	{"id": "a5fec01a-6a64-44a9-92f9-991e4b80d9f2"}	559e0tk	55cfdaw	\N
lananaqcj6js8htau4		vine	{"id": "a62077fc-b693-482b-a90c-df98287ceb53"}	559rlww	55cfjlc	\N
lananaqcj6js8htau4		vine	{"id": "a677c323-88aa-4c6f-bb7d-98ad145f4c98"}	559muj4	55cfnn4	\N
lananaqcj6js8htau4		vine	{"id": "a7c14c3a-2572-4e15-b28d-dfb0171de986"}	559d5c8	55cfrmg	\N
lananaqcj6js8htau4		vine	{"id": "a895b345-2cce-47a2-b1f3-32e2ea35bb2d"}	559x1ns	55cfvzc	\N
lananaqcj6js8htau4		vine	{"id": "a9291b28-3e0a-490f-84f8-1a2383e7e85a"}	559gswg	55cfzzk	\N
lananaqcj6js8htau4		vine	{"id": "aa5e7cf9-74c1-4379-b908-60e309abb008"}	559nlko	55cg40o	\N
lananaqcj6js8htau4		vine	{"id": "aabe69ac-4f32-47be-b026-6aa4b6b374c8"}	559vncw	55cg82o	\N
lananaqcj6js8htau4		vine	{"id": "ab2a54d2-6bc0-42aa-b3e9-7979ba3e92f8"}	559jsk0	55cghuo	\N
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "2svpnpeh67qcdvrhe1", "clientGroupID": "uk74dsudpgd94faf3n"}	5621ets	5621ets	{"lmids": 1}
lananaqcj6js8htau4		task_template	{"id": "tt_primary_red_3"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "21r9jku31bccs5dh2l", "clientGroupID": "lananaqcj6js8htau4"}	55gob9k	55gob9k	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "0d79e459-4146-49ae-a2c9-b9313a87feb8"}	55d0p74	55de594	\N
lananaqcj6js8htau4		vine	{"id": "25a3c8f4-3cb9-40d5-a241-32067a358e7b"}	55cv6pk	55dfhpc	\N
lananaqcj6js8htau4		vine	{"id": "2c382be2-ff03-4fbb-ad67-b9fa9db589ad"}	55d1ga0	55dg1rs	\N
lananaqcj6js8htau4		vine	{"id": "3b9a23c6-fcc2-48f7-a0ee-a301ceb5ea43"}	55ctx5s	55dh5bk	\N
lananaqcj6js8htau4		vine	{"id": "67e464c7-6b56-4745-a4a8-48f88859afa2"}	55cwggw	55dk6e0	\N
lananaqcj6js8htau4		vine	{"id": "6a2856a4-4a5d-409a-ba8b-a0df12ac5cd1"}	55cxx34	55dkif4	\N
lananaqcj6js8htau4		vine	{"id": "75aa7dec-f59e-4c1d-858c-01c3f31e782f"}	55d1pa8	55dl9r4	\N
lananaqcj6js8htau4		vine	{"id": "86993488-2595-4bbf-8ff3-cb440d9467af"}	55d0g28	55dmya0	\N
lananaqcj6js8htau4		vine	{"id": "99708523-93ae-4ab5-bf1c-4abdd721d28d"}	55d073s	55dnu60	\N
lananaqcj6js8htau4		vine	{"id": "d2b9d7ba-4708-4880-b536-3f13fe97be6a"}	55d1bp4	55drmfs	\N
lananaqcj6js8htau4		vine	{"id": "fade179d-1617-41f7-b678-f2b4b52ab0bb"}	55cz6ww	55dueeg	\N
lananaqcj6js8htau4		vine	{"id": "ae4af2f0-d3ca-4912-9cba-5495fd5a90b8"}	559ouq8	55ch83c	\N
lananaqcj6js8htau4		vine	{"id": "afb67aeb-80e0-4c8e-aee9-5b297b4ece9d"}	559gxfk	55chc4g	\N
lananaqcj6js8htau4		vine	{"id": "b2ca4373-8b06-45cb-8a95-4267950803fa"}	559ce4g	55chgv4	\N
lananaqcj6js8htau4		vine	{"id": "b3b66c20-3d81-44df-9817-34054587cd63"}	559c9lc	55chkx4	\N
lananaqcj6js8htau4		vine	{"id": "b4f268fb-6b6d-43c5-947c-80c698f258eb"}	559ak74	55chowg	\N
lananaqcj6js8htau4		vine	{"id": "b5a3134e-80b6-46a7-bb9a-3c879cb1a239"}	55993ao	55chswo	\N
lananaqcj6js8htau4		vine	{"id": "b69886fe-19de-4c01-a2af-7c825469a38b"}	559shio	55chwyg	\N
lananaqcj6js8htau4		vine	{"id": "b7008bf7-8d4f-437f-8074-640257d4c2ac"}	559ruwo	55ci0xs	\N
lananaqcj6js8htau4		vine	{"id": "b8fbbef1-cb19-44f3-b0f9-dbffaaac725c"}	559hk00	55ci4y0	\N
lananaqcj6js8htau4		vine	{"id": "bac987d1-0982-479c-9fa5-00c18a8428ab"}	559s3y0	55ci91c	\N
lananaqcj6js8htau4		vine	{"id": "bbd6ed9c-178e-4db0-bf7c-3017a3fb281a"}	5599elc	55cid34	\N
lananaqcj6js8htau4		vine	{"id": "bd15c3e2-e0cc-4a83-a49c-fdb29c9c5554"}	559olqg	55cih4w	\N
lananaqcj6js8htau4		vine	{"id": "bdf1cdd7-0dee-4851-b0e6-a97f270e04ee"}	559d9tk	55cil5s	\N
lananaqcj6js8htau4		vine	{"id": "be056da3-23ef-40b8-b01e-701b77dd3650"}	559rqdk	55cip5s	\N
lananaqcj6js8htau4		vine	{"id": "c0c2a9c3-d691-44cc-96ee-7f3400488c28"}	559h6h4	55cit5s	\N
lananaqcj6js8htau4		vine	{"id": "c4439cf4-d04f-4734-8964-7f1b9d6c4ba1"}	559o83c	55cix7c	\N
lananaqcj6js8htau4		vine	{"id": "c55afc50-38d5-42d7-ae69-73d98932f221"}	559wo3s	55cj194	\N
lananaqcj6js8htau4		vine	{"id": "c5e72a9e-04ec-453e-8106-6d0be640f67a"}	559szlc	55cj5cg	\N
lananaqcj6js8htau4		vine	{"id": "c6119f2c-e014-4c6e-b7ef-918228a6831a"}	559vwf4	55cj9eo	\N
lananaqcj6js8htau4		vine	{"id": "c76d3afc-9565-405b-8a59-226ba90a5371"}	559b6tk	55cjdgo	\N
lananaqcj6js8htau4		vine	{"id": "c7d586e9-6f96-45bc-ab02-f407f0c0916d"}	559rhds	55cjhjk	\N
lananaqcj6js8htau4		vine	{"id": "c7f7d04d-cf57-4545-9d5c-5a0d5db49758"}	559iwvs	55cjllc	\N
lananaqcj6js8htau4		vine	{"id": "c8f3acdd-bac4-411f-91c5-7f98c2ce6a37"}	559nq3s	55cjpmw	\N
lananaqcj6js8htau4		vine	{"id": "cb31a49b-73ed-4e3f-8612-ac4ee13aff11"}	559eef4	55cjto0	\N
lananaqcj6js8htau4		vine	{"id": "cdd284ae-0c7a-4acb-a294-e83f5ba982eb"}	5599xpk	55cjxmg	\N
lananaqcj6js8htau4		vine	{"id": "cf71675a-f5da-4db7-a517-3c541c029068"}	559i9w8	55ck1ow	\N
lananaqcj6js8htau4		vine	{"id": "d0ad9174-cd68-426c-b28b-995ffa7d7267"}	559uvs8	55ck5og	\N
lananaqcj6js8htau4		vine	{"id": "d10f405c-3918-4b49-ade6-74f5b40b4cb0"}	559r0mw	55ck9v4	\N
lananaqcj6js8htau4		vine	{"id": "d530f7e6-3bc1-4ba3-83cf-129fd8ac0967"}	559xao0	55ckdts	\N
lananaqcj6js8htau4		vine	{"id": "d61f0309-3c64-414c-998e-27683ca43fcb"}	559e9wo	55ckhvk	\N
lananaqcj6js8htau4		vine	{"id": "d8c7fccf-fd8e-48b2-8412-27ab7f8104f1"}	559ybag	55cklxk	\N
lananaqcj6js8htau4		vine	{"id": "d8d8c588-76ed-49e3-9da4-4cec155ba913"}	5599k4g	55ckpxs	\N
lananaqcj6js8htau4		vine	{"id": "da2e30de-464c-4a1e-9ea6-23cc7f420c02"}	559gj48	55cktx4	\N
lananaqcj6js8htau4		vine	{"id": "da90ea65-e2cd-4733-9930-31c091c25665"}	559q0i0	55ckxxk	\N
lananaqcj6js8htau4		vine	{"id": "dc5a87e0-8bd4-4e91-97ac-5deb43ff9678"}	559isa8	55cl1x4	\N
lananaqcj6js8htau4		vine	{"id": "def14e30-897e-4553-8b36-8994c742681f"}	559cn7k	55cl5xc	\N
lananaqcj6js8htau4		vine	{"id": "e25286bd-baee-4b27-84b2-495565b44f88"}	559f5fs	55cl9vs	\N
lananaqcj6js8htau4		vine	{"id": "e3f34864-235c-4ea0-9dbf-c4e1b190dd08"}	559j1hs	55cldvk	\N
lananaqcj6js8htau4		vine	{"id": "e4e12a22-672e-43eb-a361-ca07dcd2e80e"}	559vrts	55clhvs	\N
lananaqcj6js8htau4		vine	{"id": "e547fffe-f15a-48d9-a392-e5b8b56161d7"}	559b28o	55cllw0	\N
lananaqcj6js8htau4		vine	{"id": "e933b330-ee47-4946-959f-8e88dc3d9eb3"}	559gof4	55clpxs	\N
lananaqcj6js8htau4		vine	{"id": "e9c0009d-63fb-43ea-af68-4c6121e6e5c2"}	5599t48	55clu00	\N
lananaqcj6js8htau4		vine	{"id": "eaa9665b-99a2-4617-a751-134a21673ecb"}	559q4yo	55clxxs	\N
lananaqcj6js8htau4		vine	{"id": "eb553bfb-5f94-455d-a827-cdfe9380f956"}	559inrs	55cm1w8	\N
lananaqcj6js8htau4		vine	{"id": "f159ee5c-9c2d-4041-b99e-937c7ea15c6c"}	559dwcw	55cm5wg	\N
lananaqcj6js8htau4		vine	{"id": "f1f6176d-ef46-4a59-8616-73b15c1b7922"}	559x64g	55cma5c	\N
lananaqcj6js8htau4		vine	{"id": "f3325c6e-6a38-44f9-916d-08a8d729b2c2"}	559cw80	55cme3s	\N
lananaqcj6js8htau4		vine	{"id": "f355f0be-2ab0-49e7-9d73-f5cc29f47fe1"}	559ga3s	55cmi40	\N
uk74dsudpgd94faf3n		zero_0.mutations	{"clientID": "2svpnpeh67qcdvrhe1", "mutationID": 1, "clientGroupID": "uk74dsudpgd94faf3n"}	5621ets	5621vg8	\N
lananaqcj6js8htau4		block	{"id": "A"}	55csmu0	55fy3mg	\N
lananaqcj6js8htau4		vine	{"id": "2b8b63a4-aaf3-4592-ae4f-392b965d16ec"}	55czbeg	55dfxrk	\N
lananaqcj6js8htau4		vine	{"id": "5164dd85-1792-4447-9120-9814676e98f7"}	55cy1lk	55dixnk	\N
lananaqcj6js8htau4		vine	{"id": "f465b2d6-2934-4fed-aafb-a07fdb270641"}	559iiwo	55cmm54	\N
lananaqcj6js8htau4		vine	{"id": "f7a19213-7076-4bcc-851c-999ed85c1086"}	559kou8	55cmq6w	\N
lananaqcj6js8htau4		vine	{"id": "f84f2baf-b436-4b75-bb9b-ad3c4f0d3d14"}	559thkw	55cmu8o	\N
lananaqcj6js8htau4		vine	{"id": "fa3a36b4-d462-49da-913c-df1cfefd36f1"}	559qik0	55cmy9s	\N
lananaqcj6js8htau4		vine	{"id": "fa990001-f341-4828-9ae5-d3aa13922b2d"}	559nukg	55cn29s	\N
lananaqcj6js8htau4		vine	{"id": "fad6b79d-2735-4e06-a3d6-d9b7669d185f"}	559jx1c	55cn6co	\N
lananaqcj6js8htau4		vine	{"id": "fc8ad85a-7104-4805-b7c8-8f2d9b4abb9f"}	559o3kw	55cnaco	\N
lananaqcj6js8htau4		vine	{"id": "fce8d652-e40b-4199-9485-2056d0728658"}	559sqkw	55cneeg	\N
lananaqcj6js8htau4		vine	{"id": "fdb9a3c5-1127-4f1a-bdca-b96ec19993cf"}	559f9wg	55cnifk	\N
lananaqcj6js8htau4		vine	{"id": "fdd7cafe-e667-4fe6-b658-9015ca1e6feb"}	559fng0	55cnmhc	\N
lananaqcj6js8htau4		block	{"id": "C"}	555qvx4	55cnqg8	\N
lananaqcj6js8htau4		vine	{"id": "001"}	555kvk8	55bqckw	\N
uk74dsudpgd94faf3n		pruning_log	{"id": "7f2e0eea-1ce8-46dc-b8f2-b8bc5e800eda"}	562damg	562damg	{"e2hz9kajle2s": 1}
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "pqhddjahl0r2sver56", "clientGroupID": "uk74dsudpgd94faf3n"}	562damg	562damg	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "d027270b-c652-4b24-881c-eb8cc033f626"}	55gapg0	55geau8	\N
lananaqcj6js8htau4		stage_history	{"id": "2019-cab-harvested-1764219267561"}	557lqhk	55o963k	\N
lananaqcj6js8htau4		task_template	{"id": "tt_primary_white_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "9r8740l6u0v87ijvpp", "clientGroupID": "lananaqcj6js8htau4"}	55fy3mg	55fy3mg	{"lmids": 1}
uk74dsudpgd94faf3n		pruning_log	{"id": "13803215-cdc0-4566-a1ba-6a77c83ede8f"}	562f7jc	562f7jc	{"e2hz9kajle2s": 1}
lananaqcj6js8htau4		vintage	{"id": "2017-xxxxxx", "variety": "XXXXXX", "vineyard_id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589", "vintage_year": 2017}	5565l74	55o5n4o	\N
lananaqcj6js8htau4		stage_history	{"id": "6d41a1b9-fef8-479a-9ff6-0cfa1987b3f8"}	557mbv4	55o9a60	\N
lananaqcj6js8htau4		vintage	{"id": "2019-cab", "variety": "CAB", "vineyard_id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589", "vintage_year": 2019}	557mt80	55o9e54	\N
lananaqcj6js8htau4		vine	{"id": "1eda2da6-f83b-465f-a94e-f91c76aaa769"}	55g9tcg	55gclz4	\N
lananaqcj6js8htau4		vine	{"id": "3c00c009-8ebb-42b7-9d78-8b88ef8ecdc5"}	55g9xvk	55gcyx4	\N
lananaqcj6js8htau4		vine	{"id": "941adad7-7bd7-4368-a3ad-875ded7b9c39"}	55ga2h4	55gd78o	\N
lananaqcj6js8htau4		vine	{"id": "97338e87-c56f-40a2-94c1-8b9d02b371e9"}	55ga72o	55gde9c	\N
lananaqcj6js8htau4		vine	{"id": "af00b909-d43a-4fac-b29a-ad07f7210df1"}	55gabls	55gdib4	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "7u971bioer1kd6qsmv", "clientGroupID": "lananaqcj6js8htau4"}	55gvsjk	55gvsjk	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "h4bo0t0mmpjj76mvr7", "clientGroupID": "lananaqcj6js8htau4"}	55gzmv4	55gzmv4	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "8600dc51-4da2-4fc9-a8e7-0dbb2047bd8d"}	556b67k	55h5p5k	\N
lananaqcj6js8htau4		stage_history	{"id": "93f01d88-688e-46b9-864e-67a82b026eb2"}	55gvblk	55h5t5c	\N
lananaqcj6js8htau4		stage_history	{"id": "f2a0d315-f9a7-45b1-9384-8c18fa17b207"}	55gz80g	55h6394	\N
lananaqcj6js8htau4		vine	{"id": "10d8fd66-65d8-4e75-b145-5c5a561752b9"}	55d1yyg	55dehc8	\N
lananaqcj6js8htau4		vine	{"id": "194b21e5-d74a-4400-958b-e0e9399961fc"}	55d7wu0	55df5l4	\N
lananaqcj6js8htau4		vine	{"id": "2e79379c-a885-4d4a-a12d-1e3651e54bec"}	55d2uyg	55dg90w	\N
lananaqcj6js8htau4		vine	{"id": "3606154b-105c-4a90-b6eb-9fd20adab3d0"}	55d7sa0	55dgt4w	\N
lananaqcj6js8htau4		vine	{"id": "3e6f8583-c629-4fd8-9712-6a4d21a8f4d6"}	55d1krk	55dhdaw	\N
lananaqcj6js8htau4		vine	{"id": "3ff3194c-37fb-4757-b6e4-f4c3a09a6a6d"}	55dagx4	55dhhco	\N
lananaqcj6js8htau4		vine	{"id": "4218b4d8-12a7-4d86-a89a-e1245cb533c2"}	55d8ev4	55dhlco	\N
lananaqcj6js8htau4		vine	{"id": "466b6a4c-d3b2-452e-a2a3-4fa1c8e09663"}	55d6nbk	55di5io	\N
lananaqcj6js8htau4		vine	{"id": "49925c21-c8f8-4b97-90fa-2a3baf2fa283"}	55d4hns	55dihjs	\N
lananaqcj6js8htau4		vine	{"id": "4ffb964c-e0fe-4ca7-ba00-7f01f4100c76"}	55daqa8	55dito8	\N
lananaqcj6js8htau4		vine	{"id": "542078f0-d25c-44f2-a905-40acb0a4b019"}	55d2qf4	55dj5pc	\N
lananaqcj6js8htau4		vine	{"id": "581d824f-e13d-4009-b738-afee8f68b89b"}	55d60q0	55dj9oo	\N
lananaqcj6js8htau4		vine	{"id": "60a4a5c6-542b-4ad8-bb9d-15aa632b11e8"}	55d91jk	55djudk	\N
lananaqcj6js8htau4		vine	{"id": "62065e0e-6624-40bd-ab87-64bdfa36baf3"}	55d9oz4	55djycw	\N
lananaqcj6js8htau4		vine	{"id": "6448e0a4-c5aa-480e-a123-2900511ac6ba"}	55d9tg8	55dk2cw	\N
lananaqcj6js8htau4		vine	{"id": "79d6a93c-ff43-4ade-b640-3a39917f212a"}	55dacc0	55dlpvc	\N
lananaqcj6js8htau4		vine	{"id": "7e6d9c76-bbb2-47f0-b4c4-f38ce8817471"}	55d75bs	55dm1uw	\N
lananaqcj6js8htau4		vine	{"id": "7fc81b7b-850d-41b2-b747-52418959f791"}	55d9kds	55dm9zc	\N
lananaqcj6js8htau4		vine	{"id": "8227f913-f8f8-447b-997b-2b1e56cafd88"}	55d23vs	55dme9c	\N
lananaqcj6js8htau4		vine	{"id": "8a7c84b2-e516-4647-a8bf-3b3bb527bf6d"}	55d70uo	55dn2a0	\N
lananaqcj6js8htau4		vine	{"id": "8ab80f52-a092-4ad1-813e-7ef2d92bd359"}	55d8jeo	55dn6a8	\N
lananaqcj6js8htau4		vine	{"id": "93ecc540-d3b3-40c2-b429-75b68d5cc497"}	55d79tk	55dni7s	\N
lananaqcj6js8htau4		vine	{"id": "96b439fa-40f8-481d-897b-4a6b23b20766"}	55d5w88	55dnm9s	\N
lananaqcj6js8htau4		vine	{"id": "984cc06d-d004-4c93-a4dc-87259fce8476"}	55d96q8	55dnq88	\N
lananaqcj6js8htau4		vine	{"id": "99a624f8-dd4a-440e-a4b3-91d3aa4d6280"}	55czp2o	55dny7s	\N
lananaqcj6js8htau4		vine	{"id": "9bf6ed1a-3158-45f0-9efb-6919f06b1063"}	55d4qoo	55do67c	\N
lananaqcj6js8htau4		vine	{"id": "9c98bb09-9073-4993-b3df-a54fcbd9742a"}	55d8ae0	55doa7k	\N
lananaqcj6js8htau4		vine	{"id": "a3d1e5d2-c157-46c4-8fa8-29e815ce6b30"}	55d4m5c	55doyco	\N
lananaqcj6js8htau4		vine	{"id": "ab48bb66-6242-4ef9-bf28-c3a7081bc5c0"}	55d0to0	55dpmeo	\N
lananaqcj6js8htau4		vine	{"id": "af0482b8-0390-4fea-8fa9-8537c4a870ce"}	55d28co	55dpyls	\N
lananaqcj6js8htau4		vine	{"id": "b24cfc13-afcb-4117-bef1-81478f164d51"}	55d444g	55dqmlc	\N
lananaqcj6js8htau4		vine	{"id": "bd29e159-d1df-4829-adaf-5c9b32594128"}	55d38nc	55dqugg	\N
lananaqcj6js8htau4		vine	{"id": "c70986f6-a58e-4cc3-ae9c-73f2c41781d3"}	55d3hls	55draeg	\N
lananaqcj6js8htau4		vine	{"id": "ce6b7ab1-16da-4fc8-845f-9ad4c4ab4bc6"}	55dauuo	55drifk	\N
lananaqcj6js8htau4		vine	{"id": "e08d0034-a652-407e-a8e9-e044ebd7aab6"}	55d5roo	55ds2f4	\N
lananaqcj6js8htau4		vine	{"id": "e8d8841f-b966-48a6-82b0-303eb1c9eca3"}	55d0bko	55dsqbc	\N
lananaqcj6js8htau4		vine	{"id": "e97444e6-06fd-4065-8f36-0b38f0aa4347"}	55d58q0	55dsu9s	\N
lananaqcj6js8htau4		vine	{"id": "e9aa6524-302d-4e09-9cda-b098b8838423"}	55d5d7k	55dt27s	\N
lananaqcj6js8htau4		vine	{"id": "ea3b2a53-dd3b-4d0f-998d-55862c35b938"}	55d3zmw	55dt6b4	\N
lananaqcj6js8htau4		vine	{"id": "ecc09028-fe19-48b5-b056-8f7e05a8495b"}	55d6iq8	55dteco	\N
lananaqcj6js8htau4		vine	{"id": "f04b7a51-3387-4fe6-abd4-a0fbc387b22d"}	55d0y7c	55dtmaw	\N
lananaqcj6js8htau4		vine	{"id": "f35ebd9d-b944-4227-89d2-dc03adf63964"}	55d3d4w	55dtqb4	\N
uk74dsudpgd94faf3n		pruning_log	{"id": "59fa8aaf-9f63-41b6-97d3-70ce4f13d9be"}	562fnnc	562fnnc	{"e2hz9kajle2s": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "66n997q0omm3c7mg1i", "clientGroupID": "lananaqcj6js8htau4"}	55g2beg	55g2beg	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "02347cdf-b57c-41a4-8669-12a3cbbc0fa6"}	55g9oqw	55gbbd4	\N
lananaqcj6js8htau4		vine	{"id": "c0743be8-7bbe-4866-8431-a88811502dd4"}	55gakug	55ge6sg	\N
lananaqcj6js8htau4		vine	{"id": "ddb19154-60fa-4dcd-b55b-8d756d42cdd1"}	55gau0o	55gep6o	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "m9obru4gjo2ntuadud", "clientGroupID": "lananaqcj6js8htau4"}	55h4dzs	55h4dzs	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "b8cd6a83-3ae7-40ea-8054-f6763f96f7f7"}	55gzcko	55h5z7c	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "l6f9g82d2p612bqh0u", "clientGroupID": "lananaqcj6js8htau4"}	55hb91k	55hb91k	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "6306a0e4-c1ff-4ce0-a4ee-85e7366931b6"}	55hat4g	55k95eo	\N
lananaqcj6js8htau4		wine	{"id": "f7d71f7d-43c5-463e-8ef5-653064278769"}	55jaxig	55k9ve0	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "71os01irlgg9120h0b", "clientGroupID": "lananaqcj6js8htau4"}	55kg6kg	55kg6kg	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "4c61c2fb-5926-46eb-86f2-3ac2af0a368f"}	55kc2o8	55kpwzs	\N
lananaqcj6js8htau4		vine	{"id": "17d43e85-53f1-4e6a-9567-a1caacef7fdc"}	55d175s	55dexdk	\N
lananaqcj6js8htau4		vine	{"id": "181723bb-4c64-4da0-bbd8-b9fdfea061fa"}	55da7tc	55df1jk	\N
lananaqcj6js8htau4		vine	{"id": "199d5bc8-eb3f-4157-89c8-4e73dfb7895c"}	55d85w8	55df9m0	\N
lananaqcj6js8htau4		vine	{"id": "2b7db7f8-8064-44a5-a907-87983b76e4d8"}	55d4d4o	55dftqo	\N
lananaqcj6js8htau4		vine	{"id": "3168495b-3e03-4235-9554-5031ef62963f"}	55da2kw	55dgh28	\N
lananaqcj6js8htau4		vine	{"id": "3830d8a4-20c9-4d00-98de-0fd2fe8a3f0e"}	55d3440	55dh1ag	\N
lananaqcj6js8htau4		vine	{"id": "3c05ba2d-0447-4cc0-95be-d27f89f5592b"}	55d2cxc	55dh9bk	\N
lananaqcj6js8htau4		vine	{"id": "4220653e-1eb6-4aac-9c1d-d91a8126cc20"}	55cztm0	55dhpc0	\N
lananaqcj6js8htau4		vine	{"id": "4383c57a-c195-4706-921c-8915353fad07"}	55d7nqg	55dhtds	\N
lananaqcj6js8htau4		vine	{"id": "45605dd8-49b7-4d94-9880-6439966e48c1"}	55d9fso	55dhxds	\N
lananaqcj6js8htau4		vine	{"id": "461b4170-6e7f-450a-bdc3-1b3b7b43bd1a"}	55d2lxk	55di1d4	\N
lananaqcj6js8htau4		vine	{"id": "4810795c-12b1-464d-8e27-b564b08588fd"}	55d2hgo	55di9io	\N
lananaqcj6js8htau4		vine	{"id": "4ea1134d-b41c-411b-8e61-f5bead271ccd"}	55d8sg8	55dilmg	\N
lananaqcj6js8htau4		vine	{"id": "58888788-2429-465d-976c-1ccffb149c7c"}	55dalgg	55djec8	\N
lananaqcj6js8htau4		vine	{"id": "5abd3e4e-963c-4a83-a11b-001168c08929"}	55d8wz4	55djqbs	\N
lananaqcj6js8htau4		vine	{"id": "68466c1e-39ca-4a38-9415-f04ee82f8059"}	55d5ils	55dkee0	\N
lananaqcj6js8htau4		vine	{"id": "7022ede2-7c19-4e58-b317-59994f4ef336"}	55d2zg0	55dkqf4	\N
lananaqcj6js8htau4		vine	{"id": "75186397-36d9-433a-b3e3-48c17e4a8134"}	55d6wb4	55dkyg8	\N
lananaqcj6js8htau4		vine	{"id": "755aa464-69f1-47ae-982a-662e9974edd8"}	55d3v48	55dl5pc	\N
lananaqcj6js8htau4		vine	{"id": "7d4c15ad-33aa-45ad-ab18-e5b99eb2a1b3"}	55d7j8o	55dlxwg	\N
lananaqcj6js8htau4		vine	{"id": "8d265173-6b70-435d-af96-3cf812c1145d"}	55d81co	55dna9s	\N
lananaqcj6js8htau4		vine	{"id": "928d20ec-d721-479f-af1b-cf40e513c45b"}	55d8nyg	55dnea0	\N
lananaqcj6js8htau4		vine	{"id": "9e3a4c2f-fd0b-402a-9c93-7230aa5fc2f2"}	55d3m54	55doi5c	\N
lananaqcj6js8htau4		vine	{"id": "9e85a27a-26b1-4401-b8af-9b9c4492e0f0"}	55d12ow	55dom7c	\N
lananaqcj6js8htau4		vine	{"id": "9f1f6796-2cb3-45e0-bc1a-74201dc67d8c"}	55cykco	55doq54	\N
lananaqcj6js8htau4		vine	{"id": "a728bbdb-bbd2-4f75-9398-091646bcdb86"}	55d657s	55dpac8	\N
lananaqcj6js8htau4		vine	{"id": "af92feca-898f-44b0-b217-ff2488e3d051"}	55d69qo	55dq6io	\N
lananaqcj6js8htau4		vine	{"id": "b16befdc-c1df-490c-827c-0c8825e6beb8"}	55d4v88	55dqels	\N
lananaqcj6js8htau4		vine	{"id": "c490365d-d225-4527-84c5-0e834d8319e7"}	55d0kpk	55dr6g0	\N
lananaqcj6js8htau4		vine	{"id": "da8ac79a-1089-4a93-afa6-f35aef344f7a"}	55d4zps	55drqgw	\N
lananaqcj6js8htau4		vine	{"id": "da935a3d-26de-4742-acba-e9e9d9b89a65"}	55d5494	55druh4	\N
lananaqcj6js8htau4		vine	{"id": "dc5d1ec6-312a-44e7-af29-5e2631131f63"}	55d6rtc	55dryfk	\N
lananaqcj6js8htau4		vine	{"id": "e346f1b5-fcbf-45d5-992e-219fe8b810b5"}	55d1trs	55ds6dk	\N
lananaqcj6js8htau4		vine	{"id": "e3db7e3a-cedb-4171-a78c-ac84d1df7a93"}	55d7ed4	55dsac0	\N
lananaqcj6js8htau4		vine	{"id": "e50bb219-1904-4d13-b827-930700c50756"}	55d6e8g	55dsibk	\N
lananaqcj6js8htau4		vine	{"id": "e6555d43-caf6-4416-b2af-f278eaddd27f"}	55d48m0	55dsmbs	\N
lananaqcj6js8htau4		vine	{"id": "f0306bb9-ffc4-4f0f-8912-eb9df5cd959f"}	55d9bbk	55dtid4	\N
lananaqcj6js8htau4		vine	{"id": "f535dd9b-1241-40dd-9577-d6ecc9247f5b"}	55d5n7k	55dty8w	\N
lananaqcj6js8htau4		vine	{"id": "f58fded5-056f-4691-a624-e140d35a8bdb"}	55d9xzs	55du294	\N
lananaqcj6js8htau4		vine	{"id": "1fe984a9-b72f-434a-8c01-d24ab5e24d93"}	5597zzs	55c1wrc	\N
lananaqcj6js8htau4		vine	{"id": "410e8ff7-8df5-4ea7-a600-9f10c13a6299"}	559i0wg	55c4j8o	\N
lananaqcj6js8htau4		vine	{"id": "671785f1-4bfe-40ca-b172-9f81363facb4"}	559umsg	55c8kqw	\N
lananaqcj6js8htau4		vine	{"id": "a1506b01-e355-4d3c-b2f6-5bcf856cf0d1"}	55988y8	55ceetk	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "m3pkucn32nfnh8vgc6", "clientGroupID": "lananaqcj6js8htau4"}	55cnqg8	55cnqg8	{"lmids": 1}
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "4dqmckj4i271sbi95i", "clientGroupID": "uk74dsudpgd94faf3n"}	562fnnc	562fnnc	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "598412bb-29c7-4fcd-82a0-de73e944b74c"}	55daze0	55djie0	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "4snodhil2u1getab18", "clientGroupID": "lananaqcj6js8htau4"}	55hhs8g	55hhs8g	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "9f2776bd-70d4-4e24-bf2b-ce7d4d0ad464"}	55gnofk	55n1lqw:11c	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		stage_history	{"id": "70d60c38-ade5-46a0-a4ee-fac374934c40"}	55htp4w	55k9feo	\N
lananaqcj6js8htau4		stage_history	{"id": "9a600d32-da18-4e68-aad4-fd3fd12b6499"}	55hgfrk	55k9n0w	\N
lananaqcj6js8htau4		vine	{"id": "b8fe40b5-7833-4b0d-9014-c2ded9959864"}	55go2io	55n1lqw:11c	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "c4de9q8r3a1lvj911t", "clientGroupID": "lananaqcj6js8htau4"}	55kqkt4	55kqkt4	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "db064127-e9da-43a8-9ceb-93297b028505"}	55gms4o	55n1lqw:11c	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "fe20b6dd-6e46-4ef6-a5fa-a73d453641cf"}	55gk6o8	55n1lqw:11c	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		block	{"id": "AB"}	55fyvq0	55n1lqw:11c	{"3unh7411ka0tz": 1}
lananaqcj6js8htau4		task_template	{"id": "tt_secondary_red_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_secondary_red_2"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_secondary_rose_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_veraison_1"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_veraison_2"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "16ol7hd4hg0bkf72hb", "clientGroupID": "lananaqcj6js8htau4"}	55ku2fc	55ku2fc	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "0on89uat46f1boko9t", "clientGroupID": "lananaqcj6js8htau4"}	55l0pe8	55l0pe8	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "f478db5e-5c63-4501-aba4-4af03001bbe9"}	55l068w	55l8aj4	\N
lananaqcj6js8htau4		task	{"id": "0fd2b456-29fe-4b6c-b261-cee6bd85c928"}	55l0pe8	55l8jt4	\N
lananaqcj6js8htau4		task	{"id": "3f84db91-264d-44ac-8c3a-ac5bd01cf91e"}	55ktxi8	55l8rq0	\N
lananaqcj6js8htau4		task	{"id": "c253691e-30e7-45cd-8a70-27232845dd12"}	55ktnrc	55l8zo0	\N
lananaqcj6js8htau4		wine	{"id": "0a70de71-b8a0-4cbf-ad98-88ec72eefa03"}	55l0flk	55l9bhk	\N
lananaqcj6js8htau4		vineyard	{"id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589"}	55gew7s	55n1lqw:0s	{"817el2k23zdp": 1}
lananaqcj6js8htau4		vine	{"id": "e974d16e-8f71-47f3-a98d-f4475f2767b9"}	55db3xc	55dsy7k	\N
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "i67s55b3hs5v5h751o", "clientGroupID": "uk74dsudpgd94faf3n"}	562jj60	562jj60	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "4u93sla95qngpp0k6c", "clientGroupID": "lananaqcj6js8htau4"}	55htyxs	55htyxs	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "2107e8b5-99f4-407f-a83c-9b24fd51e59a"}	55kszg0	55l7n7s	\N
lananaqcj6js8htau4		stage_history	{"id": "57574ee4-0506-4889-8714-ff42fcb9bc57"}	55l0ats	55l85rs	\N
lananaqcj6js8htau4		task	{"id": "3dee346a-b909-454d-85d0-a255436fd435"}	55l0kio	55l8nrk	\N
lananaqcj6js8htau4		task	{"id": "534a579a-2da8-4db8-bd50-1fe6efeec6c4"}	55ku2fc	55l8vpk	\N
lananaqcj6js8htau4		task	{"id": "cd171423-53bb-4bd9-ba65-3112c879b4c7"}	55ktsmg	55l93mg	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "7bo3q5o6oi0f6hl7v3", "clientGroupID": "lananaqcj6js8htau4"}	55l9bhk	55l9bhk	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "mtbthk7ig1ai9bgq36", "clientGroupID": "lananaqcj6js8htau4"}	55loqzs	55loqzs	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "g3v8jlqgk4g2630tse", "clientGroupID": "lananaqcj6js8htau4"}	55lqt88	55lqt88	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "15918166-d07a-4d29-8980-ac4d6e413b56"}	55lbjm8	55ltgu0	\N
lananaqcj6js8htau4		task	{"id": "0ec2d031-f76c-4109-a7ae-e485badcdc0d"}	55lqem0	55lu168	\N
lananaqcj6js8htau4		task	{"id": "2f522941-f442-43c1-9412-cf47c93805f7"}	55lnts8	55lu94o	\N
lananaqcj6js8htau4		task	{"id": "5be84983-f55d-4e72-8dbe-9efbf445be71"}	55lq4qg	55luhso	\N
lananaqcj6js8htau4		task	{"id": "829db808-b138-4126-bf9e-aaf78bde8b25"}	55lqodc	55lulr4	\N
lananaqcj6js8htau4		task	{"id": "fb521e23-794f-400b-85bf-1e7341874cbe"}	55lo7ew	55lv5ns	\N
lananaqcj6js8htau4		stage_history	{"id": "2aa0cfb7-c4c0-4fd2-8cf4-82e857aa05f5"}	55ldl4o	55lvoew	\N
lananaqcj6js8htau4		task	{"id": "66fff67e-601d-469b-9d91-8efee5126e2a"}	55ledyw	55lvzjk	\N
lananaqcj6js8htau4		task	{"id": "7f202db9-064a-4e9d-8524-c4093bb54277"}	55le474	55lw3i0	\N
uk74dsudpgd94faf3n		pruning_log	{"id": "80f1064f-4ad7-4ee2-b7c8-2067507fa71e"}	563hnrs	563hnrs	{"e2hz9kajle2s": 1}
lananaqcj6js8htau4		vine	{"id": "151a60b1-beb4-44c9-9936-cc91d9713689"}	55db8ig	55detdk	\N
lananaqcj6js8htau4		vine	{"id": "4eda86cf-aaf5-4e7c-9664-bc5a94fe3de7"}	55glc80	55n1lqw:11c	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		stage_history	{"id": "d65e7204-b8b7-4708-b333-be104973d679"}	55j9sco	55k9qzc	\N
lananaqcj6js8htau4		vine	{"id": "5c3a4732-bc09-4901-aa54-f70823d5e7ec"}	55gnjww	55n1lqw:11c	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "98295f0d-4317-4fb9-b0b9-21d817a6974e"}	55glsns	55n1lqw:11c	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "cb8ab73e-ada6-4816-861b-0c1b768ca8c1"}	55gmcqg	55n1lqw:11c	{"3t09dyzubc9zp": 1}
lananaqcj6js8htau4		vine	{"id": "ffb8a0c3-588a-40a0-9a69-96097cfa900e"}	55gn988	55n1lqw:11c	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "bq5k58pgb4t5ntf7es", "clientGroupID": "uk74dsudpgd94faf3n"}	563izmo	563izmo	{"lmids": 1}
uk74dsudpgd94faf3n		pruning_log	{"id": "39cf3660-f22a-4bde-8018-1ac73761b14a"}	563jro0	563jro0	{"1tgahbk62pc9s": 1}
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "pli24c6h5j97o2f2h7", "clientGroupID": "uk74dsudpgd94faf3n"}	563ly2g	563ly2g	{"lmids": 1}
uk74dsudpgd94faf3n		pruning_log	{"id": "0e7dcd0a-948a-4aa1-acdc-f29ec860aab8"}	563o7s8	563o7s8	{"1tgahbk62pc9s": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "q6bjf8tb1f4b6ab4r1", "clientGroupID": "lananaqcj6js8htau4"}	55leiu0	55leiu0	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "2016-sauv-harvested-1764219257407"}	555yhlk	55o2bpc	\N
lananaqcj6js8htau4		stage_history	{"id": "2016-pinot-harvested-1764219246640"}	555xm74	55o3lfc	\N
lananaqcj6js8htau4		stage_history	{"id": "2016-cab-harvested-1764219237074"}	555xd8w	55o4iq8	\N
lananaqcj6js8htau4		stage_history	{"id": "2017-xxxxxx-harvested-1764219286507"}	5565nao	55o5g00	\N
lananaqcj6js8htau4		stage_history	{"id": "3c43230d-07fb-4078-bd3f-de13dc43e570"}	55lpm68	55ltlxk	\N
lananaqcj6js8htau4		stage_history	{"id": "54edc3a2-af25-416d-ac8a-96016343fb75"}	55lnfs8	55ltq1k	\N
lananaqcj6js8htau4		stage_history	{"id": "9c6aa8bf-fe56-4ec0-bda5-09737f731e4c"}	55lpqs0	55ltx5c	\N
lananaqcj6js8htau4		task	{"id": "28d6d586-4323-47bc-a569-5c27ed603bb8"}	55lq05s	55lu568	\N
lananaqcj6js8htau4		task	{"id": "45ade1ce-3c48-4036-8635-2b138d00eff1"}	55lnyao	55luduw	\N
lananaqcj6js8htau4		task	{"id": "ba3dea3e-54b2-43f0-9002-5a3c06b9f077"}	55lo2vc	55luprc	\N
lananaqcj6js8htau4		task	{"id": "db733d15-1115-4c1b-8012-0cc67e05c145"}	55lqjio	55lutp4	\N
lananaqcj6js8htau4		task	{"id": "df74579e-8d12-432e-aa03-6f63276bf519"}	55lq9ps	55luxnk	\N
lananaqcj6js8htau4		task	{"id": "e8fb78a5-69f7-4fac-b6e1-d934ea539dec"}	55lqt88	55lv1ns	\N
lananaqcj6js8htau4		wine	{"id": "4b374208-6e8d-4106-b23a-a0071f02170c"}	55lpvgw	55lv9m8	\N
lananaqcj6js8htau4		stage_history	{"id": "7e123c50-4ae4-4fcf-a766-84ce32ef8ec5"}	55ldpq0	55lvse0	\N
lananaqcj6js8htau4		task	{"id": "cda7cb8e-cf99-43af-8144-9c0d26f34c1d"}	55le940	55lw7hk	\N
lananaqcj6js8htau4		task	{"id": "cdf1cf18-e528-44c0-b8b3-436dcd79c87b"}	55ldzao	55lwbg0	\N
lananaqcj6js8htau4		task	{"id": "dcb4a968-71d5-4fd9-a6f5-e7e8beb6fafd"}	55leiu0	55lwfds	\N
lananaqcj6js8htau4		wine	{"id": "f01886d9-9842-4d47-b260-5dc4c8641d0b"}	55ldugo	55lwjg8	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "inqritfqb2noc6jd33", "clientGroupID": "lananaqcj6js8htau4"}	55o5n4o	55o5n4o	{"lmids": 1}
lananaqcj6js8htau4		task	{"id": "52fc00f4-f033-42de-9e83-57903e114980"}	55kg6kg	55o923s	\N
lananaqcj6js8htau4		task_template	{"id": "tt_crush_3"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_flowering_1"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		vine	{"id": "463eea8f-3a3d-42a5-9982-c377928ca021"}	55s721c	55s721c	{"3t09dyzubc9zp": 1}
uk74dsudpgd94faf3n		pruning_log	{"id": "f28f1ee4-b64b-4bea-9ed0-67dcb2cddb77"}	563izmo	563izmo	{"1tgahbk62pc9s": 1}
lananaqcj6js8htau4		vine	{"id": "af48af81-c3a4-4d11-9141-bde409fb243e"}	55dbd14	55dq2k8	\N
uk74dsudpgd94faf3n		pruning_log	{"id": "a635f2b0-e0ee-4646-a8a4-ec6adfa7cc33"}	563o168	563o168	{"1tgahbk62pc9s": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "72sdu94cu76hbp1jvi", "clientGroupID": "lananaqcj6js8htau4"}	55jaxig	55jaxig	{"lmids": 1}
uk74dsudpgd94faf3n		zero_0.clients	{"clientID": "ge2d9qcevecbae6rto", "clientGroupID": "uk74dsudpgd94faf3n"}	563o7s8	563o7s8	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "kg5i2r7uvhe1k58r2a", "clientGroupID": "lananaqcj6js8htau4"}	55jiju0	55jiju0	{"lmids": 1}
lananaqcj6js8htau4		task	{"id": "097e212d-9be1-4766-9f77-5d567297b542"}	55m09rc	55o7ilc	\N
lananaqcj6js8htau4		task	{"id": "78f9ae66-4b39-43a6-9af8-54433006f927"}	55m0ec0	55o7mjs	\N
lananaqcj6js8htau4		task	{"id": "7b89ecbb-4e3c-4aff-83e9-5a3cf497bea5"}	55m0iuw	55o7qk0	\N
lananaqcj6js8htau4		task	{"id": "7e2060ee-7c29-4b53-8392-4dc28cec0708"}	55m0sfc	55o7uk0	\N
lananaqcj6js8htau4		task	{"id": "92957c13-a5d4-4fc1-8f45-30e57b94573d"}	55m0ne0	55o876g	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "k8icf8eeol5oa364ki", "clientGroupID": "lananaqcj6js8htau4"}	55lwjg8	55lwjg8	{"lmids": 1}
lananaqcj6js8htau4		task	{"id": "ddff6594-3d38-41b8-a9da-8601cc6f8de6"}	55m0xcg	55o8cnc	\N
lananaqcj6js8htau4		stage_history	{"id": "3a209cf1-c1e5-430d-89e7-927477450996"}	55lzvw0	55o8gnk	\N
lananaqcj6js8htau4		stage_history	{"id": "e63d4252-3728-4869-a0d4-7fd7ec2f98a3"}	55m00kg	55o8oo8	\N
lananaqcj6js8htau4		wine	{"id": "12aff46d-6c82-45da-9eb5-e55f1e9e09c0"}	55m05a8	55o8y40	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "8sca6026i7sheb4811", "clientGroupID": "lananaqcj6js8htau4"}	55o9e54	55o9e54	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "vfcpojdc6fjogbffe3", "clientGroupID": "lananaqcj6js8htau4"}	55m0xcg	55m0xcg	{"lmids": 1}
lananaqcj6js8htau4		wine	{"id": "579e7c78-a3b7-4632-8a97-5125582b115b"}	55om8sg	55s721c:13w	{"gt8yfqbqc7ca": 1, "3rnpsi5qegpt3": 1}
lananaqcj6js8htau4		vine	{"id": "a59722f6-7671-44a7-8ec6-014b1b3153be"}	55dbhkg	55dp6ag	\N
lananaqcj6js8htau4		vintage	{"id": "2025-pinot", "variety": "PINOT", "vineyard_id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589", "vintage_year": 2025}	55og3e8	55s721c:13w	{"2blc6xwom46ss": 1}
lananaqcj6js8htau4		stage_history	{"id": "43082972-e0b3-4d49-820e-14f0d3264fd4"}	55lyhrs	55o8kps	\N
lananaqcj6js8htau4		stage_history	{"id": "5e1963fe-d487-4980-afd2-5d8adeb92967"}	55jtggg	55jyvxs	\N
lananaqcj6js8htau4		stage_history	{"id": "160c410d-6999-4c9b-8e85-c0d79acabb09"}	55jany8	55k90tc	\N
lananaqcj6js8htau4		measurement	{"id": "2025-pinot-harvest-measurement-1764274276883"}	55ogcso	55s721c:13w	{"3se2qu476j7tg": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "gaqgh9jd3safb2h3o2", "clientGroupID": "lananaqcj6js8htau4"}	55ogcso	55ogcso	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "f11tqbsb5a14b7tfg3", "clientGroupID": "lananaqcj6js8htau4"}	55ojnl4	55ojnl4	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "54199732-420d-47bc-9a85-7b2911b76988"}	55olj8w	55poixs	\N
uk74dsudpgd94faf3n		stage_history	{"id": "33cbf3cb-220b-427c-9f4d-7a839677518a"}	55ollbc	563o7s8:12n	\N
uk74dsudpgd94faf3n		stage_history	{"id": "54199732-420d-47bc-9a85-7b2911b76988"}	55olj8w	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_aging_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_aging_2"}	55z7nj4	563o7s8:12n	\N
lananaqcj6js8htau4		vine	{"id": "28e09c18-37f8-415a-9cab-e26d4c7a749c"}	55dbm5k	55dfloo	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "f38a6m2d84go31q2ll", "clientGroupID": "lananaqcj6js8htau4"}	55jhtug	55jhtug	{"lmids": 1}
lananaqcj6js8htau4		wine	{"id": "6e3160ac-478a-4a4e-8399-e4cda18f53dd"}	55jtxnk	55jzj5s	\N
lananaqcj6js8htau4		task	{"id": "0f9f3639-397a-4dcc-a5c4-1191a5974345"}	55xqy14	55xqy14	{"caqm13mxzbdr": 1}
lananaqcj6js8htau4		task	{"id": "9344d8bb-9906-4b18-8587-b3ac1a5a8b80"}	55xr8sw	55xr8sw	{"caqm13mxzbdr": 1}
lananaqcj6js8htau4		task	{"id": "b6608997-0a00-4104-9577-afb3e23de3dc"}	55xrdq8	55xrdq8	{"caqm13mxzbdr": 1}
lananaqcj6js8htau4		task	{"id": "f0627fba-1ba4-46d4-995f-8ae71dcbfc07"}	55xripk	55xripk	{"caqm13mxzbdr": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "sdkb93u4o8g1cpstm1", "clientGroupID": "lananaqcj6js8htau4"}	55oncwg	55oncwg	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "33cbf3cb-220b-427c-9f4d-7a839677518a"}	55ollbc	55poixs	\N
lananaqcj6js8htau4		stage_history	{"id": "2025-pinot-harvested-1764274276883"}	55og894	55poixs:01	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_racking_3"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_racking_4"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_secondary_red_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_secondary_red_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_secondary_rose_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_veraison_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_veraison_2"}	55z7nj4	563o7s8:12n	\N
lananaqcj6js8htau4		task_template	{"id": "tt_flowering_2"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		vine	{"id": "aad14ae7-835c-4129-8eb5-ed4d12d7bfaf"}	55dbqo8	55dpibs	\N
lananaqcj6js8htau4		task_template	{"id": "tt_fruiting_2"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		stage_history	{"id": "ff804a93-dc9b-41aa-a2db-482e62c6e6d2"}	55jiae0	55jz3xs	\N
lananaqcj6js8htau4		task_template	{"id": "tt_harvest_1"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_harvest_2"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_oaking_red_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_oaking_red_2"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_oaking_red_3"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_pre_harvest_1"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_pre_harvest_2"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_pre_harvest_3"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_primary_red_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_primary_red_2"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_primary_red_4"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_primary_rose_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_primary_rose_2"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_primary_rose_3"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_primary_white_2"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_primary_white_3"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_racking_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_racking_2"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_racking_3"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_racking_4"}	55jle6o	55poixs:01	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_bottling_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_bottling_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_bottling_3"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_bottling_4"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_bottling_5"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_bud_break_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_bud_break_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_crush_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_crush_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_crush_3"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_flowering_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_flowering_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_fruiting_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_fruiting_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_harvest_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_harvest_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_harvest_3"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_oaking_red_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_oaking_red_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_oaking_red_3"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_pre_harvest_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_pre_harvest_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_pre_harvest_3"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_red_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_red_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_red_3"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_red_4"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_rose_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_rose_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_rose_3"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_white_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_white_2"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_primary_white_3"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_racking_1"}	55z7nj4	563o7s8:12n	\N
uk74dsudpgd94faf3n		task_template	{"id": "tt_racking_2"}	55z7nj4	563o7s8:12n	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "vi2b2qad97gu9gudo2", "clientGroupID": "lananaqcj6js8htau4"}	55dbv7k	55dbv7k	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "75f74482-5d25-43da-991a-148e6546a3a3"}	55dbv7k	55dldqg	\N
lananaqcj6js8htau4		task	{"id": "ee64bcf9-0d58-4274-9614-70bde93b6b3f"}	55ju348	55jzf5k	\N
lananaqcj6js8htau4		task_template	{"id": "tt_aging_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_aging_2"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_bottling_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_bottling_2"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_bottling_3"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_bottling_4"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_bottling_5"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_bud_break_1"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_bud_break_2"}	55jl0m0	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_crush_1"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		task_template	{"id": "tt_crush_2"}	55jle6o	55poixs:01	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "l84fi8hlnf2ai3sbvb", "clientGroupID": "lananaqcj6js8htau4"}	55qzzhs	55qzzhs	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "gglfcqmlreh1c952p3", "clientGroupID": "lananaqcj6js8htau4"}	55s721c	55s721c	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "iat7hq4lma4h3sljh7", "clientGroupID": "lananaqcj6js8htau4"}	55ju828	55ju828	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "140e9709-7b1b-48af-9273-b857b75e2a14"}	55cuau0	55depdc	\N
lananaqcj6js8htau4		vine	{"id": "15592480-5173-4e96-85a0-642d4148ae30"}	55ejgio	55fgk7s	\N
lananaqcj6js8htau4		vine	{"id": "2315f1cc-4479-49fb-bd8c-0a602b78273b"}	55ek3ns	55fh9aw	\N
lananaqcj6js8htau4		vine	{"id": "2c82b510-ed0d-48a5-9791-dc1429d9a67a"}	55ekqrc	55fhyrk	\N
lananaqcj6js8htau4		vine	{"id": "3cd0aed0-dfdd-446d-abc0-58ee6a0c41bd"}	55emf0g	55fjl5k	\N
lananaqcj6js8htau4		vine	{"id": "43d07b0e-1af5-4869-9753-9dee6acbcc73"}	55emoaw	55fjtbk	\N
lananaqcj6js8htau4		vine	{"id": "5e5bd024-ec6b-43ad-b5f5-21e63726217b"}	55ep4cg	55fmhhc	\N
lananaqcj6js8htau4		vine	{"id": "75a551e8-c157-4790-981b-1ab3b589404f"}	55eqxcw	55fo748	\N
lananaqcj6js8htau4		vine	{"id": "7b6cb2d9-1a84-49eb-953f-99cfaf471632"}	55erubs	55fp2fs	\N
lananaqcj6js8htau4		vine	{"id": "80cc394b-b93f-4421-bb59-62cc894cda64"}	55esm08	55fpqu0	\N
lananaqcj6js8htau4		vine	{"id": "839c83d8-bcf1-4af6-8bb4-b8085b27a60b"}	55esqkw	55fpuvs	\N
lananaqcj6js8htau4		vine	{"id": "8cd8eb22-13c5-440f-b775-d8351fa822c8"}	55ete00	55fqihc	\N
lananaqcj6js8htau4		vine	{"id": "91dda0ed-dadb-4dd9-b21c-7de70be59665"}	55eu1bc	55fr2jk	\N
lananaqcj6js8htau4		vine	{"id": "9f79a4a0-17fc-4647-90d2-b634c20f6d18"}	55eut2o	55fruhc	\N
lananaqcj6js8htau4		vine	{"id": "a0204866-daa3-4450-b964-3ac4159c42ae"}	55euxo0	55fryhc	\N
lananaqcj6js8htau4		vine	{"id": "b5bf2de0-e6c9-4028-a462-ea66ec9b2bfc"}	55evysg	55fsyuo	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "t2p96iu4rd3gcl72kr", "clientGroupID": "lananaqcj6js8htau4"}	55dumkw	55dumkw	{"lmids": 1}
lananaqcj6js8htau4		zero_0.clients	{"clientID": "dfipfsll3649bad863", "clientGroupID": "lananaqcj6js8htau4"}	55eek68	55eek68	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "030ea5a3-0c01-4248-baea-56da0e485c83"}	55cuoi8	55ddt2w	\N
lananaqcj6js8htau4		vine	{"id": "04348145-4880-42ce-a40c-96833cd5a115"}	55d3qmo	55ddx4o	\N
lananaqcj6js8htau4		vine	{"id": "0d8cb010-3700-4adb-a1fd-db3d66f7d1d3"}	55cytf4	55de6q8	\N
lananaqcj6js8htau4		vine	{"id": "0e2c7f28-e324-44bb-9a5d-7268eb76b666"}	55cyf8o	55dedc0	\N
lananaqcj6js8htau4		vine	{"id": "2952e561-22e7-432b-8fae-226a4657745b"}	55cw7dk	55dfpqg	\N
lananaqcj6js8htau4		vine	{"id": "313cc45b-f99c-47bd-81fb-06b9f4c5ab16"}	55cx3ds	55dgd0w	\N
lananaqcj6js8htau4		vine	{"id": "a0bd0068-e255-40f3-9ac6-9ee136771fb9"}	55csrc8	55dou3k	\N
lananaqcj6js8htau4		stage_history	{"id": "a841ea26-1223-45f5-86e6-168a73f939ba"}	55jtnts	55jyzyo	\N
lananaqcj6js8htau4		vine	{"id": "06001679-376b-406e-9913-982103ff2694"}	55eia68	55fdy2w	\N
lananaqcj6js8htau4		vine	{"id": "0de3ca0e-c8db-4bb1-8d21-064f9b07fc24"}	55eio34	55ffguo	\N
lananaqcj6js8htau4		vine	{"id": "0eb72bf3-77c1-4faa-851f-00be8d2e5d67"}	55eiss8	55ffkx4	\N
lananaqcj6js8htau4		vine	{"id": "1580fb9f-991b-439e-92fb-b52ab4805352"}	55ejl60	55fgt6o	\N
lananaqcj6js8htau4		vine	{"id": "26a4868a-21c3-4e78-aed9-d52ab244cfeb"}	55ekcwo	55fhhc0	\N
lananaqcj6js8htau4		vine	{"id": "331b9735-e576-4956-8387-7b979c7e4f50"}	55ekzz4	55fi6so	\N
lananaqcj6js8htau4		vine	{"id": "356a10d7-cce5-47ec-bc6d-4791a054ee2a"}	55eldu8	55fiivc	\N
lananaqcj6js8htau4		vine	{"id": "3c340221-f43a-4b2a-8729-4f18c053b98d"}	55em5mw	55fjd4o	\N
lananaqcj6js8htau4		vine	{"id": "40449130-2da2-4895-863d-04aac52bc2c4"}	55emjm8	55fjpao	\N
lananaqcj6js8htau4		vine	{"id": "4e662e80-3a65-4945-b5f3-b70bba90ea58"}	55enbag	55fkjjs	\N
lananaqcj6js8htau4		vine	{"id": "537d7fb8-8739-48e9-81a2-aeb1b565e894"}	55enyeg	55flg0o	\N
lananaqcj6js8htau4		vine	{"id": "564027ee-8e93-403a-a16b-11de081bf39c"}	55eo7o8	55flo3c	\N
lananaqcj6js8htau4		vine	{"id": "5734bea7-48fb-4843-be45-7e345be9ecc5"}	55eocbk	55fls4w	\N
lananaqcj6js8htau4		vine	{"id": "589c9322-fc52-47d8-ba4e-4b171a0a0ff9"}	55eogyw	55flwa8	\N
lananaqcj6js8htau4		vine	{"id": "596682d1-c7eb-49b0-88f6-c2e402c4274d"}	55eolns	55fm18g	\N
lananaqcj6js8htau4		vine	{"id": "5c9e79a8-1285-414d-9656-3026af2d31d3"}	55eoqa8	55fm5a0	\N
lananaqcj6js8htau4		vine	{"id": "5e3f2ef3-9e17-4686-8581-3e7a88b285a0"}	55eozpk	55fmdfs	\N
lananaqcj6js8htau4		vine	{"id": "66f816d7-8176-4123-ae8a-58832b45db03"}	55epi5s	55fmyo0	\N
lananaqcj6js8htau4		vine	{"id": "68fd87db-6bd8-46f7-aaa3-7a399130c637"}	55epmsw	55fn2rc	\N
lananaqcj6js8htau4		vine	{"id": "69428bcb-2730-402e-a19d-fb9161a274c2"}	55eprkg	55fn6sw	\N
lananaqcj6js8htau4		vine	{"id": "709b6152-ee40-4394-8cd9-64022f82643e"}	55eq0so	55fnevk	\N
lananaqcj6js8htau4		vine	{"id": "721f2e1b-edcf-4907-b356-56af14ab0b11"}	55eqa3s	55fnmwg	\N
lananaqcj6js8htau4		vine	{"id": "72f0259a-75eb-47a8-b2e9-9ce592deb230"}	55eqo1c	55fnz1c	\N
lananaqcj6js8htau4		vine	{"id": "7407fc9c-a8c4-44a8-a333-2602d8435fbd"}	55eqso8	55fo34w	\N
lananaqcj6js8htau4		vine	{"id": "7cb8d325-1744-4c8f-8634-e37de8d23270"}	55es3k8	55fpahk	\N
lananaqcj6js8htau4		vine	{"id": "8eb139d1-932f-4d33-91a3-349fb7626dc0"}	55etilc	55fqmig	\N
lananaqcj6js8htau4		vine	{"id": "97da11a3-da3a-4d67-94a0-6ef402d16259"}	55euf4g	55freko	\N
lananaqcj6js8htau4		vine	{"id": "a553fd96-7aa4-4ea4-bf04-c8709f35428c"}	55evg2g	55fsenc	\N
lananaqcj6js8htau4		vine	{"id": "ab7dff7a-bc28-46f8-bbe3-345414d4ec52"}	55evkqg	55fsip4	\N
lananaqcj6js8htau4		vine	{"id": "b7166e64-f166-4337-99a7-0d0d85d7d795"}	55ew3d4	55ft2u0	\N
lananaqcj6js8htau4		vine	{"id": "c5ae2935-a38c-46e6-b9bf-8146700f1aea"}	55ewqg8	55ftmw8	\N
lananaqcj6js8htau4		vine	{"id": "cb380160-f67b-4c67-b4d1-4574e4768512"}	55ewzns	55fu0hk	\N
lananaqcj6js8htau4		vine	{"id": "d0d1076b-120d-4505-a3ca-20802f3ba4c7"}	55ex4cg	55fu4io	\N
lananaqcj6js8htau4		vine	{"id": "dbc22400-17d2-46de-8f50-6c52b7b3a847"}	55exmvs	55fuklc	\N
lananaqcj6js8htau4		vine	{"id": "ed7cef30-8a89-424c-aa69-271ecc005664"}	55ez27c	55fvxow	\N
lananaqcj6js8htau4		vine	{"id": "ef9e3f1e-5276-4e10-a157-65756eb07308"}	55ez6u8	55fw1ow	\N
lananaqcj6js8htau4		vine	{"id": "efe50e14-ca02-4dbf-b15a-c50ccab8c8af"}	55ezbiw	55fwc20	\N
lananaqcj6js8htau4		vine	{"id": "f12da11b-0d4f-4f2d-86ac-bc903031fc71"}	55ezq14	55fwu34	\N
lananaqcj6js8htau4		vine	{"id": "f3eaa0fa-945e-4bff-a062-f2fe6451e204"}	55f0434	55fx680	\N
lananaqcj6js8htau4		vine	{"id": "f5f3d3d6-175d-4c9b-8ca6-15c5cf46d01f"}	55f0e2o	55fxe7c	\N
lananaqcj6js8htau4		vine	{"id": "fa9683e1-821a-4acc-8474-272e5b67e3e1"}	55f0s3c	55fxq8g	\N
lananaqcj6js8htau4		vine	{"id": "ffd6e96a-ec92-4cfb-8922-a1e863245e15"}	55f11jk	55fxy9k	\N
lananaqcj6js8htau4		task	{"id": "1d131483-c262-4dc1-a26f-4dd4c4c08b5f"}	55ju828	55jzb7s	\N
lananaqcj6js8htau4		vine	{"id": "35eb39ab-22c0-45e0-8f00-97405ac36046"}	55eliiw	55fin00	\N
lananaqcj6js8htau4		vine	{"id": "3cb4781c-71f5-4d61-b147-f78c568780c2"}	55emaaw	55fjh68	\N
lananaqcj6js8htau4		vine	{"id": "4b08e0a2-6836-4278-abbc-59907b638def"}	55en240	55fkbg0	\N
lananaqcj6js8htau4		vine	{"id": "77ab1526-3e82-450d-a437-1e77d96f7937"}	55erbxc	55foj5c	\N
lananaqcj6js8htau4		vine	{"id": "80338495-273c-412c-9c59-bc1ae0dc4ed1"}	55eshew	55fpmuo	\N
lananaqcj6js8htau4		vine	{"id": "86f23622-3cfc-4386-8bc4-7b579a3c7865"}	55et00g	55fq2y0	\N
lananaqcj6js8htau4		vine	{"id": "89f20e86-e10e-46a9-bd50-67f260cd905f"}	55et9eo	55fqehc	\N
lananaqcj6js8htau4		vine	{"id": "9f0aafab-9277-4599-b9b1-1cf30073a4de"}	55eujt4	55frik0	\N
lananaqcj6js8htau4		vine	{"id": "d60b01b8-3981-4fcb-a53d-f3c2d3a4bfaf"}	55exiag	55fuglc	\N
lananaqcj6js8htau4		vine	{"id": "f14e3f89-ed19-4078-9e66-5bb8bbb98d46"}	55ezups	55fwy2g	\N
lananaqcj6js8htau4		vine	{"id": "f677344e-522e-4b26-aabe-b3054605ae1d"}	55f0ipk	55fxi8g	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "kol92elp5mrobf5e9d", "clientGroupID": "lananaqcj6js8htau4"}	55jwofs	55jwofs	{"lmids": 1}
lananaqcj6js8htau4		stage_history	{"id": "78ef7021-5f37-4e0b-a1d6-4570a882c2c0"}	55jxgls	55k6seg	\N
lananaqcj6js8htau4		wine	{"id": "ed1430bb-2eca-44b4-9fb5-7376d039c357"}	55jxldk	55k8lns	\N
lananaqcj6js8htau4		vine	{"id": "099cf603-19c7-42cd-9e6d-2a61b3eaed6f"}	55eieu8	55fer2o	\N
lananaqcj6js8htau4		vine	{"id": "158a539a-7983-444f-a826-badd0450ca54"}	55ejpuo	55fgx9s	\N
lananaqcj6js8htau4		vine	{"id": "1cb5ee68-25d7-4cdd-98a5-fae87f6a223c"}	55ejug0	55fh1bk	\N
lananaqcj6js8htau4		vine	{"id": "33c40d43-da4c-4e18-ab41-810af8de0893"}	55el4ns	55fiau8	\N
lananaqcj6js8htau4		vine	{"id": "486791a8-7eac-4d50-bbe9-35b5ca3d156a"}	55emxgw	55fk7go	\N
lananaqcj6js8htau4		vine	{"id": "4cafb37f-6ddc-489f-bfd7-cc24a3d747cf"}	55en6pc	55fkfg0	\N
lananaqcj6js8htau4		vine	{"id": "51844018-21b7-48ad-8fb1-c10099b9052a"}	55enp5s	55fl1vc	\N
lananaqcj6js8htau4		vine	{"id": "dee7abc8-1a69-415b-8e62-6e4b288dfb64"}	55ey0qg	55fuwmg	\N
lananaqcj6js8htau4		vine	{"id": "e9e4ed89-4a01-4eb2-b6c4-e25e9267d1fa"}	55eyocg	55fvgoo	\N
lananaqcj6js8htau4		vine	{"id": "f1268f10-1d77-4c0a-a30a-2e8a9c4286e1"}	55ezks8	55fwq1c	\N
lananaqcj6js8htau4		vine	{"id": "fc20963c-22a3-4bde-b1c7-035b3334434f"}	55f0wu8	55fxu9k	\N
lananaqcj6js8htau4		stage_history	{"id": "8ca78413-8ca9-4854-a660-f57c13cb6082"}	55jxafk	55k7p14	\N
lananaqcj6js8htau4		vine	{"id": "041a9897-2dfc-4eb8-8c7e-2d66db0bba73"}	55ei0yw	55fdb1c	\N
lananaqcj6js8htau4		vine	{"id": "290e8b2c-c7e5-4d17-993f-ac9913919735"}	55ekm48	55fhpg8	\N
lananaqcj6js8htau4		vine	{"id": "52eff436-d4ab-406b-abf9-c5d9e4c3f813"}	55entso	55fl5x4	\N
lananaqcj6js8htau4		vine	{"id": "787df0f5-0d2d-47c7-871a-369d06907c50"}	55erl40	55forag	\N
lananaqcj6js8htau4		vine	{"id": "7f6c8c60-f763-4ba9-89c1-c251349d6e75"}	55escrs	55fpirk	\N
lananaqcj6js8htau4		vine	{"id": "83e6fa18-8356-470a-aa6b-1582ab532fbb"}	55esvf4	55fpyyo	\N
lananaqcj6js8htau4		vine	{"id": "8edf3f92-16c2-4ba9-ae65-5231b523956b"}	55etng0	55fqqig	\N
lananaqcj6js8htau4		vine	{"id": "932bb9ac-fdbe-43f6-bae4-de111063ebc8"}	55eu5w0	55fr6iw	\N
lananaqcj6js8htau4		vine	{"id": "9f5faf4e-e404-42df-af59-6725d0829bba"}	55euods	55frqi0	\N
lananaqcj6js8htau4		vine	{"id": "e5996026-8c7d-4d0c-8301-21d2c9effced"}	55eyajc	55fv4nk	\N
lananaqcj6js8htau4		vine	{"id": "f32bc7c8-c876-4574-ab07-85c11ddb014a"}	55ezzeg	55fx268	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "eo0qugng3mpspb58as", "clientGroupID": "lananaqcj6js8htau4"}	55jzj5s	55jzj5s	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "00607de9-a63e-4705-8d66-8a1555cf2457"}	55ehrs0	55fc8zk	\N
lananaqcj6js8htau4		vine	{"id": "130591c3-a311-4770-b4d1-f3442477e964"}	55ej2p4	55fg5so	\N
lananaqcj6js8htau4		vine	{"id": "32cba5c1-bd1c-4d51-a9fe-0bb42ce7874f"}	55ekvc0	55fi2rk	\N
lananaqcj6js8htau4		vine	{"id": "348114aa-1306-41a0-b66a-c2161695d59e"}	55el994	55fietk	\N
lananaqcj6js8htau4		vine	{"id": "7a75f5d8-8d78-40ee-b8d4-0467d68d7e6e"}	55erpqg	55fov9s	\N
lananaqcj6js8htau4		vine	{"id": "7f66eb5c-28a5-4a18-ad4d-72beb2651669"}	55es86g	55fpeio	\N
lananaqcj6js8htau4		vine	{"id": "a0a4f24e-3f4f-4f22-901e-eadfbbeed851"}	55ev28o	55fs2ig	\N
lananaqcj6js8htau4		vine	{"id": "aee271c2-b9b0-470a-9eaf-2f92e341f6b2"}	55evpdc	55fsqps	\N
lananaqcj6js8htau4		vine	{"id": "dd009a79-b7c6-4466-aa85-794f71dfb066"}	55exrio	55fuomg	\N
lananaqcj6js8htau4		vine	{"id": "e3a386df-9fcf-4bce-8d5a-f26573f7dd0e"}	55ey5rc	55fv0nk	\N
lananaqcj6js8htau4		vine	{"id": "e8113702-b586-453d-923e-8121b32707aa"}	55eyf4o	55fv8nk	\N
lananaqcj6js8htau4		vintage	{"id": "2016-sauv", "variety": "SAUV", "vineyard_id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589", "vintage_year": 2016}	555y3mw	55o2oag	\N
lananaqcj6js8htau4		vintage	{"id": "2016-pinot", "variety": "PINOT", "vineyard_id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589", "vintage_year": 2016}	555xk5k	55o3sk0	\N
lananaqcj6js8htau4		vintage	{"id": "2016-cab", "variety": "CAB", "vineyard_id": "35b4e8bc-cbfb-448d-bb9e-a43ca4e35589", "vintage_year": 2016}	555x448	55o4puw	\N
lananaqcj6js8htau4		wine	{"id": "71442004-0ed0-4446-90e2-d57d2ac8874c"}	55gzmv4	55h67bk	\N
lananaqcj6js8htau4		task	{"id": "95f46a6a-ab3d-41b7-a8af-3f6292da61e7"}	55jxqag	55k867c	\N
lananaqcj6js8htau4		vine	{"id": "39bb647a-6fc1-4868-815d-905a4a846f62"}	55elrpk	55fixu8	\N
lananaqcj6js8htau4		vine	{"id": "3ba45d12-262e-4da1-b991-12208bd01d1c"}	55em114	55fj92w	\N
lananaqcj6js8htau4		vine	{"id": "5d68e8f3-68bb-47a3-84c1-a41e6c5656cf"}	55eouyw	55fm9co	\N
lananaqcj6js8htau4		vine	{"id": "72cadd6a-d3f7-49cc-9a82-485d31009222"}	55eqeqo	55fnqy8	\N
lananaqcj6js8htau4		vine	{"id": "7ca8c8ff-7703-43c8-aaa5-98e09d4dea23"}	55eryx4	55fp6hk	\N
lananaqcj6js8htau4		vine	{"id": "b55732da-943d-48f2-86e5-7ecd7483612d"}	55evtyo	55fsurk	\N
lananaqcj6js8htau4		vine	{"id": "bd7ccb03-ca57-44fb-8270-d960fab9f2aa"}	55ewcn4	55ftav4	\N
lananaqcj6js8htau4		vine	{"id": "d268b73c-d9a0-4de8-a430-42f823e0d872"}	55exdko	55fuclc	\N
lananaqcj6js8htau4		vine	{"id": "ebc1283d-de1d-483c-a190-93523e48fe2a"}	55eyxkw	55fvtpk	\N
lananaqcj6js8htau4		vine	{"id": "f6b18157-f5ea-4134-8199-456bf0ec4fd7"}	55f0nc8	55fxm8g	\N
lananaqcj6js8htau4		task	{"id": "76592c3e-5d0d-4f53-b07b-7be7a767915e"}	55jxxzk	55k80y0	\N
lananaqcj6js8htau4		vine	{"id": "12b271bf-4b5a-49e4-9089-b8f41363e9e9"}	55eiy3k	55ffp08	\N
lananaqcj6js8htau4		vine	{"id": "3b676c10-a7d7-4f6f-88f3-0f38551cc00b"}	55elwfc	55fj4zs	\N
lananaqcj6js8htau4		vine	{"id": "4f43b621-8935-43e4-ac44-9c74d1f88f9c"}	55enkkg	55fkrko	\N
lananaqcj6js8htau4		vine	{"id": "709cf33f-4af0-4b2e-a3a8-cba29e29cd4f"}	55eq5j4	55fnix4	\N
lananaqcj6js8htau4		vine	{"id": "874c5ca1-bb5f-4c88-b687-628dc058dd6d"}	55et4rk	55fqahc	\N
lananaqcj6js8htau4		vine	{"id": "90abe2c5-31c7-4ac8-a4e0-af1762d3072e"}	55ets2w	55fquhs	\N
lananaqcj6js8htau4		vine	{"id": "94eecf3d-a32b-41cb-b119-ce48ab9d2d45"}	55euahc	55frako	\N
lananaqcj6js8htau4		vine	{"id": "a0beb62a-c849-486b-a801-652575c804a9"}	55ev6vs	55fs6ig	\N
lananaqcj6js8htau4		vine	{"id": "c5a71251-e8a6-41d6-9109-edd65c02330f"}	55ewlt4	55ftiww	\N
lananaqcj6js8htau4		vine	{"id": "f4025b29-bc01-4eea-831a-83da2011bd62"}	55f08rs	55fxa7c	\N
lananaqcj6js8htau4		task	{"id": "97326d9a-17e3-452b-9248-e656db939133"}	55jy42w	55k8d60	\N
lananaqcj6js8htau4		vine	{"id": "05420515-6423-4ea6-9f56-9f42d1139a83"}	55ei5kg	55fdla8	\N
lananaqcj6js8htau4		vine	{"id": "1ec21695-a217-42e1-ba36-cce6c01ca16d"}	55ejz2g	55fh5aw	\N
lananaqcj6js8htau4		vine	{"id": "371b6eb8-e891-42c5-8815-f48940f898b9"}	55eln48	55fitt4	\N
lananaqcj6js8htau4		vine	{"id": "5433fcf6-5911-48d7-9e46-d7f695000dc6"}	55eo31c	55flk3c	\N
lananaqcj6js8htau4		vine	{"id": "5f154770-a97a-4594-9832-877687b4f488"}	55ep8x4	55fmlig	\N
lananaqcj6js8htau4		vine	{"id": "65d039d3-6609-4179-928b-87652c930903"}	55epdk8	55fmpig	\N
lananaqcj6js8htau4		vine	{"id": "6f887bbb-92ff-4bf7-80f9-b6e39bb5bcec"}	55epw7c	55fnats	\N
lananaqcj6js8htau4		vine	{"id": "72e439e1-abd1-471d-be2f-7dca2e226fdf"}	55eqjds	55fnuxk	\N
lananaqcj6js8htau4		vine	{"id": "914df79e-8036-49b2-9cf3-1df01c3ce328"}	55etwo8	55fqyjk	\N
lananaqcj6js8htau4		vine	{"id": "f09b6455-0fd8-41ff-bd68-3fdd4123df64"}	55ezg6w	55fwg80	\N
lananaqcj6js8htau4		task	{"id": "57f49918-88b3-4178-869a-abcb16b4f359"}	55jya40	55k7vt4	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "qkhr7raed6ths7fd5i", "clientGroupID": "lananaqcj6js8htau4"}	55kc2o8	55kc2o8	{"lmids": 1}
lananaqcj6js8htau4		wine	{"id": "5bb02965-6215-4238-ab0d-9c56705b20ec"}	55kbrag	55kqkt4	\N
lananaqcj6js8htau4		vine	{"id": "0a7c0646-db9d-4ec2-bdd8-23212a79de88"}	55eijhc	55ffai0	\N
lananaqcj6js8htau4		vine	{"id": "13ccf1df-9ecd-4f25-8936-16532ff8407a"}	55ej7cg	55fg9tk	\N
lananaqcj6js8htau4		vine	{"id": "278bd7e6-9424-43b8-8575-b612a3c3402f"}	55ekhiw	55fhlf4	\N
lananaqcj6js8htau4		vine	{"id": "76959dc7-3cdc-4cbc-8409-00ac895db8fc"}	55er1y8	55fob48	\N
lananaqcj6js8htau4		vine	{"id": "a2beafa8-69d2-4e86-a719-0a7f5f493978"}	55evbh4	55fsam8	\N
lananaqcj6js8htau4		vine	{"id": "bf9bef39-3e4b-4cf5-9ff1-4a8a79e65c9a"}	55ewh8g	55ftev4	\N
lananaqcj6js8htau4		vine	{"id": "c9fc1a30-bbbd-4199-bea0-4a07c8bfedcf"}	55ewv34	55ftqw8	\N
lananaqcj6js8htau4		vine	{"id": "d107402b-4d6a-44ab-9725-0691794da897"}	55ex8zc	55fu8io	\N
lananaqcj6js8htau4		vine	{"id": "e8725c7a-01bc-4a12-bbee-b8e85f16ef94"}	55eyjpc	55fvcoo	\N
lananaqcj6js8htau4		zero_0.clients	{"clientID": "gsjih8rvbt4bfsbn97", "clientGroupID": "lananaqcj6js8htau4"}	55k9ve0	55k9ve0	{"lmids": 1}
lananaqcj6js8htau4		vine	{"id": "147d267b-0449-4183-ac58-e5e0f86e1aaf"}	55ejbxs	55fgdv4	\N
lananaqcj6js8htau4		vine	{"id": "26a066a2-62fc-4132-91f5-bb4f9491d2e0"}	55ek894	55fhdco	\N
lananaqcj6js8htau4		vine	{"id": "45da9fda-6263-4dd0-a0c8-7608606a93b0"}	55emsvk	55fjxbk	\N
lananaqcj6js8htau4		vine	{"id": "4edb9ba5-4421-424e-ae49-34c3e5199d52"}	55enfz4	55fknko	\N
lananaqcj6js8htau4		vine	{"id": "77a423ae-196a-43d0-a718-3e46fa233bf3"}	55er6mo	55fof60	\N
lananaqcj6js8htau4		vine	{"id": "782dbfb2-b24f-4e95-b332-364c80f8c7e5"}	55ergio	55fon5c	\N
lananaqcj6js8htau4		vine	{"id": "b93fa3c3-26f3-4faf-9627-03532a5f9aa5"}	55ew800	55ft6vs	\N
lananaqcj6js8htau4		vine	{"id": "de09c17c-d6e6-494a-8d36-ce800e442038"}	55exw5s	55fusmg	\N
lananaqcj6js8htau4		vine	{"id": "eaace722-34b2-4ea1-8c30-7c755eacad5e"}	55eysxs	55fvpns	\N
\.


--
-- Data for Name: rowsVersion; Type: TABLE DATA; Schema: zero_0/cvr; Owner: mattpardini
--

COPY "zero_0/cvr"."rowsVersion" ("clientGroupID", version) FROM stdin;
lananaqcj6js8htau4	55xripk:09
03t8qgkk1nqfk9vv0c	00:01
l8mvh560r0fbhr8lj3	00:01
31mc88jnq97se1qfd3	00:01
um9oencbpuv57ete7t	00:01
kir8njkgnkqiu0b650	00:01
hduufqspughbcleqlh	00:01
j7bhrg08dkl0ut6f8e	00:01
5ph82kuone893qddig	00:01
s7a0o435h2ri4c12g5	00:01
fdm9fr3m544qman1r0	00:01
cm2q3g8j0kgtd3grm7	00:01
nucjcspfqppevp3r6i	00:01
qnohrfdk062faauu7h	00:01
fnfm99oelq3cqe42ki	00:01
uspqnc772u0gl3atvk	00:01
2jgaqgbq1bcrckcvu9	00:01
5f9babhn73rfvnj9rd	00:01
htc76aifuod9vqouk8	00:01
gb84jvct157rn24agr	00:01
k8nqtfgdt1gfua17hj	00:01
ihvkgj53a883ci6pfj	00:01
f6ensgggfospg8ohnh	00:01
g3v14ttgpg24ikddc2	00:01
hnan605eembon699el	00:01
hk190gb9r62o0nurct	00:01
287ctj7acmbh2aediu	00:01
amdndj578iksr3ndab	00:01
t6msrosengq3p4a7ce	00:01
o3nc60rubd8sueu3n3	00:01
uk74dsudpgd94faf3n	566ttgw:0t
88nh1g3umqn4ia48q0	56bncow:0o
\.


--
-- Data for Name: versionHistory; Type: TABLE DATA; Schema: zero_0/cvr; Owner: mattpardini
--

COPY "zero_0/cvr"."versionHistory" ("dataVersion", "schemaVersion", "minSafeVersion", lock) FROM stdin;
14	14	1	v
\.


--
-- Name: _sqlx_migrations _sqlx_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public._sqlx_migrations
    ADD CONSTRAINT _sqlx_migrations_pkey PRIMARY KEY (version);


--
-- Name: alert_settings alert_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.alert_settings
    ADD CONSTRAINT alert_settings_pkey PRIMARY KEY (vineyard_id, alert_type);


--
-- Name: block block_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.block
    ADD CONSTRAINT block_pkey PRIMARY KEY (id);


--
-- Name: measurement measurement_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.measurement
    ADD CONSTRAINT measurement_pkey PRIMARY KEY (id);


--
-- Name: measurement_range measurement_range_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.measurement_range
    ADD CONSTRAINT measurement_range_pkey PRIMARY KEY (id);


--
-- Name: pruning_log pruning_log_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.pruning_log
    ADD CONSTRAINT pruning_log_pkey PRIMARY KEY (id);


--
-- Name: stage_history stage_history_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.stage_history
    ADD CONSTRAINT stage_history_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- Name: task_template task_template_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.task_template
    ADD CONSTRAINT task_template_pkey PRIMARY KEY (id);


--
-- Name: measurement_range unique_range_per_type; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.measurement_range
    ADD CONSTRAINT unique_range_per_type UNIQUE (wine_type, measurement_type);


--
-- Name: vintage unique_vintage_per_variety_year; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.vintage
    ADD CONSTRAINT unique_vintage_per_variety_year UNIQUE (vineyard_id, variety, vintage_year);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: vine vine_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.vine
    ADD CONSTRAINT vine_pkey PRIMARY KEY (id);


--
-- Name: vineyard vineyard_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.vineyard
    ADD CONSTRAINT vineyard_pkey PRIMARY KEY (id);


--
-- Name: vintage vintage_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.vintage
    ADD CONSTRAINT vintage_pkey PRIMARY KEY (id);


--
-- Name: vintage vintage_unique_source; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.vintage
    ADD CONSTRAINT vintage_unique_source UNIQUE (vineyard_id, variety, vintage_year, grape_source, supplier_name);


--
-- Name: wine wine_pkey; Type: CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.wine
    ADD CONSTRAINT wine_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: zero; Owner: mattpardini
--

ALTER TABLE ONLY zero.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (lock);


--
-- Name: schemaVersions schemaVersions_pkey; Type: CONSTRAINT; Schema: zero; Owner: mattpardini
--

ALTER TABLE ONLY zero."schemaVersions"
    ADD CONSTRAINT "schemaVersions_pkey" PRIMARY KEY (lock);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: zero_0; Owner: mattpardini
--

ALTER TABLE ONLY zero_0.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY ("clientGroupID", "clientID");


--
-- Name: mutations mutations_pkey; Type: CONSTRAINT; Schema: zero_0; Owner: mattpardini
--

ALTER TABLE ONLY zero_0.mutations
    ADD CONSTRAINT mutations_pkey PRIMARY KEY ("clientGroupID", "clientID", "mutationID");


--
-- Name: versionHistory pk_schema_meta_lock; Type: CONSTRAINT; Schema: zero_0; Owner: mattpardini
--

ALTER TABLE ONLY zero_0."versionHistory"
    ADD CONSTRAINT pk_schema_meta_lock PRIMARY KEY (lock);


--
-- Name: replicas replicas_pkey; Type: CONSTRAINT; Schema: zero_0; Owner: mattpardini
--

ALTER TABLE ONLY zero_0.replicas
    ADD CONSTRAINT replicas_pkey PRIMARY KEY (slot);


--
-- Name: shardConfig shardConfig_pkey; Type: CONSTRAINT; Schema: zero_0; Owner: mattpardini
--

ALTER TABLE ONLY zero_0."shardConfig"
    ADD CONSTRAINT "shardConfig_pkey" PRIMARY KEY (lock);


--
-- Name: changeLog changeLog_pkey; Type: CONSTRAINT; Schema: zero_0/cdc; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cdc"."changeLog"
    ADD CONSTRAINT "changeLog_pkey" PRIMARY KEY (watermark, pos);


--
-- Name: versionHistory pk_schema_meta_lock; Type: CONSTRAINT; Schema: zero_0/cdc; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cdc"."versionHistory"
    ADD CONSTRAINT pk_schema_meta_lock PRIMARY KEY (lock);


--
-- Name: replicationConfig replicationConfig_pkey; Type: CONSTRAINT; Schema: zero_0/cdc; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cdc"."replicationConfig"
    ADD CONSTRAINT "replicationConfig_pkey" PRIMARY KEY (lock);


--
-- Name: replicationState replicationState_pkey; Type: CONSTRAINT; Schema: zero_0/cdc; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cdc"."replicationState"
    ADD CONSTRAINT "replicationState_pkey" PRIMARY KEY (lock);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr".clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY ("clientGroupID", "clientID");


--
-- Name: desires desires_pkey; Type: CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr".desires
    ADD CONSTRAINT desires_pkey PRIMARY KEY ("clientGroupID", "clientID", "queryHash");


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr".instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY ("clientGroupID");


--
-- Name: versionHistory pk_schema_meta_lock; Type: CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr"."versionHistory"
    ADD CONSTRAINT pk_schema_meta_lock PRIMARY KEY (lock);


--
-- Name: queries queries_pkey; Type: CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr".queries
    ADD CONSTRAINT queries_pkey PRIMARY KEY ("clientGroupID", "queryHash");


--
-- Name: rowsVersion rowsVersion_pkey; Type: CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr"."rowsVersion"
    ADD CONSTRAINT "rowsVersion_pkey" PRIMARY KEY ("clientGroupID");


--
-- Name: rows rows_pkey; Type: CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr".rows
    ADD CONSTRAINT rows_pkey PRIMARY KEY ("clientGroupID", schema, "table", "rowKey");


--
-- Name: idx_alert_settings_type; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_alert_settings_type ON public.alert_settings USING btree (alert_type);


--
-- Name: idx_alert_settings_updated_at; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_alert_settings_updated_at ON public.alert_settings USING btree (updated_at);


--
-- Name: idx_block_training_method; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_block_training_method ON public.block USING btree (training_method);


--
-- Name: idx_block_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_block_user_id ON public.block USING btree (user_id);


--
-- Name: idx_measurement_date; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_measurement_date ON public.measurement USING btree (date);


--
-- Name: idx_measurement_entity; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_measurement_entity ON public.measurement USING btree (entity_type, entity_id);


--
-- Name: idx_measurement_range_wine_type; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_measurement_range_wine_type ON public.measurement_range USING btree (wine_type);


--
-- Name: idx_measurement_stage; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_measurement_stage ON public.measurement USING btree (stage);


--
-- Name: idx_measurement_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_measurement_user_id ON public.measurement USING btree (user_id);


--
-- Name: idx_pruning_log_date; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_pruning_log_date ON public.pruning_log USING btree (date);


--
-- Name: idx_pruning_log_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_pruning_log_user_id ON public.pruning_log USING btree (user_id);


--
-- Name: idx_pruning_log_vine_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_pruning_log_vine_id ON public.pruning_log USING btree (vine_id);


--
-- Name: idx_stage_history_entity; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_stage_history_entity ON public.stage_history USING btree (entity_type, entity_id);


--
-- Name: idx_stage_history_stage; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_stage_history_stage ON public.stage_history USING btree (stage);


--
-- Name: idx_stage_history_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_stage_history_user_id ON public.stage_history USING btree (user_id);


--
-- Name: idx_task_completed; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_task_completed ON public.task USING btree (completed_at);


--
-- Name: idx_task_due; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_task_due ON public.task USING btree (due_date);


--
-- Name: idx_task_entity; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_task_entity ON public.task USING btree (entity_type, entity_id);


--
-- Name: idx_task_stage; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_task_stage ON public.task USING btree (stage);


--
-- Name: idx_task_template_stage; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_task_template_stage ON public.task_template USING btree (stage);


--
-- Name: idx_task_template_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_task_template_user_id ON public.task_template USING btree (user_id);


--
-- Name: idx_task_template_vineyard; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_task_template_vineyard ON public.task_template USING btree (vineyard_id);


--
-- Name: idx_task_template_wine_type; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_task_template_wine_type ON public.task_template USING btree (wine_type);


--
-- Name: idx_task_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_task_user_id ON public.task USING btree (user_id);


--
-- Name: idx_user_email; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_user_email ON public."user" USING btree (email);


--
-- Name: idx_user_vineyard_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_user_vineyard_id ON public."user" USING btree (vineyard_id);


--
-- Name: idx_vine_block; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_vine_block ON public.vine USING btree (block);


--
-- Name: idx_vine_training_method; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_vine_training_method ON public.vine USING btree (training_method);


--
-- Name: idx_vine_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_vine_user_id ON public.vine USING btree (user_id);


--
-- Name: idx_vine_variety; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_vine_variety ON public.vine USING btree (variety);


--
-- Name: idx_vineyard_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_vineyard_user_id ON public.vineyard USING btree (user_id);


--
-- Name: idx_vintage_stage; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_vintage_stage ON public.vintage USING btree (current_stage);


--
-- Name: idx_vintage_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_vintage_user_id ON public.vintage USING btree (user_id);


--
-- Name: idx_vintage_vineyard; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_vintage_vineyard ON public.vintage USING btree (vineyard_id);


--
-- Name: idx_vintage_year; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_vintage_year ON public.vintage USING btree (vintage_year);


--
-- Name: idx_wine_stage; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_wine_stage ON public.wine USING btree (current_stage);


--
-- Name: idx_wine_status; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_wine_status ON public.wine USING btree (status);


--
-- Name: idx_wine_user_id; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_wine_user_id ON public.wine USING btree (user_id);


--
-- Name: idx_wine_vineyard; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_wine_vineyard ON public.wine USING btree (vineyard_id);


--
-- Name: idx_wine_vintage; Type: INDEX; Schema: public; Owner: mattpardini
--

CREATE INDEX idx_wine_vintage ON public.wine USING btree (vintage_id);


--
-- Name: desires_inactivated_at; Type: INDEX; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE INDEX desires_inactivated_at ON "zero_0/cvr".desires USING btree ("inactivatedAt");


--
-- Name: desires_patch_version; Type: INDEX; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE INDEX desires_patch_version ON "zero_0/cvr".desires USING btree ("patchVersion");


--
-- Name: instances_last_active; Type: INDEX; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE INDEX instances_last_active ON "zero_0/cvr".instances USING btree ("lastActive");


--
-- Name: queries_patch_version; Type: INDEX; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE INDEX queries_patch_version ON "zero_0/cvr".queries USING btree ("patchVersion" NULLS FIRST);


--
-- Name: row_patch_version; Type: INDEX; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE INDEX row_patch_version ON "zero_0/cvr".rows USING btree ("patchVersion");


--
-- Name: row_ref_counts; Type: INDEX; Schema: zero_0/cvr; Owner: mattpardini
--

CREATE INDEX row_ref_counts ON "zero_0/cvr".rows USING gin ("refCounts");


--
-- Name: permissions on_set_permissions; Type: TRIGGER; Schema: zero; Owner: mattpardini
--

CREATE TRIGGER on_set_permissions BEFORE INSERT OR UPDATE ON zero.permissions FOR EACH ROW EXECUTE FUNCTION zero.set_permissions_hash();


--
-- Name: vine fk_block; Type: FK CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.vine
    ADD CONSTRAINT fk_block FOREIGN KEY (block) REFERENCES public.block(id);


--
-- Name: pruning_log pruning_log_vine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.pruning_log
    ADD CONSTRAINT pruning_log_vine_id_fkey FOREIGN KEY (vine_id) REFERENCES public.vine(id) ON DELETE CASCADE;


--
-- Name: task task_task_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_task_template_id_fkey FOREIGN KEY (task_template_id) REFERENCES public.task_template(id) ON DELETE SET NULL;


--
-- Name: user user_vineyard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_vineyard_id_fkey FOREIGN KEY (vineyard_id) REFERENCES public.vineyard(id) ON DELETE SET NULL;


--
-- Name: vintage vintage_vineyard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.vintage
    ADD CONSTRAINT vintage_vineyard_id_fkey FOREIGN KEY (vineyard_id) REFERENCES public.vineyard(id);


--
-- Name: wine wine_vineyard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.wine
    ADD CONSTRAINT wine_vineyard_id_fkey FOREIGN KEY (vineyard_id) REFERENCES public.vineyard(id);


--
-- Name: wine wine_vintage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mattpardini
--

ALTER TABLE ONLY public.wine
    ADD CONSTRAINT wine_vintage_id_fkey FOREIGN KEY (vintage_id) REFERENCES public.vintage(id) ON DELETE CASCADE;


--
-- Name: clients fk_clients_client_group; Type: FK CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr".clients
    ADD CONSTRAINT fk_clients_client_group FOREIGN KEY ("clientGroupID") REFERENCES "zero_0/cvr".instances("clientGroupID") ON DELETE CASCADE;


--
-- Name: desires fk_desires_query; Type: FK CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr".desires
    ADD CONSTRAINT fk_desires_query FOREIGN KEY ("clientGroupID", "queryHash") REFERENCES "zero_0/cvr".queries("clientGroupID", "queryHash") ON DELETE CASCADE;


--
-- Name: queries fk_queries_client_group; Type: FK CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr".queries
    ADD CONSTRAINT fk_queries_client_group FOREIGN KEY ("clientGroupID") REFERENCES "zero_0/cvr".instances("clientGroupID") ON DELETE CASCADE;


--
-- Name: rows fk_rows_client_group; Type: FK CONSTRAINT; Schema: zero_0/cvr; Owner: mattpardini
--

ALTER TABLE ONLY "zero_0/cvr".rows
    ADD CONSTRAINT fk_rows_client_group FOREIGN KEY ("clientGroupID") REFERENCES "zero_0/cvr"."rowsVersion"("clientGroupID") ON DELETE CASCADE;


--
-- Name: _zero_metadata_0; Type: PUBLICATION; Schema: -; Owner: mattpardini
--

CREATE PUBLICATION _zero_metadata_0 WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION _zero_metadata_0 OWNER TO mattpardini;

--
-- Name: _zero_public_0; Type: PUBLICATION; Schema: -; Owner: mattpardini
--

CREATE PUBLICATION _zero_public_0 WITH (publish = 'insert, update, delete, truncate', publish_via_partition_root = true);


ALTER PUBLICATION _zero_public_0 OWNER TO mattpardini;

--
-- Name: _zero_public_0 user; Type: PUBLICATION TABLE; Schema: public; Owner: mattpardini
--

ALTER PUBLICATION _zero_public_0 ADD TABLE ONLY public."user";


--
-- Name: _zero_metadata_0 permissions; Type: PUBLICATION TABLE; Schema: zero; Owner: mattpardini
--

ALTER PUBLICATION _zero_metadata_0 ADD TABLE ONLY zero.permissions;


--
-- Name: _zero_metadata_0 schemaVersions; Type: PUBLICATION TABLE; Schema: zero; Owner: mattpardini
--

ALTER PUBLICATION _zero_metadata_0 ADD TABLE ONLY zero."schemaVersions";


--
-- Name: _zero_metadata_0 clients; Type: PUBLICATION TABLE; Schema: zero_0; Owner: mattpardini
--

ALTER PUBLICATION _zero_metadata_0 ADD TABLE ONLY zero_0.clients;


--
-- Name: _zero_metadata_0 mutations; Type: PUBLICATION TABLE; Schema: zero_0; Owner: mattpardini
--

ALTER PUBLICATION _zero_metadata_0 ADD TABLE ONLY zero_0.mutations;


--
-- Name: _zero_public_0 public; Type: PUBLICATION TABLES IN SCHEMA; Schema: public; Owner: mattpardini
--

ALTER PUBLICATION _zero_public_0 ADD TABLES IN SCHEMA public;


--
-- Name: zero_alter_publication_0; Type: EVENT TRIGGER; Schema: -; Owner: mattpardini
--

CREATE EVENT TRIGGER zero_alter_publication_0 ON ddl_command_end
         WHEN TAG IN ('ALTER PUBLICATION')
   EXECUTE FUNCTION zero_0.emit_alter_publication();


ALTER EVENT TRIGGER zero_alter_publication_0 OWNER TO mattpardini;

--
-- Name: zero_alter_schema_0; Type: EVENT TRIGGER; Schema: -; Owner: mattpardini
--

CREATE EVENT TRIGGER zero_alter_schema_0 ON ddl_command_end
         WHEN TAG IN ('ALTER SCHEMA')
   EXECUTE FUNCTION zero_0.emit_alter_schema();


ALTER EVENT TRIGGER zero_alter_schema_0 OWNER TO mattpardini;

--
-- Name: zero_alter_table_0; Type: EVENT TRIGGER; Schema: -; Owner: mattpardini
--

CREATE EVENT TRIGGER zero_alter_table_0 ON ddl_command_end
         WHEN TAG IN ('ALTER TABLE')
   EXECUTE FUNCTION zero_0.emit_alter_table();


ALTER EVENT TRIGGER zero_alter_table_0 OWNER TO mattpardini;

--
-- Name: zero_create_index_0; Type: EVENT TRIGGER; Schema: -; Owner: mattpardini
--

CREATE EVENT TRIGGER zero_create_index_0 ON ddl_command_end
         WHEN TAG IN ('CREATE INDEX')
   EXECUTE FUNCTION zero_0.emit_create_index();


ALTER EVENT TRIGGER zero_create_index_0 OWNER TO mattpardini;

--
-- Name: zero_create_table_0; Type: EVENT TRIGGER; Schema: -; Owner: mattpardini
--

CREATE EVENT TRIGGER zero_create_table_0 ON ddl_command_end
         WHEN TAG IN ('CREATE TABLE')
   EXECUTE FUNCTION zero_0.emit_create_table();


ALTER EVENT TRIGGER zero_create_table_0 OWNER TO mattpardini;

--
-- Name: zero_ddl_start_0; Type: EVENT TRIGGER; Schema: -; Owner: mattpardini
--

CREATE EVENT TRIGGER zero_ddl_start_0 ON ddl_command_start
         WHEN TAG IN ('CREATE TABLE', 'ALTER TABLE', 'CREATE INDEX', 'DROP TABLE', 'DROP INDEX', 'ALTER PUBLICATION', 'ALTER SCHEMA')
   EXECUTE FUNCTION zero_0.emit_ddl_start();


ALTER EVENT TRIGGER zero_ddl_start_0 OWNER TO mattpardini;

--
-- Name: zero_drop_index_0; Type: EVENT TRIGGER; Schema: -; Owner: mattpardini
--

CREATE EVENT TRIGGER zero_drop_index_0 ON ddl_command_end
         WHEN TAG IN ('DROP INDEX')
   EXECUTE FUNCTION zero_0.emit_drop_index();


ALTER EVENT TRIGGER zero_drop_index_0 OWNER TO mattpardini;

--
-- Name: zero_drop_table_0; Type: EVENT TRIGGER; Schema: -; Owner: mattpardini
--

CREATE EVENT TRIGGER zero_drop_table_0 ON ddl_command_end
         WHEN TAG IN ('DROP TABLE')
   EXECUTE FUNCTION zero_0.emit_drop_table();


ALTER EVENT TRIGGER zero_drop_table_0 OWNER TO mattpardini;

--
-- PostgreSQL database dump complete
--

\unrestrict aXoTfdORbQgE4UohYaQZgxZJktlaF7yfksi51eeZiAnP0yR5nvi3ahDV7FbuXqU

