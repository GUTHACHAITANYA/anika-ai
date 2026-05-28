import uuid
from datetime import datetime
from backend.extensions import db

class Settlement(db.Model):
    """Settlement database model representing a finalized debt clearance payoff."""
    __tablename__ = "settlements"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id = db.Column(db.String(36), db.ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False, index=True)
    from_participant = db.Column(db.String(100), nullable=False)
    to_participant = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default="pending")  # pending, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "from_participant": self.from_participant,
            "to_participant": self.to_participant,
            "amount": self.amount,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
