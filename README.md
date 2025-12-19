# CryptoTracker (crypto-tracker3)

Track crypto balances, gains and losses

## TODO

- fix window height for capital gains. Income, spending and running balances works
- build help page which include readme files
- set all non named accounts to spam if type not set using button
- hide spam toggle on address
- fix asset store to only show non spam tokens
- hide spam toggle on chain tx that hides token-txs to/from spam and zero value ETH
- don't request non tracked token prices
- set capital gains as gift with non zero ether transfers from spam accounts
- add checkbox to hide zero spam and untracked tokens on running balances
- gift export
- verify address balance button that calls current balance, highlights red/green, popup delta
- add wallet name field to owned account
- wallet capital gains starting in 2025
- add total net worth on dashboard reconciled with zapper

## DONE

- rate limit coingecko

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
