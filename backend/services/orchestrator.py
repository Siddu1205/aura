import time
import json
import logging
import threading
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database.db import SessionLocal
from backend.database.models import Product, Customer, Supplier, AgentAction, Business
from backend.agents.restock import draft_restock_po
from backend.agents.collections import draft_payment_reminder
from backend.agents.winback import draft_winback_offer
from backend.services.email_service import send_business_email

logger = logging.getLogger("aura.orchestrator")
_running = False
_thread = None

def run_orchestrator_loop():
    global _running
    logger.info("Orchestrator thread started.")
    while _running:
        try:
            db = SessionLocal()
            run_trigger_check_cycle(db)
            db.close()
        except Exception as e:
            logger.error(f"Error in orchestrator cycle: {e}")
        time.sleep(10)

def start_orchestrator():
    global _running, _thread
    if not _running:
        _running = True
        _thread = threading.Thread(target=run_orchestrator_loop, daemon=True)
        _thread.start()
        logger.info("Orchestrator background scheduler started.")

def stop_orchestrator():
    global _running
    _running = False
    logger.info("Orchestrator background scheduler stopped.")

def run_trigger_check_cycle(db: Session):
    """
    Runs deterministic checks for Restock, Collections, and Win-back triggers.
    If triggered, drafts action with LLM (or template fallback) and logs to agent_actions.
    Also alerts the business owner via email about the operational trigger events.
    """
    businesses = db.query(Business).all()
    for biz in businesses:
        try:
            biz_config = json.loads(biz.config) if biz.config else {}
        except Exception:
            biz_config = {}
            
        owner_email = biz_config.get("smtp_email") or (biz.username if "@" in biz.username else None)

        # 1. RESTOCK CHECK
        products = db.query(Product).filter(
            Product.business_id == biz.id,
            Product.current_stock < Product.reorder_threshold
        ).all()

        for prod in products:
            existing = db.query(AgentAction).filter(
                AgentAction.business_id == biz.id,
                AgentAction.agent_type == "restock",
                AgentAction.status == "proposed",
                AgentAction.trigger_reason.like(f"%Product: {prod.name}%")
            ).first()

            if not existing:
                supplier = db.query(Supplier).filter(Supplier.id == prod.supplier_id).first()
                supplier_name = supplier.name if supplier else "Unknown Supplier"
                supplier_cost = prod.unit_cost

                # Draft action
                po_draft, source = draft_restock_po(
                    product_name=prod.name,
                    current_stock=prod.current_stock,
                    reorder_threshold=prod.reorder_threshold,
                    supplier_name=supplier_name,
                    unit_cost=supplier_cost
                )

                action = AgentAction(
                    business_id=biz.id,
                    agent_type="restock",
                    trigger_reason=f"Stock low! Product: {prod.name}. Stock: {prod.current_stock} (Threshold: {prod.reorder_threshold})",
                    action_taken=json.dumps(po_draft),
                    mode="copilot",
                    status="proposed",
                    language_source=source,
                    created_at=datetime.now().isoformat()
                )
                db.add(action)
                db.commit()
                logger.info(f"Restock agent triggered action for product: {prod.name}")

                # Push email alert to Business Owner
                if owner_email:
                    subject = f"[AURA Alert] Low Stock Warning: {prod.name}"
                    body = (
                        f"Dear {biz.name},\n\n"
                        f"Operational Alert from AURA Nervous System:\n"
                        f"Product '{prod.name}' has dropped to {prod.current_stock} units. "
                        f"This is below your reorder threshold of {prod.reorder_threshold} units.\n\n"
                        f"A Purchase Order draft has been prepared for {supplier_name}.\n"
                        f"Please log in to your AURA Mission Control dashboard to approve and execute.\n\n"
                        f"Warm Regards,\n"
                        f"AURA Core Processor"
                    )
                    send_business_email(biz_config, owner_email, subject, body)

        # 2. COLLECTIONS CHECK
        customers = db.query(Customer).filter(
            Customer.business_id == biz.id,
            Customer.outstanding_due > 0,
            Customer.consent_status == "opted_in"
        ).all()

        for cust in customers:
            existing = db.query(AgentAction).filter(
                AgentAction.business_id == biz.id,
                AgentAction.agent_type == "collections",
                AgentAction.status == "proposed",
                AgentAction.trigger_reason.like(f"%Customer: {cust.name}%")
            ).first()

            if not existing:
                reminder, source = draft_payment_reminder(
                    customer_name=cust.name,
                    outstanding_due=cust.outstanding_due,
                    tone="polite"
                )

                action = AgentAction(
                    business_id=biz.id,
                    agent_type="collections",
                    trigger_reason=f"Outstanding due of ₹{cust.outstanding_due} for Customer: {cust.name}",
                    action_taken=json.dumps(reminder),
                    mode="copilot",
                    status="proposed",
                    language_source=source,
                    created_at=datetime.now().isoformat()
                )
                db.add(action)
                db.commit()
                logger.info(f"Collections agent triggered action for customer: {cust.name}")

                # Push email alert to Business Owner
                if owner_email:
                    subject = f"[AURA Alert] Collections Reminder: {cust.name}"
                    body = (
                        f"Dear {biz.name},\n\n"
                        f"Operational Alert from AURA Nervous System:\n"
                        f"Customer '{cust.name}' has an outstanding due of ₹{cust.outstanding_due:.2f} "
                        f"pending in their account.\n\n"
                        f"A payment reminder draft has been prepared.\n"
                        f"Please log in to your AURA Mission Control dashboard to review and dispatch.\n\n"
                        f"Warm Regards,\n"
                        f"AURA Core Processor"
                    )
                    send_business_email(biz_config, owner_email, subject, body)

        # 3. WIN-BACK CHECK
        all_custs = db.query(Customer).filter(Customer.business_id == biz.id).all()
        for cust in all_custs:
            if not cust.last_order_date:
                continue
            
            try:
                last_order = datetime.fromisoformat(cust.last_order_date.replace("Z", ""))
                days_since = (datetime.now() - last_order).days
            except ValueError:
                try:
                    last_order = datetime.strptime(cust.last_order_date, "%Y-%m-%d")
                    days_since = (datetime.now() - last_order).days
                except Exception:
                    days_since = 0

            if days_since > 30:
                existing = db.query(AgentAction).filter(
                    AgentAction.business_id == biz.id,
                    AgentAction.agent_type == "winback",
                    AgentAction.status == "proposed",
                    AgentAction.trigger_reason.like(f"%Customer: {cust.name}%")
                ).first()

                if not existing:
                    offer, source = draft_winback_offer(
                        customer_name=cust.name,
                        last_order_date=cust.last_order_date,
                        days_since=days_since
                    )

                    action = AgentAction(
                        business_id=biz.id,
                        agent_type="winback",
                        trigger_reason=f"Customer churn warning! Customer: {cust.name} hasn't ordered in {days_since} days.",
                        action_taken=json.dumps(offer),
                        mode="copilot",
                        status="proposed",
                        language_source=source,
                        created_at=datetime.now().isoformat()
                    )
                    db.add(action)
                    db.commit()
                    logger.info(f"Winback agent triggered action for customer: {cust.name}")
