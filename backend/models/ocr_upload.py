import uuid
from datetime import datetime
from backend.extensions import db

class OCRUpload(db.Model):
    """OCR Upload database model representing an asynchronous receipt scanning pipeline."""
    __tablename__ = "ocr_uploads"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    status = db.Column(db.String(50), default="queued")  # queued, processing, done, failed
    raw_text = db.Column(db.Text, nullable=True)
    structured_data = db.Column(db.JSON, nullable=True)
    confidence_score = db.Column(db.Float, default=1.0)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "original_filename": self.original_filename,
            "file_path": self.file_path,
            "status": self.status,
            "raw_text": self.raw_text,
            "structured_data": self.structured_data,
            "confidence_score": self.confidence_score,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
