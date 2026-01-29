# Quick Reference Guide

## Database Schema Overview

### Core Tables
```
insurance_companies (3-char codes: AXA, PRU, MET, etc.)
  ↓
insurance_policy_types (3-char codes: LIF, HLT, AUT, etc.)
  ↓
insurance_policy_rates (defines commission % for each company + policy type pair)
  ↓
clients (your customers)
  ↓
client_policies (the actual insurance policies sold)
```

## Workflow

### Setup Phase (Do Once)
1. **Companies** → Add: AXA, Prudential, MetLife, etc.
2. **Policy Types** → Add: Life, Health, Auto, Home, etc.
3. **Rates** → Set commission rates (e.g., AXA Life = 15%, PRU Health = 12%)

### Daily Operations
1. **Clients** → Add new client
2. **Policies** → Create policy (commission auto-calculated from rates)
3. **Commissions** → Mark as paid when you receive payment

## Commission Calculation Formula

```
Net Amount = Premium Amount - Discount
Commission = Net Amount × Commission Rate
```

**Example:**
- Premium: $1,000
- Discount: $100
- Net: $900
- Rate: 0.15 (15%)
- Commission: $900 × 0.15 = $135

## Field Descriptions

### Insurance Company
- **Code**: 3-letter abbreviation (AXA, PRU, MET)
- **Name**: Full company name
- **Manager Info**: Your contact at the company

### Policy Type
- **Type**: 3-letter code (LIF, HLT, AUT, HOM)
- **Name**: Full name (Life Insurance, Health Insurance)

### Commission Rate
- **Company + Type**: The combination you're setting a rate for
- **Rate**: Enter as decimal (0.15 = 15%, 0.125 = 12.5%)

### Client
- **First/Last/Father Name**: Full client details
- **Phone/Email**: Contact information
- **Comment**: Any notes about this client

### Policy
- **Client**: Who is this policy for?
- **Company**: Which insurance company?
- **Policy Type**: What kind of insurance?
- **Amount**: Total premium
- **Discount**: Any discount given
- **Start/End Date**: Policy period
- **Policy Number**: Reference number (optional)

## Navigation Guide

```
Dashboard      → Overview stats, quick links
Clients        → Manage customer list
Policies       → Create & view policies
Commissions    → Track payments (filter: All/Pending/Paid)
Companies      → Manage insurance companies
Policy Types   → Define insurance product types
Rates          → Set commission rates
```

## Common Tasks

### Add a New Policy
1. Click "Policies"
2. Select client (or add new client first)
3. Select company
4. Select policy type
5. Commission rate loads automatically ✓
6. Enter premium amount
7. Add discount (if any)
8. See calculated commission
9. Set start date
10. Click "Add Policy"

### Track Commission Payment
1. Click "Commissions"
2. Filter: "Pending" to see unpaid
3. When paid → Click "Mark as Paid"
4. Payment date saved automatically

### Update a Rate
Currently: Add new company/type pairs as needed
Note: Changing a rate doesn't affect existing policies (by design, for accuracy)

## Tips & Best Practices

✅ **Set up all companies and types before creating policies**
- This ensures rates are available when you need them

✅ **Use consistent 3-letter codes**
- Makes data entry faster
- Keeps database clean

✅ **Review commission before saving policy**
- Green box shows your commission amount
- Double-check the calculation

✅ **Use the filter on Commissions page**
- "Pending" → What you're owed
- "Paid" → Your payment history
- "All" → Complete overview

✅ **Keep manager contact info updated**
- Helps when you need to follow up on payments

## Keyboard Shortcuts

- Tab: Move between form fields
- Enter: Submit form (when in a text field)
- Esc: Close modals/dialogs (if implemented)

## Status Indicators

🟢 **Paid** = Commission received
🟡 **Pending** = Awaiting payment

## Support

If something doesn't work:
1. Check browser console (F12) for errors
2. Verify all required setup steps completed
3. Check Supabase connection
4. Review DEPLOYMENT.md for troubleshooting

## Sample Data

The database schema includes sample data:
- 2 insurance companies (AXA, Prudential)
- 4 policy types (Life, Health, Auto, Home)
- 5 commission rates

You can delete this sample data or use it for testing!
