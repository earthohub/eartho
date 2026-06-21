# AGENTS.md

## Cursor Cloud specific instructions

### What this is
Eartho is a Truffle/Solidity (EVM) project: an `Eartho` ERC-721 NFT for Earth
coordinates plus an `EarthoExchange` purchase contract that swaps tokens/ETH
(via a vendored PancakeSwap/Uniswap V2 router) to mint NFTs. There is no
backend server, database, or frontend — all state is on-chain. OpenZeppelin is
vendored under `contracts/dependencies/`, so no extra package is needed for it.

### Build / test / run (all via Truffle)
- Compile: `npx truffle compile` (use `npx truffle compile --all` to bypass the
  pre-committed, possibly stale artifacts in `build/contracts/`).
- Test / run (end-to-end): `npx truffle test`. Truffle auto-spins an internal
  Ganache on port 9545 (network name `test`); no external chain is required.
  `migrations/1_test_migration.js` only deploys the full stack when
  `network == 'test'`, which is exactly what `truffle test` uses.
- Deploy to a public net (optional, needs RPC + a funded key in `.secret_eth`):
  `npx truffle migrate --network <Goerli|Mainnet|BSC|mumbai|ropsten>`.

### Non-obvious gotchas
- `truffle-config.js` does `fs.readFileSync(".secret_eth")` at load time, so
  EVERY truffle command fails if `.secret_eth` is missing. A throwaway public
  test mnemonic is committed at repo root for local use — do NOT fund this key.
- `compilers.solc.settings.evmVersion` is pinned to `"shanghai"`. The bundled
  Ganache (v7.9.x) supports at most the `shanghai` hardfork, while modern solc
  defaults to `cancun`/`prague`; without this pin, deploys fail with
  "invalid opcode". Keep this pin unless you also upgrade the local chain.
- `EarthoExchangeTest.js` hardcodes deployed mock addresses (e.g. the USDC
  address). These are deterministic only because the internal Ganache uses its
  default mnemonic and the migration deploys in a fixed order — do not reorder
  deployments in the migration.
- Known pre-existing test issue (not an environment problem): `EarthoTest.js`
  fails because line 55 calls `getNFTContext(nftForOne)` passing the array
  returned by `getEarthos` to a scalar `uint256` param; the modern web3/ethers
  ABI coder rejects this and the remaining `EarthoTest` cases cascade from it.
  `EarthoExchangeTest` passes fully and is the best end-to-end smoke test.
