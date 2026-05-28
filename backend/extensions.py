from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_login import LoginManager

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
login_manager = LoginManager()
