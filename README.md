# SOC Orchestrator

A local case management and orchestration UI for security operations.
Built with Flask on WSL. All tool integrations route through Tines — no API keys stored here.

---

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/soc-orchestrator.git
cd soc-orchestrator
```

### 2. Create a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure your environment
```bash
cp .env.example .env
# Edit .env with your actual values
nano .env
```

### 5. Run the app
```bash
python run.py
```

Open your browser to: http://127.0.0.1:5000

---

## Project Structure

```
soc-orchestrator/
├── run.py                  # Entry point
├── requirements.txt
├── .env.example            # Safe to commit - shows required vars
├── .env                    # NEVER commit - your actual secrets
├── .gitignore
├── app/
│   ├── __init__.py         # Flask app factory
│   ├── tines_client.py     # All outbound Tines calls (HMAC signed)
│   ├── routes/
│   │   ├── main.py         # Page routes
│   │   └── actions.py      # Tool action endpoints
│   ├── templates/
│   │   └── index.html
│   └── static/
│       ├── css/style.css
│       └── js/app.js
├── tines/                  # Store Tines story exports here
├── tests/                  # Tests go here as you build
└── docs/                   # Notes, architecture docs
```

---

## Adding a New Tool

1. Add a route in `app/routes/actions.py`
2. Add a button in `app/templates/index.html`
3. Add the action label in `app/static/js/app.js`
4. Build the corresponding Tines story to handle that `action` value

---

## Git Workflow

```bash
# After making changes
git add .
git commit -m "describe what you changed"
git push

# At work, pull latest
git pull
```
