## Tax Classification and Coding Rules

### Spending Coding

Spending can be broken down into 4 types:

- Gifts: The USD unrealized capital gain is transferred to the receiver, they are responsible for reporting capital gains on the sale
- Donations: The USD unrealized capital gain is transferred to the reveiver, they are responsible for reporting capital gains on the sale. Market value in USD can be included as donation for tax purposes on giver's tax return.
- Expenses: The USD value spent is realized as a capital gain and the spender can include the USD value as a business expense
- Spending: The USD value spent is realized as a capital gain

Expenses are determined using the type of the "To Account" of a chain tx>. In this case both the tx fee and the amount spent are considered for recognizing a realized gain. E.g. amount = tx amount + fee, fee = 0.0.

Errored transaction fees are considered realized gains and classified as expenses as well.

All amounts are converted to the amount \* Base Currency Price on the day of the exchange.

### Income Coding

Any asset received from an account marked as "Income" or by an a chain tx initiated by an "Owned" account is classified as income. This should be reported as short term income at market prices when the tx occurred and that value sets the cost basis for the asset.

### Transfer Coding

Transfer fees paid using a utility token are considered a realized gain and adjustment to the transferred amount of tokens' cost basis in base currency terms. These fees are applied to the total asset balance post transfer. After 12/31/2024 the fees are transferred to the receiving wallet asset balance. As of 1/3/2026 the IRS has not specified how transfer fees should be allocated to cost basis: https://www.irs.gov/irb/2024-31_irb?ref=blog.ghost.cointracker.io#REV-PROC-2024-28

### Base currency Coding

Base currency tokens can be exchanged with each other and are assumed to be 1:1 to the base currency. So a trade of 900 USD for 1000 USDT would be considered an income event of 100 USD.

### Short vs Long Term Gains

If the asset is held longer than 365 days, the gain is considered long term otherwise it is classified as short term.
