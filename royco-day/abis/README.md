Factory and tranche ABIs are sourced from
`royco-day@a2d2317ec00506b7beac1a3afb3870b3eebec233`.

The deployed snUSD Accountant (`7aa5174c959ec5f412d4c3bc1255c055260188da`)
and Kernel (`ef007dec3476ac4a7f3f6135542cf4661f5fa810`) predate that
commit, so their root ABI files match the deployed implementations. The Accountant ABI additionally
includes the latest `FixedTermCommenceableAt` event so one mapping supports both
event names. The unmodified latest ABIs are kept in `latest/` for the next
deployment.
