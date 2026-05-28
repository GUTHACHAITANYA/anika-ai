import uuid
import re
from backend.extensions import db

def validate_participant_name(name: str):
    """
    Validates participant names:
    - Not empty or whitespace-only
    - Not matching UPI pattern
    - Not containing card/bank keywords
    - Not matching transaction ID pattern
    """
    if not name or not name.strip():
        raise ValueError("Participant name cannot be empty.")
    
    clean_name = name.strip().lower()
    
    # UPI format validator
    if re.match(r"^[\w.\-]+@[\w]+$", clean_name):
        raise ValueError("Participant name cannot be a UPI Virtual Payment Address (VPA).")
        
    # Transaction ID validator
    if re.match(r"^[A-Z0-9]{12,}$", name.strip().upper()):
        raise ValueError("Participant name cannot be a transaction reference ID.")
        
    # Card keywords
    card_keywords = ["debit", "credit", "visa", "mastercard", "rupay", "card"]
    for keyword in card_keywords:
        if keyword in clean_name:
            raise ValueError(f"Participant name cannot contain card keyword '{keyword}'.")
            
    # Bank keywords
    bank_keywords = ["sbi", "hdfc", "icici", "axis", "kotak", "pnb", "bank"]
    for keyword in bank_keywords:
        if keyword in clean_name:
            raise ValueError(f"Participant name cannot contain bank symbol '{keyword}'.")
            
    return name.strip()

class Participant(db.Model):
    """Participant database model storing raw transactional split claims."""
    __tablename__ = "participants"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id = db.Column(db.String(36), db.ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    paid_amount = db.Column(db.Float, default=0.0)
    owed_amount = db.Column(db.Float, default=0.0)

    def __init__(self, **kwargs):
        if "name" in kwargs:
            kwargs["name"] = validate_participant_name(kwargs["name"])
        super().__init__(**kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "name": self.name,
            "paid_amount": self.paid_amount,
            "owed_amount": self.owed_amount
        }
