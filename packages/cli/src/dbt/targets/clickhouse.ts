import {
    CreateClickHouseCredentials,
    ParseError,
    WarehouseTypes,
} from '@lightdash/common';
import { JSONSchemaType } from 'ajv';
import betterAjvErrors from 'better-ajv-errors';
import { ajv } from '../../ajv';
import { Target } from '../types';

export type ClickHouseTarget = {
    type: 'clickhouse';
    host: string;
    user: string;
    port: number;
    schema: string;
    threads: number;
    password: string;
};

export const clickhouseSchema: JSONSchemaType<ClickHouseTarget> = {
    type: 'object',
    properties: {
        type: {
            type: 'string',
            enum: ['clickhouse'],
        },
        host: {
            type: 'string',
        },
        user: {
            type: 'string',
        },
        port: {
            type: 'integer',
        },
        schema: {
            type: 'string',
        },
        threads: {
            type: 'integer',
            nullable: true,
        },
        password: {
            type: 'string',
        },
    },
    required: ['type', 'host', 'user', 'port', 'schema', 'password'],
};

export const convertClickHouseSchema = (
    target: Target,
): CreateClickHouseCredentials => {
    const validate = ajv.compile<ClickHouseTarget>(clickhouseSchema);
    if (validate(target)) {
        const { password } = target;
        if (!password) {
            throw new ParseError(
                `ClickHouse target requires a password: "password"`,
            );
        }
        return {
            type: WarehouseTypes.CLICKHOUSE,
            host: target.host,
            username: target.user,
            password,
            port: target.port,
            database: target.schema,
        };
    }
    const errs = betterAjvErrors(
        clickhouseSchema,
        target,
        validate.errors || [],
    );
    throw new ParseError(
        `Couldn't read profiles.yml file for ${target.type}:\n${errs}`,
    );
};
