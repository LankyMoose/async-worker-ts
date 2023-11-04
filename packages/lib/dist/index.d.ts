import { IProcMap, UseWorkerResult } from "./types.js";
export default function useWorker<const T extends IProcMap>(procMap: T): UseWorkerResult<T>;
