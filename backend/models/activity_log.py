import uuid
from datetime import datetime
from backend.extensions import db

class ActivityLog(db.Model):
    """ActivityLog database model storing user operations for security transparency."""
    __tablename__ = "activity_logs"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    action_type = db.Column(db.String(100), nullable=False)
    metadata_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action_type": self.action_type,
            "metadata": self.metadata_json,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
