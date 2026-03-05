# Update Instructions

## Important Database Changes

### New Commission Calculation Logic

**Old Formula:**
```
Commission = (Amount - Discount) × Rate
```

**New Formula:**
```
Full Commission = Policy Amount × Rate
Final Commission = Full Commission - Discount
Where: Discount = Policy Amount - Paid Amount
```

### Required Database Migration

Before using the updated app, you MUST run the migration SQL:

1. Go to Supabase SQL Editor
2. Run the contents of `migration-update-commission.sql`

This will:
- Add `paid_amount` column
- Add `no_commission` column  
- Convert `discount` to a generated column (auto-calculated)

### New Features Added

✅ **Policy Amount & Paid Amount**
- Renamed "Premium Amount" to "Policy Amount"
- Added "Paid Amount" field
- Discount is now auto-calculated: Policy Amount - Paid Amount

✅ **New Commission Formula**
- Full Commission = Policy Amount × Rate
- Final Commission = Full Commission - Discount

✅ **No Commission Checkbox**
- Option to set commission as $0 for specific policies
- Useful for special cases or non-commission policies

✅ **Edit & Delete Functionality**
- Edit any Client, Company, Policy Type, Rate, or Policy
- Delete with confirmation

✅ **Policy Expiration Filters**
- Filter by: All, Expiring in 30/60/90 days, or Expired
- Visual indicators for days remaining

### Files Changed

1. `database-schema.sql` - Updated schema
2. `migration-update-commission.sql` - NEW migration file
3. `src/pages/Policies.jsx` - Complete rewrite with new logic
4. Other page files will be updated with edit/delete functionality

### Next Steps After Migration

1. Run the migration SQL
2. Test adding a new policy with the new fields
3. Verify commission calculation is correct
4. Update any existing policies if needed using the Edit button

