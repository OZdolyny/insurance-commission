# 🚀 Deployment Guide - Step by Step

Follow these steps carefully to deploy your Insurance Commission Tracker.

## Part 1: Set Up Supabase Database (5 minutes)

### Step 1: Create Database Tables

1. Log in to your Supabase account at https://supabase.com
2. Open your existing project (or create a new one)
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Open the file `database-schema.sql` from this project
6. Copy ALL the SQL code from that file
7. Paste it into the Supabase SQL Editor
8. Click "Run" button (or press Ctrl+Enter)
9. You should see "Success. No rows returned" - this is good!

### Step 2: Get Your Supabase Credentials

1. In Supabase, go to Settings (gear icon) → API
2. You'll see two important values:
   - **Project URL** (looks like: https://abcdefgh.supabase.co)
   - **anon public** key (long string starting with eyJ...)
3. Keep this tab open - you'll need these values soon!

### Step 3: Verify Tables Were Created

1. In Supabase, click "Table Editor" in the left sidebar
2. You should see 3 tables:
   - clients
   - agreements
   - commissions
3. If you see these, you're good! ✅

## Part 2: Prepare Your Code (2 minutes)

### Step 4: Create .env File

1. Open your project folder in your code editor
2. Find the file `.env.example`
3. Make a copy of it and name it `.env` (just ".env", no .example)
4. Open the `.env` file
5. Replace the placeholder values with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

6. Save the file

### Step 5: Test Locally (Optional but Recommended)

1. Open a terminal in your project folder
2. Run: `npm install` (this installs all dependencies)
3. Run: `npm run dev`
4. Open http://localhost:5173 in your browser
5. Try adding a test client - if it works, you're ready to deploy!
6. Press Ctrl+C to stop the dev server

## Part 3: Deploy to Vercel (5 minutes)

### Method A: Deploy via GitHub (Recommended)

#### Step 6a: Push to GitHub

1. Create a new repository on GitHub
2. In your terminal, run:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/insurance-tracker.git
git push -u origin main
```

#### Step 7a: Deploy on Vercel

1. Log in to https://vercel.com
2. Click "Add New..." → "Project"
3. Click "Import" next to your GitHub repository
4. In "Environment Variables" section, add:
   - Name: `VITE_SUPABASE_URL`
   - Value: (paste your Supabase URL)
   - Click "Add"
   
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: (paste your Supabase anon key)
   - Click "Add"

5. Click "Deploy"
6. Wait 1-2 minutes for deployment to complete
7. Click the generated URL to see your live app! 🎉

### Method B: Deploy via Vercel CLI

#### Step 6b: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 7b: Deploy

1. In your project folder, run:
```bash
vercel
```

2. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? (choose your account)
   - Link to existing project? **N**
   - What's your project's name? **insurance-tracker**
   - In which directory is your code located? **./**
   - Want to override settings? **N**

3. When asked about environment variables, add them:
   - `VITE_SUPABASE_URL`: (paste your value)
   - `VITE_SUPABASE_ANON_KEY`: (paste your value)

4. Your app is now live at the URL shown!

## Part 4: Test Your Deployment (2 minutes)

### Step 8: Verify Everything Works

1. Open your deployed app URL
2. Test the following:
   - ✅ Dashboard loads
   - ✅ Click "Clients" tab
   - ✅ Add a test client
   - ✅ Click "Agreements" tab
   - ✅ Add a test agreement
   - ✅ Click "Commissions" tab
   - ✅ See the commission appear
   - ✅ Mark it as "Paid"

If all these work, congratulations! 🎉 Your app is fully deployed!

## Troubleshooting

### Error: "Failed to fetch"
- Check your environment variables in Vercel
- Make sure they match your Supabase credentials exactly

### Error: "relation 'clients' does not exist"
- You need to run the SQL schema in Supabase (Part 1, Step 1)

### Environment variables not working
1. Go to Vercel dashboard
2. Click on your project
3. Go to Settings → Environment Variables
4. Add/update your variables
5. Redeploy (Deployments → ... → Redeploy)

## Next Steps

Now that your app is deployed:

1. **Bookmark your app URL** for easy access
2. **Start adding your real clients**
3. **Track your actual agreements**
4. **Monitor your commissions**

## Updating Your App

When you want to make changes:

1. Make changes to your code
2. Test locally with `npm run dev`
3. If using GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. Vercel will automatically redeploy!

Or if using CLI:
```bash
vercel --prod
```

---

**Need help?** Check the main README.md file for more details!
