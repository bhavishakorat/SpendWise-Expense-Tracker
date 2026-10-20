# SpendWise – Personal Expense Tracker 

SpendWise is a web-based expense tracking application that helps users manage their income, expenses, and transactions through a simple and interactive dashboard.

##  Features

- User registration and login
- Add, edit, and delete transactions
- Track income and expenses
- Monthly transaction filtering
- Search and filter transactions
- Interactive charts using Chart.js
- Financial summaries and spending insights
- Export transaction records to Excel

##  Technologies Used

**Frontend:** HTML, CSS, JavaScript, Chart.js

**Backend:** Python, Flask

**Database:** SQLite

**Tools:** Visual Studio Code, Git, GitHub

##  Project Structure

```text
SpendWise/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   ├── app.py
│   └── requirements.txt
├── .gitignore
└── README.md
```

##  How to Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/bhavishakorat/SpendWise-Expense-Tracker.git
cd SpendWise-Expense-Tracker
```

### 2. Install backend dependencies

```bash
cd backend
python -m venv venv
```

Activate the virtual environment in Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the packages:

```bash
pip install -r requirements.txt
```

### 3. Start the backend

```bash
python app.py
```

### 4. Start the frontend

Open the `frontend` folder in Visual Studio Code and run `index.html` using the Live Server extension.

Keep the Flask backend running while using the website. Ensure the frontend API configuration points to the running backend.

##  Project Objective

The objective of SpendWise is to make personal expense tracking easier and help users understand their spending habits through clear financial summaries and visualizations.

## Learning Outcomes

Through this project, I practised frontend development, Python programming, Flask APIs, database operations, user authentication, data visualization, and GitHub version control.

##  Author

**Bhavisha Korat**

B.Sc. IT (FinTech) Student

GitHub: [bhavishakorat](https://github.com/bhavishakorat)

---

*This project was developed for learning and educational purposes.*
