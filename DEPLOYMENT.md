# Deployment Guide for Trustora Project

Since this project has two distinct pieces (a modern React Frontend and a Node.js + Python Backend), the best free platforms to use are **Vercel** (for the Frontend) and **Render** (for the Backend). 

Follow these exact steps to get your project live on the internet!

---

## Part 1: Deploying the Backend on Render
The backend needs an environment that supports both Node.js and Python (for the AI Forensic scripts). 

1. Go to **[Render.com](https://render.com/)** and sign up using your GitHub account.
2. Click **New +** and select **Web Service**.
3. Connect your repository: `vsvichuux123/KSUM`.
4. Fill in the following details:
   * **Name:** `trustora-backend`
   * **Region:** Choose the one closest to you (e.g., Singapore or Frankfurt).
   * **Branch:** `main`
   * **Root Directory:** `backend`  *(<-- Very Important!)*
   * **Runtime:** `Node`
   * **Build Command:** `npm install && pip install -r requirements.txt` (if you add python dependencies later, otherwise just `npm install`)
   * **Start Command:** `node server.js`
5. **Environment Variables**: Scroll down to the Advanced section and add these:
   * `PORT`: `5000`
   * `FRONTEND_URL`: Leave blank for now, we will add the Vercel URL here later.
   * `GEMINI_API_KEY`: *(Paste your Gemini key here if you use it)*
   * `HUGGINGFACE_API_KEY`: *(Paste your HuggingFace key here if you use it)*
6. Click **Create Web Service**. Render will now build your backend. It might take 2-3 minutes. Once done, copy the live URL (e.g., `https://trustora-backend.onrender.com`).

---

## Part 2: Deploying the Frontend on Vercel
Vercel is the fastest and easiest way to deploy Vite/React applications.

1. Go to **[Vercel.com](https://vercel.com/)** and sign in with GitHub.
2. Click **Add New -> Project**.
3. Import your `vsvichuux123/KSUM` repository.
4. Fill in the deployment details:
   * **Project Name:** `trustora-web`
   * **Framework Preset:** `Vite` (Vercel should auto-detect this).
   * **Root Directory:** Edit this and select `frontend`.
5. **Environment Variables:**
   * **Crucial Step:** You need to tell the frontend where the live backend is!
   * Add a new environment variable (if your frontend uses one, like `VITE_BACKEND_URL`). *(Note: Currently, your frontend hardcodes `127.0.0.1:5000` in Dashboard.jsx and RequestsPage.jsx. See Part 3 below to fix this!)*
6. Click **Deploy**. Vercel will build and give you a live URL (e.g., `https://trustora-web.vercel.app`).

---

## Part 3: Fixing Hardcoded Localhost URLs before Deployment
Right now, your frontend components (like `Dashboard.jsx`, `RequestsPage.jsx`, `VerifyLandingPage.jsx`) are hardcoded to fetch from `http://127.0.0.1:5000`. 
Before your deployed website can work, you need to update the frontend to use the live backend URL.

### Recommended Fix:
1. In your `frontend` folder, create a `.env` file and add: 
   `VITE_BACKEND_URL=https://trustora-backend.onrender.com` 
   *(Replace with your actual Render URL when you get it).*
2. In your components (e.g. `Dashboard.jsx`), replace `http://127.0.0.1:5000` with `import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'`.
3. Push these changes to GitHub. Vercel and Render will automatically redeploy!

---

## Part 4: Updating Backend CORS
Once Vercel gives you your frontend URL:
1. Go back to Render -> trustora-backend -> Environment.
2. Set the `FRONTEND_URL` to your new Vercel domain.
3. This ensures your Backend allows traffic from your live Frontend.
