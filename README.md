# CryptoTracker (crypto-tracker3)

Track crypto balances, gains and losses

## TODO

- Update column layout on Running Balances for Account and Asset views

- Unrealized: fix time, add wallet and holdingAccount/address, group on Wallet and account, remove Type and From, add
- Add account filter on unrealized, only show accounts with balance above enterable

- Prices aren't updated on Spending for ENS
- Prices service is requesting prices that return 401
- Verify all prices set (Chain, Income, Spending, Offchain)
- don't request non tracked token prices
- Price not saving on first CDAI (won't override api $1.00)

- set capital gains as gift with non zero ether transfers from spam accounts

- reconcile Coinbase PRO USDC balance (did the fees not get deducted?)

- export and import into opening positions, how will address balances be handled?

- gift export/import

- wallet capital gains starting in 2025

- add Kraken integration
- Add BNB support
- Check ENS expiration dates (charlieknoll, bikeparts) use addresses tab manage, add expiration check programatically
- add total net worth on dashboard reconciled with zapper

- document skipInternal? (Gnosis wallet contract may have some extra tx's)
- Change Gnosis Wallet to "Contract Owned" ?

## DONE

- test very large decimal support on chain-tx, mined block, token-tx (git changes)
- Reconcile BNB, OP, OMG, LPT, crvUSD, GTC, TRX, XDATA, ViCA
- Test and reconcile tokens, fix token contract missing addresses (CRV), maybe add a new field for token balance contract?
- Fix red highlighting on running balances for Non ETH wallets, why isn't green showing?- Load Metamask wallet and make sure all non zero accounts are in CryptoTracker
- fix asset store to only show non spam tokens
- fix address search
- verify address balance button that calls current balance, highlights red/green, popup delta
- hide spam toggle on address
- Add token balance reconciliation (latest and update on click)
- test that if a spam account sends real ETH that the tx is not hidden due to "SPAM" type
- figure out Presale Mining negative balance issue
- 1113 token txs, 145 CDAI, 99 mined
- why 3 USDC Token transfers for tx 0x648d49, should be 1
- test etherscan import on 3 accounts
- Use getBalance to verify running balance at block for CDAI
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
