import { IProcMap, ISerializedProcMap } from "./types";
export declare function customGenerator(sourceCode: string): string;
export declare function getProc(procMap: IProcMap, path: string): (...args: any) => any;
export declare function deserializeProcMap(procMap: ISerializedProcMap): IProcMap;
export declare function parseFunc(str: string): (...args: any[]) => any;
export declare function nameFunc(str: string): string;
export declare function getProcMapScope(procMap: IProcMap, path: string): IProcMap;
