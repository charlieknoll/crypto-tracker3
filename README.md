# CryptoTracker (crypto-tracker3)

Track crypto balances, gains and losses

## TODO

- Use getBalance to verify running balance at block for CDAI
- Test and reconcile tokens
- test etherscan import on 3 accounts
- set capital gains as gift with non zero ether transfers from spam accounts
- Unrealized: fix time, add wallet and holdingAccount/address, group on Wallet and account, remove Type and From, add export and import into opening positions, addresses
- test very large decimal support on chain-tx, mined block, token-tx (git changes)
- test wallet transaction cutoff for capital gains and unrealized
- document skipInternal?
- Add account filter on unrealized, only show accounts with balance above enterable
- set all non named accounts to spam if type not set using button
- hide spam toggle on address
- fix asset store to only show non spam tokens
- hide spam toggle on chain tx that hides token-txs to/from spam and zero value ETH
- don't request non tracked token prices
- add checkbox to hide zero spam and untracked tokens on running balances
- gift export
- verify address balance button that calls current balance, highlights red/green, popup delta
- wallet capital gains starting in 2025
- add Kraken integration
- add total net worth on dashboard reconciled with zapper

## DONE

- Reconcile ETH on Unrealized using etherscan account balance
- fix chain tx units
- why didn't the from account of the 2FA tx get added to addresses?
- add wallet name field to owned account
- rate limit coingecko
- fix window height for capital gains. Income, spending and running balances works
- build help page which include readme files
- why does $0.00 USD price get auto added when updating ETH price? A: USD was not set as a base currency
- Sell Unrealized Gain/Loss on CRV? YES
- test fee tx (transfer) is added to cost basis correctly, test using ETH fees too
- set eth price on chain tx, isn't there a pop up?

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
