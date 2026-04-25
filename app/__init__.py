from flask import Flask
from flask_wtf.csrf import CSRFProtect
from .routes.main import main_bp
from .routes.actions import actions_bp
import os
from dotenv import load_dotenv

load_dotenv()

csrf = CSRFProtect()


def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-me-in-env")

    # CSRF protection — every state-changing request (POST/PUT/PATCH/DELETE)
    # must include the token, either as a form field or X-CSRFToken header.
    csrf.init_app(app)

    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(actions_bp, url_prefix="/actions")

    return app
