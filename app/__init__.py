from flask import Flask
from .routes.main import main_bp
from .routes.actions import actions_bp
import os
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-me-in-env")

    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(actions_bp, url_prefix="/actions")

    return app
