declare let didInit: boolean;
declare let procMap: Record<string, (...args: any[]) => Promise<any>>;
declare function deserializeProcMap(procMap: Record<string, string>): Record<string, (...args: any[]) => Promise<any>>;
