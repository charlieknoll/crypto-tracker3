# CryptoTracker (crypto-tracker3)

Track crypto balances, gains and losses

## TODO

- implement getCurrentPrices
- finish unrealized fields, filter up to displayed year
- Test charlie.knoll.eth chaintransactions with test data
- Test GIFT-IN, GIFT-OUT(GIFT?)
- Gift Export/import
- Add wallet functionaltiy

- Floating point gotchas:
  -- tx.value should be "-" + floatToStr(tx.value) (-tx.value creates floating point errors)
  -- Math.abs(tx.value) should be floatToStrAbs(tx.value) Math.abs creates floating point

- treat a GIFT tx from Spam as a "Buy" at market rates
- Change a GIFT tx from openingPositon as a normal "TRANSFER"
- treat a "GIFT-IN" as a TRANSFER from an openingPosition named the same as the fromAcccount.name
- Handle EXPENSE REFUND as BUY
- fix exchangeFees by moving to Exchange Transactions and code as income(rewards)/fee
- TRANSFER removes prorated costBasis and amount from accountInventory then adds prorates amount and costBasis + fee to toAccount inventory
- should GIFT-OUT really be a transfer? No it should only be a sell, we don't care about it
- don't double count transfer fees from gas
- fix timestampAndSort function to handle empty sort
- keep a list of the buy lot transfer history including prorated costbasis assigned
- only set wallet name after 1/1/2025 and then set account using tx.fromWallet ?? tx.fromName
- Is there a way to undo a "SELL" from an expense transaction if there is an "EXPENSE REFUND"? (see charlie.eth bid), maybe total EXPENSE and EXPENSE REFUND for a given calendar year? New Tax Code type?

- Reconcile closed brokerage accounts (Poloniex, Coinbase Pro, Bittrex (withdraw BTC?), Binance)
- Test unlocking frozen using offline-tx-signer, copy json files to USB

- Properly handle ENS Registrar burn fees on charlie.eth and meetings.eth to 0x0000dead
- The call to "unseal" bid from ENS burns ETH, it should be treated as Expense
- The original send to ENS Regsitrar should be considered a TRANSFER if the interal tx = the Chain value to a "Contract Owned", if not equal the ETH not in "Contract Owned" should be considered EXPENSE (set 0x000dead to "Expense")
- https://etherscan.io/tx/0x5b526e077d2fbdfac6dd0f080d5d05a1b46ccb5d9056d5067a9ce84e5772a37a

- Unrealized: fix time, add wallet and holdingAccount/address, group on Wallet and account, remove Type and From, add
- Add account filter on unrealized, only show accounts with balance above enterable

- set capital gains as gift with non zero ether transfers from spam accounts
- tax export

- gift export/import (check getRunningBalances for split "->", maybe in Traci's data?)

- WALLET capital gains starting in 2025
- export and import into opening positions, how will address balances be handled?

- Updating date on a price doesn't work, it just takes the timestamp from the original record and overwrites it, probably should have timestamp+asset+source be the key, or at least check timestamp !=date
- add Kraken integration or at least manually enter for 2025
- Get prices from Kraken ?
- Prices service is requesting prices that return 401
- don't request non tracked token prices

- reconcile Coinbase PRO USDC balance (did the fees not get deducted?)
- Add BNB support
- Check ENS expiration dates (charlieknoll, bikeparts) use addresses tab manage, add expiration check programatically
- add total net worth on dashboard reconciled with zapper

- Change Gnosis Wallet to "Contract Owned" ?

- add offline wallet and generate signed tx (including contract calls)
- use icon genie to generate nicer icon for project

## DONE

- distribute cost-basis for a zero amount sell that has a fee (add as a cost basis tx)
- distribute cost-basis for a Zero amount BUY that has a fee
- Set up Capital Gains and Unrealized using test data
- Running balances doesn't work on exchange accounts and doesn't include exchangeStore.fees
- document skipInternal? (Gnosis wallet contract may have some extra tx's)
- Through no api key error to user when trying to import
- Add exchange fees to running balances to reconcile USDC
- Capital Gains: fix gas fee unit issue on all cost basis types
- Verify all prices set (Chain, Income, Spending, Offchain)
- price not saving on ENS
- Prices aren't updated on Spending for ENS
- Income: Totals view for all years is messed up (ETH summing as string?)
- Update column layout on Running Balances for Account and Asset views
- Year filter should default to "All", don't use settings
- Add toggle for only non-zero owned
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
