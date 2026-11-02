/**
 * PYTHON CONCURRENT.FUTURES COMPREHENSIVE ENGINE & BENCHMARK SUITE
 * 
 * Authored based on the architectural guide by Mauro Lomibao Dar III (2016-2026)
 * Demonstrates:
 * 1. ThreadPoolExecutor (I/O-bound simulation) vs ProcessPoolExecutor (CPU-bound)
 * 2. Future state machine (PENDING, RUNNING, FINISHED, CANCELLED)
 * 3. submit() vs map() with chunksize
 * 4. as_completed(fs) streaming iteration
 * 5. wait(fs, return_when=FIRST_COMPLETED | ALL_COMPLETED)
 * 6. add_done_callback()
 * 7. Exception handling & TimeoutError simulation
 * 8. Task cancellation before execution
 */

export interface SimulatedTask {
  id: string;
  name: string;
  type: "io" | "cpu";
  target: string;
  durationMs: number;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  workerId?: number;
  startTime?: number;
  endTime?: number;
  result?: string;
  error?: string;
  callbackFired?: boolean;
}

export interface ConcurrencyRunResult {
  executorType: "ThreadPoolExecutor" | "ProcessPoolExecutor";
  maxWorkers: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  executionTimeSec: number;
  sequentialTimeSec: number;
  speedupFactor: number;
  tasks: SimulatedTask[];
  logs: string[];
}

export const PYTHON_CONCURRENT_FUTURES_CODE_EXAMPLES = {
  thread_pool_basic: `# ThreadPoolExecutor for I/O-bound tasks (Network / RPC calls)
from concurrent.futures import ThreadPoolExecutor
import time

def fetch_url(url):
    """Simulate fetching an EVM block or external API."""
    time.sleep(1)  # Simulate network latency
    return f"Response payload from {url}"

urls = [
    "https://eth-mainnet.g.alchemy.com/v2/...",
    "https://relay.flashbots.net/v1/status",
    "https://api.etherscan.io/api?module=proxy",
]

# Sequential - takes ~3 seconds
start = time.time()
results = [fetch_url(url) for url in urls]
print(f"Sequential: {time.time() - start:.2f}s")

# Concurrent - takes ~1 second
start = time.time()
with ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(fetch_url, urls))
print(f"Concurrent with ThreadPoolExecutor: {time.time() - start:.2f}s")`,

  process_pool_cpu: `# ProcessPoolExecutor for CPU-bound computations (Bypasses Python GIL)
from concurrent.futures import ProcessPoolExecutor
import time
import hashlib

def mine_keccak_hash(nonce_range):
    """CPU-intensive hash search across multiple CPU cores."""
    valid_hashes = 0
    for n in range(nonce_range):
        digest = hashlib.sha256(f"DAR_TREE3_{n}".encode()).hexdigest()
        if digest.startswith("000"):
            valid_hashes += 1
    return valid_hashes

if __name__ == "__main__":
    ranges = [500000] * 4

    # Sequential single core execution
    start = time.time()
    results = [mine_keccak_hash(r) for r in ranges]
    print(f"Sequential Single Core: {time.time() - start:.2f}s")

    # True multi-core parallel execution
    start = time.time()
    with ProcessPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(mine_keccak_hash, ranges))
    print(f"Parallel ProcessPoolExecutor: {time.time() - start:.2f}s")`,

  as_completed_streaming: `# as_completed() yields futures as they finish in real time
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import random

def fetch_node_state(rpc_endpoint):
    delay = random.uniform(0.3, 1.8)
    time.sleep(delay)
    return f"State from {rpc_endpoint} (latency: {delay:.2f}s)"

nodes = ["Node-US-West", "Node-EU-Central", "Node-AP-East", "Node-SA-East"]

with ThreadPoolExecutor(max_workers=4) as executor:
    future_to_node = {executor.submit(fetch_node_state, node): node for node in nodes}

    for future in as_completed(future_to_node):
        node = future_to_node[future]
        try:
            data = future.result()
            print(f"[STREAMED RESULT] {node} -> {data}")
        except Exception as e:
            print(f"[ERROR] {node} raised exception: {e}")`,

  wait_first_completed: `# Redundant Fallback using wait(return_when=FIRST_COMPLETED)
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED, ALL_COMPLETED
import time

def query_relay(relay_name, latency):
    time.sleep(latency)
    return f"Fastest response from {relay_name}"

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [
        executor.submit(query_relay, "Titan Relay", 1.8),
        executor.submit(query_relay, "Flashbots Relay", 0.5), # Fastest
        executor.submit(query_relay, "BeaverBuild Relay", 1.2),
    ]

    # Return immediately when the fastest relay answers
    done, not_done = wait(futures, return_when=FIRST_COMPLETED)
    winner = done.pop()
    print(f"Winner: {winner.result()}")
    print(f"Remaining active tasks: {len(not_done)}")

    # Cancel or drain remaining tasks
    for f in not_done:
        f.cancel()`,

  done_callback: `# add_done_callback() for asynchronous non-blocking event handling
from concurrent.futures import ThreadPoolExecutor
import time

def calculate_yield(protocol, tvl):
    time.sleep(1)
    return f"{protocol}: APY = 14.8% on TVL \${tvl:,.2f}"

def on_yield_computed(future):
    """Callback fired on worker thread upon task resolution."""
    try:
        print(f"[CALLBACK FIRED] Computed: {future.result()}")
    except Exception as err:
        print(f"[CALLBACK ERROR] {err}")

with ThreadPoolExecutor(max_workers=2) as executor:
    fut = executor.submit(calculate_yield, "Uniswap v3 DAR/USDC", 25000000)
    fut.add_done_callback(on_yield_computed)
    print("Main thread continues immediately without blocking...")
    time.sleep(1.5)`,

  timeouts_and_exceptions: `# Handling Exceptions and Timeouts
from concurrent.futures import ThreadPoolExecutor, TimeoutError, as_completed
import time

def unpredictable_service(job_id):
    if job_id == 2:
        raise ValueError("Invalid gas signature on job #2")
    if job_id == 3:
        time.sleep(4) # Will trigger timeout
    else:
        time.sleep(0.5)
    return f"Job {job_id} Success"

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = {executor.submit(unpredictable_service, i): i for i in [1, 2, 3]}

    for fut in as_completed(futures):
        idx = futures[fut]
        try:
            res = fut.result(timeout=1.5)
            print(f"Result for {idx}: {res}")
        except TimeoutError:
            print(f"Task {idx} TIMED OUT after 1.5s!")
        except Exception as exc:
            print(f"Task {idx} RAISED EXCEPTION: {exc}")`,

  parallel_downloads_realworld: `# Production Multi-Relay Bundle Downloader with Progress Tracking
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import time

def fetch_relay_metrics(relay_url, timeout=5):
    """Download relay telemetry concurrently."""
    try:
        with urllib.request.urlopen(relay_url, timeout=timeout) as resp:
            content = resp.read()
            return relay_url, len(content), None
    except Exception as err:
        return relay_url, 0, str(err)

relays = [
    "https://relay.flashbots.net",
    "https://titanrelay.xyz",
    "https://builder0x69.io",
    "https://beaverbuild.org",
]

start = time.time()
with ThreadPoolExecutor(max_workers=4) as executor:
    future_to_url = {executor.submit(fetch_relay_metrics, url): url for url in relays}
    for fut in as_completed(future_to_url, timeout=8):
        url, size, err = fut.result()
        if err:
            print(f"[FAILED] {url} -> {err}")
        else:
            print(f"[OK] {url} -> {size} bytes received")

print(f"Finished concurrent download pipeline in {time.time() - start:.2f}s")`,
};

/**
 * Executes a simulated concurrent run in the browser
 */
export function runSimulatedConcurrencyTest(options: {
  executorType: "ThreadPoolExecutor" | "ProcessPoolExecutor";
  maxWorkers: number;
  taskCount: number;
  taskType: "io" | "cpu";
  timeoutLimitSec?: number;
  simulateFailureOnIndex?: number;
}): ConcurrencyRunResult {
  const { executorType, maxWorkers, taskCount, taskType, simulateFailureOnIndex } = options;
  const logs: string[] = [];

  logs.push(`[INIT] Initializing ${executorType}(max_workers=${maxWorkers})...`);
  logs.push(`[SUBMIT] Submitting ${taskCount} ${taskType.toUpperCase()}-bound jobs...`);

  const tasks: SimulatedTask[] = [];
  const baseDuration = taskType === "io" ? 400 : 600; // ms per task

  let sequentialTimeMs = 0;

  for (let i = 1; i <= taskCount; i++) {
    const variance = (i % 3) * 100;
    const duration = baseDuration + variance;
    sequentialTimeMs += duration;

    const task: SimulatedTask = {
      id: `task-${i}`,
      name: taskType === "io" ? `Fetch-RPC-Endpoint-${i}` : `Keccak-CPU-Hasher-${i}`,
      type: taskType,
      target: taskType === "io" ? `https://rpc-node-${i}.network.internal` : `0xTree3_Block_${i * 1000}`,
      durationMs: duration,
      status: "QUEUED",
    };
    tasks.push(task);
  }

  // Simulate worker execution scheduling
  const workerAvailableAt = new Array(maxWorkers).fill(0);
  let maxTimeMs = 0;
  let completed = 0;
  let failed = 0;
  let cancelled = 0;

  tasks.forEach((t, idx) => {
    // Find earliest available worker
    let earliestWorker = 0;
    for (let w = 1; w < maxWorkers; w++) {
      if (workerAvailableAt[w] < workerAvailableAt[earliestWorker]) {
        earliestWorker = w;
      }
    }

    const startTime = workerAvailableAt[earliestWorker];
    t.workerId = earliestWorker + 1;
    t.startTime = startTime;

    if (simulateFailureOnIndex !== undefined && idx === simulateFailureOnIndex) {
      t.status = "FAILED";
      t.error = "ValueError: RPC Node Timeout (simulateFailure)";
      failed++;
      workerAvailableAt[earliestWorker] = startTime + 100;
      logs.push(`[WORKER ${t.workerId}] Task #${idx + 1} raised: ${t.error}`);
    } else {
      t.status = "COMPLETED";
      t.endTime = startTime + t.durationMs;
      t.result = taskType === "io" ? `200 OK (${t.durationMs}ms)` : `Hash: 0x${Math.random().toString(16).slice(2, 10)}`;
      t.callbackFired = true;
      completed++;
      workerAvailableAt[earliestWorker] = t.endTime;
      logs.push(`[WORKER ${t.workerId}] Task #${idx + 1} finished in ${t.durationMs}ms. Callback triggered.`);
    }

    if (workerAvailableAt[earliestWorker] > maxTimeMs) {
      maxTimeMs = workerAvailableAt[earliestWorker];
    }
  });

  const executionTimeSec = Number((maxTimeMs / 1000).toFixed(2));
  const sequentialTimeSec = Number((sequentialTimeMs / 1000).toFixed(2));
  const speedupFactor = Number((sequentialTimeSec / Math.max(executionTimeSec, 0.01)).toFixed(2));

  logs.push(`[SHUTDOWN] Executor closed context manager with wait=True.`);
  logs.push(`[BENCHMARK] Sequential took ${sequentialTimeSec}s | Parallel took ${executionTimeSec}s (${speedupFactor}x speedup).`);

  return {
    executorType,
    maxWorkers,
    totalTasks: taskCount,
    completedTasks: completed,
    failedTasks: failed,
    cancelledTasks: cancelled,
    executionTimeSec,
    sequentialTimeSec,
    speedupFactor,
    tasks,
    logs,
  };
}
