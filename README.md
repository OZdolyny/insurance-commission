# 💼 Insurance Commission Tracker

A comprehensive web application for insurance agents to manage multiple insurance companies, track clients, policies, and automatically calculate commissions based on predefined rates.

## Features

- 📊 Dashboard with comprehensive statistics
- 🏢 Insurance company management
- 📋 Policy type definitions
- 💰 Flexible commission rate configuration per company/policy type
- 👥 Client management with detailed information
- 📝 Policy tracking with automatic commission calculation
- 💵 Commission tracking with paid/pending status and filtering
- 🧮 Automatic discount handling
- 📱 Responsive design (works on mobile)

## Tech Stack

- **Frontend**: React + Vite
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: Custom CSS

## Database Structure

The application uses a professional relational database design:

### Tables

**insurance_companies**
- code (3-char unique identifier)
- name
- address
- manager_name, manager_email, manager_phone
- created_at

**insurance_policy_types**
- type (3-char unique identifier)
- name
- created_at

**insurance_policy_rates**
- insurance_company_code (FK)
- insurance_policy_type (FK)
- commission_rate (decimal, e.g., 0.15 for 15%)
- Unique constraint on (company, policy type) combination

**clients**
- id (auto-increment)
- first_name, last_name, father_name
- phone_number, email
- comment
- created_at

**client_policies**
- id (auto-increment)
- client_id (FK)
- insurance_company_code (FK)
- insurance_policy_type (FK)
- amount (premium amount)
- discount
- commission_rate (copied from insurance_policy_rates)
- commission_amount (automatically calculated)
- start_date, end_date
- payment_status (pending/paid)
- payment_date
- policy_number
- created_at

## Setup Instructions

### 1. Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and log in
2. Create a new project (or use your existing one)
3. Go to the SQL Editor
4. Copy the contents of `database-schema.sql` and run it
5. The schema includes sample data to get you started (optional)
6. Go to Settings → API to get your:
   - Project URL
   - Anon (public) key

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Tests and Linting

```bash
npm test
npm run lint
```

Tests (Vitest) cover the commission calculation, date helpers, CSV export and routing in `src/lib/*.test.js`.

## Deployment to Vercel

See `DEPLOYMENT.md` for detailed step-by-step deployment instructions.

### Quick Deploy

1. Push your code to GitHub
2. Import repository in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## Usage Guide

### Initial Setup (First Time)

1. **Add Insurance Companies** (Companies tab)
   - Add all insurance companies you work with
   - Each gets a 3-character code (e.g., AXA, PRU, MET)

2. **Define Policy Types** (Policy Types tab)
   - Add the types of insurance you sell
   - Each gets a 3-character code (e.g., LIF, HLT, AUT)

3. **Set Commission Rates** (Rates tab)
   - For each company/policy type combination, set the commission rate
   - Enter as decimal (e.g., 0.15 for 15%)

### Daily Operations

1. **Add Clients** (Clients tab)
   - Enter client information including first name, last name, father name
   - Add contact details and comments

2. **Create Policies** (Policies tab)
   - Select client, company, and policy type
   - The commission rate is automatically loaded
   - Enter premium amount and any discount
   - Commission is automatically calculated
   - View calculated commission before saving

3. **Track Commissions** (Commissions tab)
   - View all commissions with filtering (All/Pending/Paid)
   - Mark commissions as paid when received
   - See total earned, paid, and pending amounts
   - Track payment dates

### Dashboard

The dashboard provides at-a-glance statistics:
- Total number of clients
- Active policies count
- Number of insurance companies
- Total commissions earned
- Amount paid
- Amount pending

## Key Features Explained

### Automatic Commission Calculation

When you create a policy:
1. Select the insurance company and policy type
2. The system automatically finds the matching commission rate
3. Enter the premium amount and any discount
4. Commission is calculated as: `(amount - discount) × commission_rate`
5. You see the commission amount before saving

### Commission Rate Management

- Each combination of company and policy type can have a unique rate
- Rates are stored separately for easy updates
- Rates are entered as percentages (e.g. `15` for 15%) and can be edited or deleted
- When creating a policy, the current rate is copied to the policy record
- This ensures historical accuracy even if rates change later; editing a policy keeps its saved rate unless you choose "Use current rate"

### Working With Lists

- Clients, policies and commissions can be searched and sorted by clicking column headers
- The policy count on a client opens that client's policies
- Commissions can be exported to CSV (opens in Excel) and marked as paid in bulk
- The Overview page lists policies due for renewal in the next 30 days
- Every page has its own URL (e.g. `#/policies?client=12`), so refresh and the back button work

### Importing a Policy from PDF

**Upload PDF** at the top of the sidebar (available on every page) reads a motor third-party liability policy ("Автоцивілка", ОСЦПВ)
and opens a review dialog:

- **Client:** matched to an existing client by name (or last name + phone). Existing clients show an
  **Edit** button that offers values from the policy (e.g. a new phone number); new clients show **Add client**.
- **Policy:** number, company, policy type, premium, start and end dates are filled in and can be corrected.
- **Comment:** the car brand, model and license plate, editable before saving.
- A policy number that is already saved cannot be imported twice.

Files signed with a qualified electronic signature (PKCS#7, as sent by insurers) are supported; the signature
is not checked. Reading happens in the browser, and the file is not uploaded or stored.
The parser lives in `src/lib/policyPdf/` and was built from BBS Insurance policies; other insurers' layouts
may need small adjustments.

### Flexible Client Information

- Support for first name, last name, and father name (useful in many cultures)
- Optional contact information
- Comments field for notes

## Future Enhancements

Ideas for improvements:
- 📧 Email notifications for upcoming policy renewals
- 📊 Advanced charts and analytics
- 📄 Export reports to PDF
- 📅 Calendar view for policy dates
- 📈 Revenue forecasting
- 🎯 Sales targets and goals
- 👥 Multi-user support with role-based access

## Troubleshooting

### Can't connect to database
- Check your `.env` file has correct Supabase credentials
- Make sure you ran the SQL schema in Supabase
- Verify Row Level Security policies are set up

### "No commission rate found" error
- Make sure you've added the insurance company
- Make sure you've added the policy type
- Most importantly: Add the commission rate for that specific company/type combination in the Rates section

### Data not showing
- Check browser console for errors
- Verify database tables were created
- Make sure you're using the correct Supabase project

### Build fails on Vercel
- Ensure environment variables are set in Vercel dashboard
- Check that all dependencies are in package.json
- Review build logs for specific errors

## Support

For issues or questions, check:
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [Vercel Documentation](https://vercel.com/docs)

## License

MIT License - feel free to use this for your business!
