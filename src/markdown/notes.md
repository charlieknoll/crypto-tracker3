Internal txs will be imported for "Contract Owned" accounts. Therefor it is necessary to set address type to "Expense" for ENS Old Registrar to avoid thousands of internal tx's being imported. If a contract holds "owned" funds it must be set to "Contract Owned" for Running Balances to work correctly (e.g. "yCrv Gauge:yDAI+yUSDC+yUSDT+yTUSD"). These accounts should be checked that they don't contain unrelated internal txs on etherscan.

"Spam" accounts will be not be displayed on Chain Tx's or Running Balances pages.
