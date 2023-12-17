import assertUnreachable from '../utils/assertUnreachable';
import { WeekDay } from '../utils/timeFrames';
import { DbtManifestVersion } from './dbt';

export enum ProjectType {
    DEFAULT = 'DEFAULT',
    PREVIEW = 'PREVIEW',
}

export enum DbtProjectType {
    DBT = 'dbt',
    DBT_CLOUD_IDE = 'dbt_cloud_ide',
    GITHUB = 'github',
    GITLAB = 'gitlab',
    BITBUCKET = 'bitbucket',
    AZURE_DEVOPS = 'azure_devops',
    NONE = 'none',
}

export enum WarehouseTypes {
    BIGQUERY = 'bigquery',
    CLICKHOUSE = 'clickhouse',
    POSTGRES = 'postgres',
    REDSHIFT = 'redshift',
    SNOWFLAKE = 'snowflake',
    DATABRICKS = 'databricks',
    TRINO = 'trino',
}

export type SshTunnelConfiguration = {
    useSshTunnel?: boolean;
    sshTunnelHost?: string;
    sshTunnelPort?: number;
    sshTunnelUser?: string;
    sshTunnelPublicKey?: string;
    sshTunnelPrivateKey?: string;
};

export type CreateBigqueryCredentials = {
    type: WarehouseTypes.BIGQUERY;
    project: string;
    dataset: string;
    threads?: number;
    timeoutSeconds: number | undefined;
    priority: 'interactive' | 'batch' | undefined;
    keyfileContents: Record<string, string>;
    retries: number | undefined;
    location: string | undefined;
    maximumBytesBilled: number | undefined;
    startOfWeek?: WeekDay | null;
};
export const sensitiveCredentialsFieldNames = [
    'user',
    'password',
    'keyfileContents',
    'personalAccessToken',
    'privateKey',
    'privateKeyPass',
    'sshTunnelPrivateKey',
] as const;
export type SensitiveCredentialsFieldNames =
    typeof sensitiveCredentialsFieldNames[number];
export type BigqueryCredentials = Omit<
    CreateBigqueryCredentials,
    SensitiveCredentialsFieldNames
>;
export type CreateDatabricksCredentials = {
    type: WarehouseTypes.DATABRICKS;
    catalog?: string;
    // this supposed to be a `schema` but changing it will break for existing customers
    database: string;
    serverHostName: string;
    httpPath: string;
    personalAccessToken: string;
    startOfWeek?: WeekDay | null;
};
export type DatabricksCredentials = Omit<
    CreateDatabricksCredentials,
    SensitiveCredentialsFieldNames
>;
export type CreatePostgresCredentials = SshTunnelConfiguration & {
    type: WarehouseTypes.POSTGRES;
    host: string;
    user: string;
    password: string;
    port: number;
    dbname: string;
    schema: string;
    threads?: number;
    keepalivesIdle?: number;
    searchPath?: string;
    role?: string;
    sslmode?: string;
    startOfWeek?: WeekDay | null;
};
export type PostgresCredentials = Omit<
    CreatePostgresCredentials,
    SensitiveCredentialsFieldNames
>;
export type CreateClickHouseCredentials = SshTunnelConfiguration & {
    type: WarehouseTypes.CLICKHOUSE;
    host: string;
    user: string;
    password: string;
    port: number;
    database: string;
    threads?: number;
    startOfWeek?: WeekDay | null;
};
export type ClickHouseCredentials = Omit<
    CreateClickHouseCredentials,
    SensitiveCredentialsFieldNames
>;
export type CreateTrinoCredentials = {
    type: WarehouseTypes.TRINO;
    host: string;
    user: string;
    password: string;
    port: number;
    dbname: string;
    schema: string;
    http_scheme: string;
    startOfWeek?: WeekDay | null;
};
export type TrinoCredentials = Omit<
    CreateTrinoCredentials,
    SensitiveCredentialsFieldNames
>;
export type CreateRedshiftCredentials = SshTunnelConfiguration & {
    type: WarehouseTypes.REDSHIFT;
    host: string;
    user: string;
    password: string;
    port: number;
    dbname: string;
    schema: string;
    threads?: number;
    keepalivesIdle?: number;
    sslmode?: string;
    ra3Node?: boolean;
    startOfWeek?: WeekDay | null;
};
export type RedshiftCredentials = Omit<
    CreateRedshiftCredentials,
    SensitiveCredentialsFieldNames
>;
export type CreateSnowflakeCredentials = {
    type: WarehouseTypes.SNOWFLAKE;
    account: string;
    user: string;
    password?: string;
    privateKey?: string;
    privateKeyPass?: string;
    role?: string;
    database: string;
    warehouse: string;
    schema: string;
    threads?: number;
    clientSessionKeepAlive?: boolean;
    queryTag?: string;
    accessUrl?: string;
    startOfWeek?: WeekDay | null;
};
export type SnowflakeCredentials = Omit<
    CreateSnowflakeCredentials,
    SensitiveCredentialsFieldNames
>;
export type CreateWarehouseCredentials =
    | CreateRedshiftCredentials
    | CreateBigqueryCredentials
    | CreateClickHouseCredentials
    | CreatePostgresCredentials
    | CreateSnowflakeCredentials
    | CreateDatabricksCredentials
    | CreateTrinoCredentials;
export type WarehouseCredentials =
    | SnowflakeCredentials
    | RedshiftCredentials
    | ClickHouseCredentials
    | PostgresCredentials
    | BigqueryCredentials
    | DatabricksCredentials
    | TrinoCredentials;

export type CreatePostgresLikeCredentials =
    | CreateRedshiftCredentials
    | CreatePostgresCredentials;

export interface DbtProjectConfigBase {
    type: DbtProjectType;
}

export type DbtProjectEnvironmentVariable = {
    key: string;
    value: string;
};

export enum SupportedDbtVersions {
    V1_4 = 'v1.4',
    V1_5 = 'v1.5',
    V1_6 = 'v1.6',
}

export const GetDbtManifestVersion = (
    dbtVersion: SupportedDbtVersions,
): DbtManifestVersion => {
    switch (dbtVersion) {
        case SupportedDbtVersions.V1_4:
            return DbtManifestVersion.V8;
        case SupportedDbtVersions.V1_5:
            return DbtManifestVersion.V9;
        case SupportedDbtVersions.V1_6:
            return DbtManifestVersion.V10;
        default:
            assertUnreachable(
                dbtVersion,
                'Missing dbt version manifest mapping',
            );
    }
    return DbtManifestVersion.V8;
};

export const DefaultSupportedDbtVersion = SupportedDbtVersions.V1_4;

export interface DbtProjectCompilerBase extends DbtProjectConfigBase {
    target?: string;
    environment?: DbtProjectEnvironmentVariable[];
}

export interface DbtNoneProjectConfig extends DbtProjectCompilerBase {
    type: DbtProjectType.NONE;

    hideRefreshButton?: boolean;
}

export interface DbtLocalProjectConfig extends DbtProjectCompilerBase {
    type: DbtProjectType.DBT;
    profiles_dir?: string;
    project_dir?: string;
}

export interface DbtCloudIDEProjectConfig extends DbtProjectConfigBase {
    type: DbtProjectType.DBT_CLOUD_IDE;
    api_key: string;
    account_id: string | number;
    environment_id: string | number;
    project_id: string | number;
}

export interface DbtGithubProjectConfig extends DbtProjectCompilerBase {
    type: DbtProjectType.GITHUB;
    personal_access_token: string;
    repository: string;
    branch: string;
    project_sub_path: string;
    host_domain?: string;
}

export interface DbtGitlabProjectConfig extends DbtProjectCompilerBase {
    type: DbtProjectType.GITLAB;
    personal_access_token: string;
    repository: string;
    branch: string;
    project_sub_path: string;
    host_domain?: string;
}

export interface DbtBitBucketProjectConfig extends DbtProjectCompilerBase {
    type: DbtProjectType.BITBUCKET;
    username: string;
    personal_access_token: string;
    repository: string;
    branch: string;
    project_sub_path: string;
    host_domain?: string;
}

export interface DbtAzureDevOpsProjectConfig extends DbtProjectCompilerBase {
    type: DbtProjectType.AZURE_DEVOPS;
    personal_access_token: string;
    organization: string;
    project: string;
    repository: string;
    branch: string;
    project_sub_path: string;
}

export type DbtProjectConfig =
    | DbtLocalProjectConfig
    | DbtCloudIDEProjectConfig
    | DbtGithubProjectConfig
    | DbtBitBucketProjectConfig
    | DbtGitlabProjectConfig
    | DbtAzureDevOpsProjectConfig
    | DbtNoneProjectConfig;
export type Project = {
    organizationUuid: string;
    projectUuid: string;
    name: string;
    type: ProjectType;
    dbtConnection: DbtProjectConfig;
    warehouseConnection?: WarehouseCredentials;
    pinnedListUuid?: string;
    copiedFromProjectUuid?: string;
    dbtVersion: SupportedDbtVersions;
};

export type ProjectSummary = Pick<
    Project,
    'name' | 'projectUuid' | 'organizationUuid'
>;

export type ApiProjectResponse = {
    status: 'ok';
    results: Project;
};

export type IdContentMapping = {
    id: number | string;
    newId: number | string;
};
export type PreviewContentMapping = {
    charts: IdContentMapping[];
    chartVersions: IdContentMapping[];
    spaces: IdContentMapping[];
    dashboards: IdContentMapping[];
    dashboardVersions: IdContentMapping[];
};
