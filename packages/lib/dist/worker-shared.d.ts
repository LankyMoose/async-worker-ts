import { IProcMap, ISerializedProcMap } from "./types";
export declare const AWT_DEBUG_GENERATED_SRC = false;
export declare function createTaskScope(postMessage: (data: any) => void, removeListener: (event: string, handler: any) => void, addListener: (event: string, handler: any) => void): {
    emit: (event: string, data: any) => Promise<unknown>;
};
export declare function getProc(procMap: IProcMap, path: string): (...args: any) => any;
export declare function deserializeProcMap(procMap: ISerializedProcMap): IProcMap;
export declare function parseFunc(str: string): (...args: any[]) => any;
export declare function transformFunc(str: string): string;
export declare function getProcMapScope(procMap: IProcMap, path: string): IProcMap;
