import { SVEAccount } from 'svebase/dist/SVEAccount';


export interface TokenInfo {
    user: SVEAccount;
    created: Date;
}

export interface StorageIntegrity {
    persistent: boolean;
    volatile: boolean;
}

export interface Status {
    status: boolean;
    version: string;
    storage_integrity: StorageIntegrity;
    authorization_host: string;
}

export interface StatusProvider {
    status: () => boolean;
    version: () => string;
    storage_integrity: () => StorageIntegrity;
    authorization_host: () => string;
}

export class ServiceInfo {
    public static SESSION_STORAGE: Map<string, TokenInfo> = new Map<string, TokenInfo>();
    public static auth_api_host: string = (process.env.AUTH_API_HOST) ? process.env.AUTH_API : "authentication.localhost";
    public static status_provider: StatusProvider | undefined;
    public static get_status(): Status {
        if (ServiceInfo.status_provider !== undefined) {
            return {
                status: ServiceInfo.status_provider.status(),
                version: ServiceInfo.status_provider.version(),
                storage_integrity: ServiceInfo.status_provider.storage_integrity(),
                authorization_host: ServiceInfo.status_provider.authorization_host()
            }
        } else {
            return {
                status: false,
                authorization_host: "Unknown",
                storage_integrity: {
                    persistent: false,
                    volatile: false
                },
                version: "Unknown"
            }
        }
    }
}