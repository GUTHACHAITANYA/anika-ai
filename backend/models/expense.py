import uuid
from datetime import datetime
from backend.extensions import db

class Expense(db.Model):
    """Expense database model representing an invoice or group billing event."""
    __tablename__ = "expenses"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default="INR")
    category = db.Column(db.String(100), default="General")
    merchant = db.Column(db.String(255), nullable=True)
    expense_date = db.Column(db.String(10), default=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    split_mode = db.Column(db.String(50), default="equally")  # equally, percentage, exact, items
    ocr_upload_id = db.Column(db.String(36), db.ForeignKey("ocr_uploads.id"), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    participants = db.relationship("Participant", backref="expense", cascade="all, delete-orphan", lazy="subquery")
    settlements = db.relationship("Settlement", backref="expense", cascade="all, delete-orphan", lazy="subquery")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "total_amount": self.total_amount,
            "currency": self.currency,
            "category": self.category,
            "merchant": self.merchant,
            "expense_date": self.expense_date,
            "split_mode": self.split_mode,
            "ocr_upload_id": self.ocr_upload_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "participants": [p.to_dict() for p in self.participants],
            "settlements": [s.to_dict() for s in self.settlements]
        }
