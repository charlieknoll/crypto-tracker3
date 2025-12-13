# CryptoTracker (crypto-tracker3)

Track crypto balances, gains and losses

## TODO

- don't request non tracked token prices
- set all as spam with 0 value or untracked token on address
- set all as gift with non zero ether transfers
- figure out what to do with Spam token transfers
- add checkbox to hide zero spam and untracked tokens on running balances
- gift export
- verify address balance button that calls current balance, highlights red/green, popup delta
- add wallet name field to owned account
- wallet capital gains starting in 2025

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
