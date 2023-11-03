import { ProcMap } from "./types.js";
export default function useWorker<const T extends ProcMap>(procMap: T): { [K in keyof T]: T[K]; };
