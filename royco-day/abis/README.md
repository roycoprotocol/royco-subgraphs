Factory and tranche ABIs are sourced from
`royco-day@a2d2317ec00506b7beac1a3afb3870b3eebec233`.

The deployed snUSD Accountant (`7aa5174c959ec5f412d4c3bc1255c055260188da`)
and Kernel (`ef007dec3476ac4a7f3f6135542cf4661f5fa810`) predate that
commit, so the root ABI files match the deployed implementations. The Accountant ABI
additionally includes `FixedTermCommenceableAt` so one mapping supports both event names.

`contracts/` and `latest/` track
`royco-day@c9ed039b4fa517d74c8da305e7f341a0a19e7a08`. They are references for
the next deployment; codegen uses only `abis/*.json`.
