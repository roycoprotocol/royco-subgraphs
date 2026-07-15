import fs from "node:fs";

const TUPLE_ARRAY_PATTERN = /^tuple\[([0-9]*)\]$/;
const TUPLE_MATRIX_PATTERN = /^tuple\[([0-9]*)\]\[([0-9]*)\]$/;

/**
 * Mirror of graph-cli's buildSignatureParameter
 * (@graphprotocol/graph-cli/dist/protocols/ethereum/abi.js:15-38).
 *
 * Kept byte-compatible on purpose: matchstick matches mocks by comparing this
 * exact string. A stray space or a flattened tuple silently fails to match, and
 * the symptom is "function not mocked", not "bad signature".
 */
function buildSignatureParameter(input) {
  const indexed = input.indexed ? "indexed " : "";
  const inner = () =>
    (input.components ?? []).map(buildSignatureParameter).join(",");

  if (input.type === "tuple") return `(${indexed}${inner()})`;

  const arr = input.type.match(TUPLE_ARRAY_PATTERN);
  if (arr) return `(${indexed}${inner()})[${arr[1] || ""}]`;

  const mat = input.type.match(TUPLE_MATRIX_PATTERN);
  if (mat) return `(${indexed}${inner()})[${mat[1] || ""}][${mat[2] || ""}]`;

  return `${indexed}${input.type}`;
}

/**
 * Mirror of graph-cli's ABI.eventSignature (abi.js:60-65).
 * This is the string that goes in subgraph.yaml's `event:` field.
 *   MarketDeploymentCompleted(indexed address,indexed address,(address,...,bytes))
 */
export function eventSignature(event) {
  return `${event.name}(${(event.inputs ?? []).map(buildSignatureParameter).join(",")})`;
}

/**
 * Mirror of graph-cli's ABI.functionSignature (abi.js:78-82).
 * ethabi form: <function>([<in>,...])[:(<out>,...)]
 *   getState():((uint64,uint64,...))     <- single tuple output => double parens
 *   previewSyncTrancheAccounting(uint8):((...),(...),uint256)   <- three outputs
 */
export function functionSignature(fn) {
  const inputs = (fn.inputs ?? []).map(buildSignatureParameter).join(",");
  const outputs = (fn.outputs ?? []).map(buildSignatureParameter).join(",");
  return `${fn.name}(${inputs})${outputs.length > 0 ? `:(${outputs})` : ""}`;
}

export function readAbi(abiPath) {
  return JSON.parse(fs.readFileSync(abiPath, "utf8"));
}

/**
 * Functions `graph codegen` will emit callable bindings for.
 *
 * Mirrors graph-cli's own filter
 * (dist/protocols/ethereum/codegen/abi.js:439): view, pure, nonpayable and
 * constant are all bound — ONLY `payable` is excluded.
 *
 * Note this contradicts the widely-repeated claim that nonpayable functions get
 * no binding. It is false for graph-cli 0.97.1; verified against generated/.
 * See CLAUDE.md §5.
 */
const BOUND_MUTABILITY = ["view", "pure", "nonpayable", "constant"];

export function callableFunctions(abi) {
  return abi.filter(
    (e) =>
      e.type === "function" &&
      (BOUND_MUTABILITY.includes(e.stateMutability) ||
        (e.stateMutability === undefined && e.payable !== true)),
  );
}

export function events(abi) {
  return abi.filter((e) => e.type === "event");
}
