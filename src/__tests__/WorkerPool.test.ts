import { describe, it, expect, vi } from "vitest";

import { WorkerPool, runOnWorker } from "../WorkerPool";

class FakeWorker {
	onmessage: ((e: { data: unknown }) => void) | null = null;
	onerror: ((e: unknown) => void) | null = null;
	onmessageerror: ((e: unknown) => void) | null = null;
	terminated = false;
	posted: unknown[] = [];

	constructor(public mode: "ok" | "error" | "msgerror" = "ok") {}

	postMessage(msg: unknown) {
		this.posted.push(msg);
		queueMicrotask(() => {
			if (this.mode === "ok") this.onmessage?.({ data: { echo: msg } });
			else if (this.mode === "error") this.onerror?.(new Error("boom"));
			else this.onmessageerror?.(new Error("bad message"));
		});
	}

	terminate() {
		this.terminated = true;
	}
}

describe("runOnWorker", () => {
	it("resolves with event.data when the worker replies via onmessage", async () => {
		const worker = new FakeWorker("ok");
		const result = await runOnWorker(worker as unknown as Worker, { hello: "world" });
		expect(result).toEqual({ echo: { hello: "world" } });
		expect(worker.posted).toEqual([{ hello: "world" }]);
	});

	it("rejects when the worker fires onerror", async () => {
		const worker = new FakeWorker("error");
		await expect(runOnWorker(worker as unknown as Worker, { hello: "world" })).rejects.toBeTruthy();
	});

	it("rejects when the worker fires onmessageerror", async () => {
		const worker = new FakeWorker("msgerror");
		await expect(runOnWorker(worker as unknown as Worker, { hello: "world" })).rejects.toBeTruthy();
	});
});

describe("WorkerPool.runWorker", () => {
	it("returns a healthy worker to the pool for reuse (only 1 worker created across 2 calls)", async () => {
		let created = 0;
		const createWorker = vi.fn((_url: string) => {
			created++;
			return new FakeWorker("ok") as unknown as Worker;
		});
		const pool = new WorkerPool(createWorker);

		await pool.runWorker("some-url", { a: 1 });
		await pool.runWorker("some-url", { a: 2 });

		expect(created).toBe(1);
		expect(createWorker).toHaveBeenCalledTimes(1);
	});

	it("terminates (and does not re-pool) a worker whose run rejected, and propagates the rejection", async () => {
		const failing = new FakeWorker("error");
		const createWorker = vi.fn((_url: string) => failing as unknown as Worker);
		const pool = new WorkerPool(createWorker);

		await expect(pool.runWorker("bad-url", { a: 1 })).rejects.toBeTruthy();

		expect(failing.terminated).toBe(true);

		// A follow-up call must create a brand-new worker since the failing one
		// was dropped rather than returned to the pool.
		const healthy = new FakeWorker("ok");
		createWorker.mockReturnValueOnce(healthy as unknown as Worker);
		await pool.runWorker("bad-url", { a: 2 });
		expect(createWorker).toHaveBeenCalledTimes(2);
	});

	it("terminates the excess worker instead of pooling it once maxPerUrl is reached", () => {
		const created: FakeWorker[] = [];
		const createWorker = vi.fn((_url: string) => {
			const w = new FakeWorker("ok");
			created.push(w);
			return w as unknown as Worker;
		});
		const pool = new WorkerPool(createWorker);
		pool.maxPerUrl = 2;

		const w1 = pool.getWorker("url") as unknown as FakeWorker;
		const w2 = pool.getWorker("url") as unknown as FakeWorker;
		const w3 = pool.getWorker("url") as unknown as FakeWorker;

		pool.returnWorker("url", w1 as unknown as Worker);
		pool.returnWorker("url", w2 as unknown as Worker);
		// pool is now at maxPerUrl (2); this third return should terminate w3.
		pool.returnWorker("url", w3 as unknown as Worker);

		expect(w3.terminated).toBe(true);
		expect(w1.terminated).toBe(false);
		expect(w2.terminated).toBe(false);
	});

	it("dispose() terminates all pooled workers", () => {
		const created: FakeWorker[] = [];
		const createWorker = vi.fn((_url: string) => {
			const w = new FakeWorker("ok");
			created.push(w);
			return w as unknown as Worker;
		});
		const pool = new WorkerPool(createWorker);

		const a = pool.getWorker("url-a") as unknown as FakeWorker;
		const b = pool.getWorker("url-b") as unknown as FakeWorker;
		pool.returnWorker("url-a", a as unknown as Worker);
		pool.returnWorker("url-b", b as unknown as Worker);

		pool.dispose();

		expect(a.terminated).toBe(true);
		expect(b.terminated).toBe(true);

		// dispose must also CLEAR the pool, not just terminate workers:
		// a subsequent getWorker must create a fresh instance rather than
		// hand back a terminated one still sitting in the map.
		const createdBefore = created.length;
		pool.getWorker("url-a");
		expect(created.length).toBe(createdBefore + 1);
	});

	it.todo("runWorker surfaces a slow worker via a timeout");
	it.todo("concurrent getWorker on the same url returns distinct workers");
	it.todo("runOnWorker propagates the transfer list through to postMessage");
});
