# Chemical Equipment Visualizer (Django + React)


## Overview

Chemical Equipment Visualizer is a full-stack project where you can **upload a CSV** containing chemical equipment parameters and instantly view:
- Preview table (first 10 rows)
- Averages (Flowrate, Pressure, Temperature)
- Equipment type distribution (Pie chart)
- Flowrate comparison (Bar chart)
- Upload history (last 5 uploads)
- **PDF report download** for any uploaded dataset

This project uses **Django REST Framework** for the backend API (Token Authentication) and **React (Vite)** for the frontend UI.


## Features

- CSV Upload (Token-protected)  
- Table Preview (first 10 rows)  
- Averages Calculation  
- Charts: Bar (Flowrate) + Pie (Equipment Types)  
- History List (last 5 uploads)  
- Download PDF report by dataset ID  
- React Login UI (no manual token paste)  
- Token stored in `localStorage` (stays after refresh)  


## Tech Stack

**Backend**
- Django
- Django REST Framework
- Token Authentication (`rest_framework.authtoken`)
- Pandas (CSV processing)
- ReportLab (PDF generation)
- django-cors-headers (CORS for React)

**Frontend**
- React (Vite)
- Axios (API calls)
- Chart.js + react-chartjs-2 (Charts)


## Project Structure

chemical-visualizer/
├── backend/ # Django backend (API)
├── web-react/ # React frontend (Vite)
├── frontend/ # Old HTML version (optional, can ignore)
├── sample_equipment_data.csv
└── README.md


# RUN THE PROJECT (Backend + React)


## Step 1 — Start Backend (Django) on 127.0.0.1:8000
Open **Terminal 1** and run:

cd ~/Desktop/chemical-visualizer/backend
source ../venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver 127.0.0.1:8000


Backend will run at: **http://127.0.0.1:8000**

 **Keep Terminal 1 running.**


#Step 2 — Start Frontend (React) on localhost:5173 (or similar)
Open **Terminal 2** and run:

cd ~/Desktop/chemical-visualizer/web-react
npm install
npm i axios chart.js react-chartjs-2

**Create .env file for API base URL - Create file: web-react/.env and put this line inside:**

VITE_API_BASE=http://127.0.0.1:8000/api

**Now start React:**

npm run dev

**React will show a URL like:**

http://localhost:5173/
(or 5174/5175 if 5173 is busy)

Open that URL in browser.


# USING THE APP (From React UI)

## Step 3 — Login (No manual token paste)

-Enter username + password in the React UI

-Click Login

-Token is saved in localStorage automatically

-Click Logout anytime to clear the token

# Step 4 — Upload CSV

## Choose sample_equipment_data.csv

-Click Upload CSV

-You will see:

-Table preview

-Averages

-Charts (Bar + Pie)

-History list

# Step 5 — Download PDF Report

In the History list, each dataset has:

Download PDF button
Click it → downloads report_<id>.pdf









