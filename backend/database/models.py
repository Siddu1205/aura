import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.db import Base

def generate_uuid():
    return str(uuid.uuid4())

class Business(Base):
    __tablename__ = "businesses"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    industry_type = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    config = Column(Text, default="{}") # JSON string containing configurations

    __table_args__ = (
        CheckConstraint("industry_type IN ('kirana', 'tiffin')"),
    )

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    contact_channel = Column(String, nullable=False) # e.g. Phone/Email/WhatsApp

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(String, ForeignKey("suppliers.id"))
    name = Column(String, nullable=False)
    current_stock = Column(Integer, default=0, nullable=False)
    reorder_threshold = Column(Integer, default=0, nullable=False)
    unit_cost = Column(Float, default=0.0, nullable=False)

    supplier = relationship("Supplier")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    contact_channel = Column(String, nullable=False)
    consent_status = Column(String, default="opted_in", nullable=False)
    last_order_date = Column(String) # YYYY-MM-DD
    outstanding_due = Column(Float, default=0.0, nullable=False)

    __table_args__ = (
        CheckConstraint("consent_status IN ('opted_in', 'not_asked', 'opted_out')"),
    )

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"))
    items = Column(Text, nullable=False) # JSON string representation of items ordered
    total = Column(Float, nullable=False)
    status = Column(String, default="completed", nullable=False)
    created_at = Column(String, default=lambda: datetime.now().isoformat())

    customer = relationship("Customer")

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'completed', 'cancelled')"),
    )

class AgentAction(Base):
    __tablename__ = "agent_actions"
    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    agent_type = Column(String, nullable=False) # 'restock', 'collections', 'winback', 'voice'
    trigger_reason = Column(String, nullable=False)
    action_taken = Column(String, nullable=False)
    mode = Column(String, default="copilot", nullable=False) # 'copilot', 'autopilot'
    status = Column(String, default="proposed", nullable=False) # 'proposed', 'executed', 'ignored'
    language_source = Column(String, default="llm", nullable=False) # 'llm', 'template_fallback'
    created_at = Column(String, default=lambda: datetime.now().isoformat())

    __table_args__ = (
        CheckConstraint("status IN ('proposed', 'executed', 'ignored')"),
        CheckConstraint("language_source IN ('llm', 'template_fallback')"),
    )

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False) # e.g. 'Inventory Purchase', 'Rent', 'Utilities', 'Salaries', 'Marketing', 'Others'
    amount = Column(Float, nullable=False)
    date = Column(String, default=lambda: datetime.now().strftime("%Y-%m-%d"))
