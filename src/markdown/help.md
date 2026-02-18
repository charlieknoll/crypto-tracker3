###### Settings

- Set up start year to be the earliest year for any transaction
- Set etherscan api key before importing chain transactions
- Be sure to add USD as a base currency or api will set it to 0.0

###### Addresses

- Use WalletName-index to name HD BIP29 wallets e.g. "Metamask-0"
- Skip Internal: Set this to skip importing internal tx's for a "Contract Owned" type account (useful for old Token Contracts that weren't properly implemented)
- Leave wallet name blank for geth created accounts
- Set wallet name for HD accounts (eg MetaMask)

###### Capital Gains

- Non Sells (Transfers) will show the acquistion date of the from accounts inventory, it will not dispose of the first available undisposed lot. Therefor if SELLS and TRANSFERS are displayed, it will appear as the Date Acquired is not in order.

###### Unrealized Gains

- If year is selected than it will filter all unrealized Gains held at the end of that year
- Pre wallet cutoff it is possible for the holding account of the unrealized not be holding a running balance because of Portfolio wide cost basis accounting as of 1/1/2025
