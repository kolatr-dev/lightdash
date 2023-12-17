import {
    CreateClickHouseCredentials,
    DimensionType,
    isWeekDay,
    Metric,
    MetricType,
    ParseError,
    SupportedDbtAdapter,
    WarehouseConnectionError,
    WarehouseQueryError,
} from '@lightdash/common';
import * as crypto from 'crypto';
// import { Connection, ConnectionOptions, createConnection } from 'snowflake-sdk';
import { ClickHouseClient, createClient } from '@clickhouse/client'; // or '@clickhouse/client-web'
import { pipeline, Stream, Transform, Writable } from 'stream';
import * as Util from 'util';
import { WarehouseCatalog } from '../types';
import WarehouseBaseClient from './WarehouseBaseClient';

export enum ClickHouseTypes {
    INT8 = 'Int8',
    INT16 = 'Int16',
    INT32 = 'Int32',
    INT64 = 'Int64',
    INT128 = 'Int128',
    INT256 = 'Int256',
    UINT8 = 'UInt8',
    UINT16 = 'UInt16',
    UINT32 = 'UInt32',
    UINT64 = 'UInt64',
    UINT128 = 'UInt128',
    UINT256 = 'UInt256',
    FLOAT32 = 'Float32',
    FLOAT64 = 'Float64',
    DECIMAL = 'Decimal',
    BOOLEAN = 'Boolean',
    STRING = 'String',
    FIXED_STRING = 'FixedString',
    DATE = 'Date',
    DATE32 = 'Date32',
    DATETIME = 'DateTime',
    DATETIME64 = 'DateTime64',
    JSON = 'Json',
}

const normaliseClickHouseType = (type: string): string => {
    const r = /^[A-Z]+/;
    const match = r.exec(type);
    if (match === null) {
        throw new ParseError(
            `Cannot understand type from ClickHouse: ${type}`,
            {},
        );
    }
    return match[0];
};

export const mapFieldType = (type: string): DimensionType => {
    const denulledType = type.replace('Nullable(', '').replace(')', '');
    if (denulledType.startsWith(ClickHouseTypes.DECIMAL)) {
        return DimensionType.NUMBER;
    }
    switch (normaliseClickHouseType(denulledType)) {
        case ClickHouseTypes.INT8:
        case ClickHouseTypes.INT16:
        case ClickHouseTypes.INT32:
        case ClickHouseTypes.INT64:
        case ClickHouseTypes.INT128:
        case ClickHouseTypes.INT256:
        case ClickHouseTypes.UINT8:
        case ClickHouseTypes.UINT16:
        case ClickHouseTypes.UINT32:
        case ClickHouseTypes.UINT64:
        case ClickHouseTypes.UINT128:
        case ClickHouseTypes.UINT256:
        case ClickHouseTypes.FLOAT32:
        case ClickHouseTypes.FLOAT64:
            return DimensionType.NUMBER;
        case ClickHouseTypes.DATE:
        case ClickHouseTypes.DATE32:
            return DimensionType.DATE;
        case ClickHouseTypes.DATETIME:
        case ClickHouseTypes.DATETIME64:
            return DimensionType.TIMESTAMP;
        case ClickHouseTypes.BOOLEAN:
            return DimensionType.BOOLEAN;
        default:
            return DimensionType.STRING;
    }
};

const parseCell = (cell: any) => {
    if (cell instanceof Date) {
        return new Date(cell);
    }

    return cell;
};

const parseRow = (row: Record<string, any>) =>
    Object.fromEntries(
        Object.entries(row).map(([name, value]) => [name, parseCell(value)]),
    );
const parseRows = (rows: Record<string, any>[]) => rows.map(parseRow);

export class ClickHouseWarehouseClient extends WarehouseBaseClient<CreateClickHouseCredentials> {
    connectionOptions: any;

    constructor(credentials: CreateClickHouseCredentials) {
        super(credentials);

        this.connectionOptions = {
            ...credentials,
            host: `http://${credentials.host}:${credentials.port}`,
            // @ts-ignore
            username: credentials.user,
        };
    }

    async runQuery(query: string, tags?: Record<string, string>) {
        let client: ClickHouseClient;
        try {
            client = createClient(this.connectionOptions);
            await client.ping();
        } catch (e) {
            throw new WarehouseConnectionError(
                `ClickHouse error: ${e.message}`,
            );
        }
        try {
            // if (isWeekDay(this.startOfWeek)) {
            //     const snowflakeStartOfWeekIndex = this.startOfWeek + 1; // 1 (Monday) to 7 (Sunday):
            //     await this.executeStatement(
            //         client,
            //         `ALTER SESSION SET WEEK_START = ${snowflakeStartOfWeekIndex};`,
            //     );
            // }
            // if (tags) {
            //     await this.executeStatement(
            //         client,
            //         `ALTER SESSION SET QUERY_TAG = '${JSON.stringify(tags)}';`,
            //     );
            // }
            // await this.executeStatement(
            //     client,
            //     "ALTER SESSION SET TIMEZONE = 'UTC'",
            // );
            const result = await this.executeStatement(
                client,
                this.getSQLWithMetadata(query, tags),
            );
            return result;
        } catch (e) {
            throw new WarehouseQueryError(e.message);
        } finally {
            await client.close();
        }
    }

    private getSQLWithMetadata(sql: string, tags?: Record<string, string>) {
        let alteredQuery = sql;
        if (tags) {
            alteredQuery = `${alteredQuery}\n-- ${JSON.stringify(tags)}`;
        }
        return alteredQuery;
    }

    // private async executeStreamStatement(
    //     client: ClickHouseClient,
    //     query: string,
    // ) {
    //     return new Promise<{
    //         fields: Record<string, { type: DimensionType }>;
    //         rows: any[];
    //     }>((resolve, reject) => {
    //         client.query({
    //             query,
    //             streamResult: true,
    //             complete: (err, stmt) => {
    //                 if (err) {
    //                     reject(new WarehouseQueryError(err.message));
    //                 }
    //                 const rows: any[] = [];

    //                 pipeline(
    //                     stmt.streamRows(),
    //                     new Transform({
    //                         objectMode: true,
    //                         transform(chunk, encoding, callback) {
    //                             callback(null, parseRow(chunk));
    //                         },
    //                     }),
    //                     new Writable({
    //                         objectMode: true,
    //                         write(chunk, encoding, callback) {
    //                             rows.push(chunk);
    //                             callback();
    //                         },
    //                     }),
    //                     (error) => {
    //                         if (error) {
    //                             reject(new WarehouseQueryError(error.message));
    //                         } else {
    //                             const columns = stmt.getColumns();
    //                             const fields = columns
    //                                 ? columns.reduce(
    //                                       (acc, column) => ({
    //                                           ...acc,
    //                                           [column.getName()]: {
    //                                               type: mapFieldType(
    //                                                   column
    //                                                       .getType()
    //                                                       .toUpperCase(),
    //                                               ),
    //                                           },
    //                                       }),
    //                                       {},
    //                                   )
    //                                 : {};

    //                             resolve({ fields, rows });
    //                         }
    //                     },
    //                 );
    //             },
    //         });
    //     });
    // }

    // eslint-disable-next-line class-methods-use-this
    private async executeStatement(
        connection: ClickHouseClient,
        query: string,
    ) {
        // return new Promise<{
        //     fields: Record<string, { type: DimensionType }>;
        //     rows: any[];
        // }>(async (resolve, reject) => {
        try {
            console.log('executeStatement', query);
            const results = await connection.query({
                query,
                format: 'JSONCompactEachRowWithNamesAndTypes',
            });
            const data: any[][] = await results.json();
            console.log('executeStatement', data.slice(0, 5));

            const fields = data[0].reduce(
                (acc, name, i) => ({
                    ...acc,
                    [name]: {
                        type: mapFieldType(data[1][i]),
                    },
                }),
                {},
            );
            // return { fields, rows: parseRows(data) };
            console.log('executeStatement', fields, data.slice(2, 5));
            return {
                fields,
                rows: data
                    .slice(2)
                    .map((row) =>
                        data[0].reduce(
                            (acc, key, i) => ({ ...acc, [key]: row[i] }),
                            {},
                        ),
                    ),
            };
        } catch (e) {
            throw new WarehouseQueryError(e.message);
        }
        // });
    }

    private async runTableCatalogQuery(
        database: string,
        schema: string,
        table: string,
    ) {
        let client: ClickHouseClient;
        const query = `SHOW COLUMNS IN TABLE ${table}`;
        try {
            client = createClient({
                ...this.connectionOptions,
                schema,
                database,
            });
            await client.ping();
        } catch (e) {
            throw new WarehouseConnectionError(
                `ClickHouse error: ${e.message}`,
            );
        }
        try {
            return await this.executeStatement(client, query);
        } catch (e) {
            // Ignore error and let UI show invalid table
            return undefined;
        } finally {
            await client.close();
        }
    }

    async getCatalog(
        config: {
            database: string;
            schema: string;
            table: string;
        }[],
    ) {
        const databaseTables = config.reduce<{ [database: string]: string[] }>(
            (acc, { database, table }) => {
                if (!acc[database]) {
                    acc[database] = [];
                }
                acc[database].push(table);
                return acc;
            },
            {},
        );
        const whereClause = Object.entries(databaseTables)
            .map(([database, tables]) =>
                tables
                    .map(
                        (table) =>
                            `(database = '${database}' AND table = '${table}')`,
                    )
                    .join(' OR '),
            )
            .join(' OR ');

        const query = `
            SELECT database, table, name, type FROM system.columns
            WHERE ${whereClause}
            ORDER BY position
        `;
        let client: ClickHouseClient;
        try {
            client = createClient(this.connectionOptions);
            await client.ping();
        } catch (e) {
            throw new WarehouseConnectionError(
                `ClickHouse error: ${e.message}`,
            );
        }
        const results = await client.query({
            query,
            format: 'JSONCompactEachRow',
        });
        const data: [string, string, string, string][] = await results.json();
        return data.reduce<WarehouseCatalog>(
            (accum, [database, table, name, type]) => {
                if (!accum[database]) {
                    // eslint-disable-next-line no-param-reassign
                    accum[database] = {
                        '': {},
                    };
                }
                if (!accum[database][''][table]) {
                    // eslint-disable-next-line no-param-reassign
                    accum[database][''][table] = {};
                }
                // eslint-disable-next-line no-param-reassign
                accum[database][''][table][name] = mapFieldType(type);
                return accum;
            },
            {} as WarehouseCatalog,
        );
    }

    getFieldQuoteChar() {
        return '"';
    }

    getStringQuoteChar() {
        return "'";
    }

    getEscapeStringQuoteChar() {
        return '\\';
    }

    getAdapterType(): SupportedDbtAdapter {
        return SupportedDbtAdapter.SNOWFLAKE;
    }

    getMetricSql(sql: string, metric: Metric) {
        switch (metric.type) {
            case MetricType.PERCENTILE:
                return `PERCENTILE_CONT(${
                    (metric.percentile ?? 50) / 100
                }) WITHIN GROUP (ORDER BY ${sql})`;
            case MetricType.MEDIAN:
                return `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${sql})`;
            default:
                return super.getMetricSql(sql, metric);
        }
    }
}
