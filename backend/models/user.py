import uuid
from datetime import datetime
from backend.extensions import db
from flask_login import UserMixin

class User(db.Model, UserMixin):
    """User database model representation."""
    __tablename__ = "users"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(80), nullable=True)
    reset_key = db.Column(db.String(36), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    expenses = db.relationship("Expense", backref="owner", lazy="dynamic", cascade="all, delete-orphan")
    ocr_uploads = db.relationship("OCRUpload", backref="owner", lazy="dynamic", cascade="all, delete-orphan")
    budgets = db.relationship("Budget", backref="owner", lazy="dynamic", cascade="all, delete-orphan")
    activity_logs = db.relationship("ActivityLog", backref="owner", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
