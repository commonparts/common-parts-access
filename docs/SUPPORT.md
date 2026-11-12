# Support and operating budget (#327)

`/en/support` and `/fr/support` are accessible by direct URL only, with no footer link, and carry noindex/nofollow metadata while hidden. They show a Leetchi donation button when `SUPPORT_LEETCHI_URL` is set to an HTTPS Leetchi URL; otherwise they explain that the fundraiser is not yet available. No payment is handled by Common Parts.

The monthly budget is fetched in a Server Component, with no database writes or new API route. Configure these server-only variables:

| Variable | Value |
|---|---|
| `RAILWAY_API_TOKEN` | Account or workspace API token authorized to read the project's usage (not a project token) |
| `RAILWAY_PROJECT_ID` | Common Parts project to forecast, across its environments |
| `SUPPORT_USD_TO_EUR` | Positive euros per US dollar, maintained manually |
| `SUPPORT_SUPABASE_MONTHLY_EUR` | Nonnegative monthly Supabase cost in euros |
| `SUPPORT_LEETCHI_URL` | Live Common Parts fundraiser URL on leetchi.com |

Seal `RAILWAY_API_TOKEN` in Railway variables. `RAILWAY_PROJECT_ID` and the exchange rate are not secrets and do not need sealing. The exchange rate is configuration so it can be adjusted without changing application code.

Blank amounts remain unknown; an explicit zero means free. If any cost is unknown, the total is unavailable. A failed, empty or malformed Railway response also shows unavailable instead of zero. Credentials and project IDs never reach the page.

Railway's GraphQL `estimatedUsage(projectId, measurements)` forecasts resource usage through the end of the current billing period. Requests time out after five seconds and successful responses are cached for one hour. Cost calculation follows the public [Railway CLI usage implementation](https://github.com/railwayapp/cli/blob/master/src/commands/usage.rs): CPU $20/vCPU-month, memory $10/GB-month, disk and backups $0.15/GB-month (43,200 minutes/month), outbound traffic $0.05/GB. Recheck these prices when Railway changes pricing. Conversion uses the configured exchange rate; this is not a live foreign-exchange feed.

This is a resource usage budget, not an invoice or fundraising target. Railway subscription fees, credits and taxes are explicitly excluded. Manual amounts and the exchange rate must be reviewed by the operator.

Before enabling donations, verify the live fundraiser signed out of Leetchi: reach checkout without creating an account, then verify Apple Pay on a compatible iPhone in Safari and Google Pay on a compatible Android device in Chrome. These checks require the live URL and compatible devices; the application does not claim those payment methods are available.
