import * as fs from "fs";

import Abi from "../abis/BaseVault.json";

function getEventSignature(event) {
  const inputs = event.inputs
    .map((i) => (i.indexed ? `indexed ${i.type}` : i.type))
    .join(",");

  return `${event.name}(${inputs})`;
}

fs.writeFileSync(
  "signatures.txt",
  Abi.filter((x) => x.type === "event")
    .map((event) => getEventSignature(event))
    .join("\n")
);
