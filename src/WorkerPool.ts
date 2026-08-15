
/**
 * Runs a single request/response exchange against a worker and resolves
 * with the payload the worker sends back via `postMessage`.
 *
 * Rejects if the worker throws (`onerror`) or if the returned message can't
 * be deserialized (`onmessageerror`), so a broken worker never hangs the
 * caller forever.
 */
export function runOnWorker(worker: Worker, message: unknown, transfer?: Transferable[]): Promise<unknown>{
	return new Promise((resolve, reject) => {
		worker.onmessage = (e: MessageEvent) => {
			resolve(e.data);
		};
		worker.onerror = (e: unknown) => {
			reject(e);
		};
		worker.onmessageerror = (e: unknown) => {
			reject(e);
		};

		if (transfer){
			worker.postMessage(message, transfer);
		}else{
			worker.postMessage(message);
		}
	});
}

export class WorkerPool{

	workers: Record<string, Worker[]> = {};
	maxPerUrl = 8;
	createWorker: (url: string) => Worker;

	constructor(createWorker?: (url: string) => Worker){
		this.createWorker = createWorker ?? ((url: string) => new Worker(url));
	}

	getWorker(url: string): Worker{
		if (!this.workers[url]){
			this.workers[url] = [];
		}

		if (this.workers[url].length === 0){
			let worker = this.createWorker(url);
			this.workers[url].push(worker);
		}

		let worker = this.workers[url].pop() as Worker;

		return worker;
	}

	returnWorker(url: string, worker: Worker): void{
		if (!this.workers[url]){
			this.workers[url] = [];
		}

		if (this.workers[url].length >= this.maxPerUrl){
			worker.terminate();
			return;
		}

		this.workers[url].push(worker);
	}

	/**
	 * Borrows a worker from the pool, runs `message` on it and returns it to
	 * the pool once it replies successfully. If the worker errors, it is
	 * terminated and dropped instead of being re-pooled, since it may be
	 * left in a broken state.
	 */
	async runWorker(url: string, message: unknown, transfer?: Transferable[]): Promise<unknown>{
		const worker = this.getWorker(url);

		try{
			const data = await runOnWorker(worker, message, transfer);
			this.returnWorker(url, worker);
			return data;
		}catch(e){
			worker.terminate();
			throw e;
		}
	}

	/**
	 * Terminates every pooled worker and empties the pool. Intended for
	 * teardown (e.g. tests, hot-reload) rather than normal operation.
	 */
	dispose(): void{
		for (const url of Object.keys(this.workers)){
			for (const worker of this.workers[url]){
				worker.terminate();
			}
		}
		this.workers = {};
	}

};

//Potree.workerPool = new Potree.WorkerPool();
