import uuid
from backend.extensions import db

class Budget(db.Model):
    """Budget database model representing user spending tracking limitations."""
    __tablename__ = "budgets"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    category = db.Column(db.String(100), nullable=False)
    monthly_limit = db.Column(db.Float, nullable=False)
    current_spend = db.Column(db.Float, default=0.0)
    period_start = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD format

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "category": self.category,
            "monthly_limit": self.monthly_limit,
            "current_spend": self.current_spend,
            "period_start": self.period_start
        }
