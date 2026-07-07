import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database.db import get_db
from backend.database.models import Business, Product, Customer, Supplier, Order, AgentAction
from backend.agents.voice import parse_voice_booking
from backend.services.llm import query_llm
from backend.services.email_service import send_business_email

router = APIRouter()

# Pydantic models for request bodies
class DailySummaryRequest(BaseModel):
    business_id: str
    date_range_days: int = 1

class RestockConfirmRequest(BaseModel):
    qty_received: int
    actual_cost: float

class CollectionsConfirmRequest(BaseModel):
    amount_paid: float

# ----------------- AUTH ROUTING -----------------

@router.post("/auth/signup")
def signup(data: dict = Body(...), db: Session = Depends(get_db)):
    name = data.get("name")
    industry_type = data.get("industry_type")
    username = data.get("username")
    password = data.get("password")

    if not name or not industry_type or not username or not password:
        raise HTTPException(status_code=400, detail="Missing required signup details")

    existing = db.query(Business).filter(Business.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Store email default inside the business config
    biz = Business(
        name=name,
        industry_type=industry_type,
        username=username,
        password=password,
        config=json.dumps({
            "tone": "polite",
            "smtp_email": username if "@" in username else "", # if username is an email
            "smtp_password": "",
            "smtp_host": "smtp.gmail.com",
            "smtp_port": "587"
        })
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)
    
    return {
        "status": "success",
        "business_id": biz.id,
        "name": biz.name,
        "industry_type": biz.industry_type
    }

@router.post("/auth/login")
def login(data: dict = Body(...), db: Session = Depends(get_db)):
    username = data.get("username")
    password = data.get("password")

    biz = db.query(Business).filter(
        Business.username == username,
        Business.password == password
    ).first()

    if not biz:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {
        "status": "success",
        "business_id": biz.id,
        "name": biz.name,
        "industry_type": biz.industry_type
    }

# ----------------- SETTINGS ENDPOINTS -----------------

@router.get("/settings")
def get_settings(business_id: str, db: Session = Depends(get_db)):
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    try:
        config = json.loads(biz.config)
    except Exception:
        config = {}
    return config

@router.post("/settings")
def save_settings(business_id: str = Body(...), config: dict = Body(...), db: Session = Depends(get_db)):
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Update stored config json
    biz.config = json.dumps(config)
    db.commit()
    return {"status": "success", "config": config}

# ----------------- ERP CORE WRITE ENDPOINTS -----------------

@router.get("/products")
def get_products(business_id: str, db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.business_id == business_id).all()

@router.post("/products")
def create_product(data: dict = Body(...), db: Session = Depends(get_db)):
    business_id = data.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="Missing business_id")
    
    prod = Product(
        business_id=business_id,
        supplier_id=data.get("supplier_id") or None,
        name=data.get("name"),
        current_stock=int(data.get("current_stock", 0)),
        reorder_threshold=int(data.get("reorder_threshold", 0)),
        unit_cost=float(data.get("unit_cost", 0.0))
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return {"status": "success", "product": prod}

@router.get("/customers")
def get_customers(business_id: str, db: Session = Depends(get_db)):
    return db.query(Customer).filter(Customer.business_id == business_id).all()

@router.post("/customers")
def create_customer(data: dict = Body(...), db: Session = Depends(get_db)):
    business_id = data.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="Missing business_id")

    cust = Customer(
        business_id=business_id,
        name=data.get("name"),
        contact_channel=data.get("contact_channel"),
        consent_status=data.get("consent_status", "opted_in"),
        last_order_date=datetime.now().strftime("%Y-%m-%d"),
        outstanding_due=float(data.get("outstanding_due", 0.0))
    )
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return {"status": "success", "customer": cust}

@router.get("/suppliers")
def get_suppliers(business_id: str, db: Session = Depends(get_db)):
    return db.query(Supplier).filter(Supplier.business_id == business_id).all()

@router.post("/suppliers")
def create_supplier(data: dict = Body(...), db: Session = Depends(get_db)):
    business_id = data.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="Missing business_id")

    supp = Supplier(
        business_id=business_id,
        name=data.get("name"),
        contact_channel=data.get("contact_channel")
    )
    db.add(supp)
    db.commit()
    db.refresh(supp)
    return {"status": "success", "supplier": supp}

@router.post("/orders")
def record_order(data: dict = Body(...), db: Session = Depends(get_db)):
    business_id = data.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="Missing business_id")

    customer_id = data.get("customer_id")
    items = data.get("items", [])
    total = float(data.get("total", 0.0))

    new_order = Order(
        business_id=business_id,
        customer_id=customer_id or None,
        items=json.dumps(items),
        total=total,
        status="completed",
        created_at=datetime.now().isoformat()
    )
    db.add(new_order)

    # Deduct stock
    for item in items:
        prod = db.query(Product).filter(
            Product.business_id == business_id,
            Product.name == item.get("name")
        ).first()
        if prod:
            prod.current_stock = max(0, prod.current_stock - int(item.get("qty", 1)))

    if customer_id:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if customer:
            customer.last_order_date = datetime.now().strftime("%Y-%m-%d")

    db.commit()
    db.refresh(new_order)
    return {"status": "success", "order": new_order}

# ----------------- DASHBOARD ANALYTICS ENDPOINTS -----------------

@router.get("/dashboard/stats")
def get_dashboard_stats(business_id: str, db: Session = Depends(get_db)):
    # Today's Revenue
    today_str = datetime.now().strftime("%Y-%m-%d")
    today_orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status == "completed",
        Order.created_at.like(f"{today_str}%")
    ).all()
    today_revenue = sum(o.total for o in today_orders)

    # Calculate growth based on yesterday's sales
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    yesterday_orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status == "completed",
        Order.created_at.like(f"{yesterday_str}%")
    ).all()
    yesterday_revenue = sum(o.total for o in yesterday_orders)
    
    if yesterday_revenue > 0:
        growth = round(((today_revenue - yesterday_revenue) / yesterday_revenue) * 100, 1)
        growth_str = f"▲ {growth}%" if growth >= 0 else f"▼ {abs(growth)}%"
        is_positive = growth >= 0
    else:
        growth_str = "0.0%"
        is_positive = True

    # Inventory Stats
    products = db.query(Product).filter(Product.business_id == business_id).all()
    total_inventory_items = sum(p.current_stock for p in products)
    low_stock_count = sum(1 for p in products if p.current_stock < p.reorder_threshold)

    # Pending Collections
    customers = db.query(Customer).filter(Customer.business_id == business_id).all()
    total_dues = sum(c.outstanding_due for c in customers)
    due_customers_count = sum(1 for c in customers if c.outstanding_due > 0)

    # Agent Health Status
    one_minute_ago = (datetime.now() - timedelta(seconds=60)).isoformat()
    
    def get_agent_status(agent_type: str) -> str:
        recent_action = db.query(AgentAction).filter(
            AgentAction.business_id == business_id,
            AgentAction.agent_type == agent_type,
            AgentAction.created_at >= one_minute_ago
        ).first()
        return "Active" if recent_action else "Idle"

    return {
        "revenue": {
            "value": f"₹{today_revenue:,.2f}",
            "growth": growth_str,
            "is_positive": is_positive
        },
        "inventory": {
            "value": f"{total_inventory_items} Units",
            "low_stock_alert": f"⚠️ {low_stock_count} Low Stock" if low_stock_count > 0 else "All Stock Good",
            "low_stock_count": low_stock_count
        },
        "collections": {
            "value": f"₹{total_dues:,.2f}",
            "customer_count": f"{due_customers_count} Customers",
            "due_count": due_customers_count
        },
        "agents": {
            "restock": get_agent_status("restock"),
            "collections": get_agent_status("collections"),
            "winback": get_agent_status("winback"),
            "voice": get_agent_status("voice")
        }
    }

@router.get("/dashboard/charts")
def get_dashboard_charts(business_id: str, db: Session = Depends(get_db)):
    # Revenue last 7 days
    revenue_chart = []
    base_date = datetime.now()
    for i in range(6, -1, -1):
        day = base_date - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        orders = db.query(Order).filter(
            Order.business_id == business_id,
            Order.status == "completed",
            Order.created_at.like(f"{day_str}%")
        ).all()
        day_total = sum(o.total for o in orders)
        revenue_chart.append({
            "name": day.strftime("%a"),
            "Revenue": day_total
        })

    # Inventory levels
    products = db.query(Product).filter(Product.business_id == business_id).all()
    inventory_chart = [
        {"name": p.name.split(" ")[0], "Stock": p.current_stock, "Min": p.reorder_threshold}
        for p in products
    ]

    # Collections progress
    collections_chart = [
        {"name": "Week 1", "Due": 0, "Collected": 0},
        {"name": "Week 2", "Due": 0, "Collected": 0},
        {"name": "Week 3", "Due": 0, "Collected": 0}
    ]

    return {
        "revenue": revenue_chart,
        "inventory": inventory_chart,
        "collections": collections_chart
    }

@router.get("/actions")
def get_actions(business_id: str, db: Session = Depends(get_db)):
    actions = db.query(AgentAction).filter(
        AgentAction.business_id == business_id
    ).order_by(AgentAction.created_at.desc()).all()
    
    result = []
    for act in actions:
        try:
            payload = json.loads(act.action_taken)
        except Exception:
            payload = {"message": act.action_taken}
            
        result.append({
            "id": act.id,
            "agent_type": act.agent_type,
            "trigger_reason": act.trigger_reason,
            "action": payload,
            "mode": act.mode,
            "status": act.status,
            "language_source": act.language_source,
            "created_at": act.created_at
        })
    return result

# ----------------- FINANCIAL REPORTING -----------------

@router.get("/dashboard/financials")
def get_dashboard_financials(business_id: str, db: Session = Depends(get_db)):
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1).isoformat()
    
    # Fetch current month orders
    orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status == "completed",
        Order.created_at >= month_start
    ).all()
    
    monthly_revenue = sum(o.total for o in orders)
    
    # Calculate COGS
    monthly_cogs = 0.0
    products = db.query(Product).filter(Product.business_id == business_id).all()
    cost_map = {p.name: p.unit_cost for p in products}
    
    for order in orders:
        try:
            items_list = json.loads(order.items)
            for item in items_list:
                name = item.get("name")
                qty = int(item.get("qty", 1))
                unit_cost = cost_map.get(name, 0.0)
                if name not in cost_map:
                    unit_cost = float(item.get("price", 0.0)) * 0.5
                monthly_cogs += unit_cost * qty
        except Exception:
            pass

    monthly_profit = max(0.0, monthly_revenue - monthly_cogs)

    # Weekly Comparison
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    fourteen_days_ago = (now - timedelta(days=14)).isoformat()

    current_week_orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status == "completed",
        Order.created_at >= seven_days_ago
    ).all()
    
    prev_week_orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status == "completed",
        Order.created_at >= fourteen_days_ago,
        Order.created_at < seven_days_ago
    ).all()

    current_week_rev = sum(o.total for o in current_week_orders)
    prev_week_rev = sum(o.total for o in prev_week_orders)

    if prev_week_rev > 0:
        weekly_growth = round(((current_week_rev - prev_week_rev) / prev_week_rev) * 100, 1)
    else:
        weekly_growth = 0.0

    return {
        "monthly_revenue": f"₹{monthly_revenue:,.2f}",
        "monthly_cogs": f"₹{monthly_cogs:,.2f}",
        "monthly_profit": f"₹{monthly_profit:,.2f}",
        "current_week_revenue": f"₹{current_week_rev:,.2f}",
        "prev_week_revenue": f"₹{prev_week_rev:,.2f}",
        "weekly_comparison": {
            "growth_pct": weekly_growth,
            "label": f"₹{current_week_rev:,.2f} vs. ₹{prev_week_rev:,.2f} prev week",
            "is_positive": weekly_growth >= 0
        }
    }

# ----------------- ACTIONS EXECUTE CONFIRMATION -----------------

@router.post("/actions/{action_id}/execute-confirm")
def execute_action_confirm(action_id: str, data: dict = Body(...), db: Session = Depends(get_db)):
    action = db.query(AgentAction).filter(AgentAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    action.status = "executed"

    biz = db.query(Business).filter(Business.id == action.business_id).first()
    try:
        biz_config = json.loads(biz.config) if biz else {}
    except Exception:
        biz_config = {}

    email_sent = False
    recipient = "recipient@aura.ai"
    email_body = ""

    if action.agent_type == "restock":
        qty_received = int(data.get("qty_received", 50))
        actual_cost = float(data.get("actual_cost", 0.0))
        
        parts = action.trigger_reason.split("Product: ")
        if len(parts) > 1:
            prod_name = parts[1].split(".")[0].strip()
            product = db.query(Product).filter(
                Product.business_id == action.business_id,
                Product.name == prod_name
            ).first()
            if product:
                product.current_stock += qty_received
                if actual_cost > 0:
                    product.unit_cost = actual_cost / qty_received if qty_received > 0 else product.unit_cost
                
                supplier = db.query(Supplier).filter(Supplier.id == product.supplier_id).first()
                if supplier and supplier.contact_channel:
                    recipient = supplier.contact_channel
                    email_body = (
                        f"Purchase Order from {biz.name}\n\n"
                        f"Please deliver {qty_received} units of {product.name}.\n"
                        f"Agreed Purchase Cost: ₹{actual_cost:.2f}.\n\n"
                        f"Thank you,\n{biz.name}"
                    )
                    email_sent = send_business_email(
                        business_config=biz_config,
                        recipient=recipient,
                        subject=f"Purchase Order: {product.name} Restock",
                        body=email_body
                    )

    elif action.agent_type == "collections":
        amount_paid = float(data.get("amount_paid", 0.0))
        parts = action.trigger_reason.split("Customer: ")
        if len(parts) > 1:
            cust_name = parts[1].strip()
            customer = db.query(Customer).filter(
                Customer.business_id == action.business_id,
                Customer.name == cust_name
            ).first()
            if customer:
                customer.outstanding_due = max(0.0, customer.outstanding_due - amount_paid)
                
                if customer.contact_channel:
                    recipient = customer.contact_channel
                    email_body = (
                        f"Payment Received Confirmation - Thank You!\n\n"
                        f"Dear {customer.name},\n"
                        f"We have successfully received your payment of ₹{amount_paid:.2f}.\n"
                        f"Your remaining outstanding balance is ₹{customer.outstanding_due:.2f}.\n\n"
                        f"Warm Regards,\n{biz.name}"
                    )
                    email_sent = send_business_email(
                        business_config=biz_config,
                        recipient=recipient,
                        subject=f"Payment Receipt: ₹{amount_paid:.2f} received",
                        body=email_body
                    )

    elif action.agent_type == "custom_reminder":
        try:
            payload = json.loads(action.action_taken)
            recipient = payload.get("recipient")
            email_body = payload.get("message", "")
            
            # Extract title from trigger_reason
            subject_prefix = "Manual reminder set by owner: "
            title = action.trigger_reason.replace(subject_prefix, "") if action.trigger_reason.startswith(subject_prefix) else "AURA Reminder"
            subject = f"[AURA Reminder] {title}"
            
            email_sent = send_business_email(
                business_config=biz_config,
                recipient=recipient,
                subject=subject,
                body=email_body
            )
        except Exception as e:
            logger.error(f"Failed to execute custom reminder email: {e}")

    db.commit()
    return {
        "status": "success", 
        "message": f"Action {action_id} executed successfully",
        "email_sent": email_sent,
        "recipient": recipient
    }

@router.post("/actions/{action_id}/execute")
def execute_action(action_id: str, db: Session = Depends(get_db)):
    action = db.query(AgentAction).filter(AgentAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    
    try:
        payload = json.loads(action.action_taken)
    except Exception:
        payload = {}
        
    qty = payload.get("recommended_quantity", 50)
    due_amount = 0.0
    
    if action.agent_type == "collections":
        parts = action.trigger_reason.split("due of ₹")
        if len(parts) > 1:
            try:
                due_amount = float(parts[1].split(" ")[0])
            except Exception:
                due_amount = 500.0
        else:
            due_amount = 500.0

    return execute_action_confirm(
        action_id=action_id,
        data={
            "qty_received": qty,
            "actual_cost": qty * 80.0,
            "amount_paid": due_amount
        },
        db=db
    )

@router.post("/actions/{action_id}/ignore")
def ignore_action(action_id: str, db: Session = Depends(get_db)):
    action = db.query(AgentAction).filter(AgentAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    action.status = "ignored"
    db.commit()
    return {"status": "success", "message": f"Action {action_id} ignored"}

# ----------------- DEMO DYNAMIC HELPERS -----------------

@router.post("/demo/trigger-stock-drop")
def trigger_stock_drop(business_id: str, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.business_id == business_id).first()
    if not prod:
        raise HTTPException(status_code=400, detail="No products found. Please add a product first inside ERP Core.")
        
    prod.current_stock = max(0, prod.reorder_threshold - 3)
    db.commit()
    return {"status": "success", "message": f"Stock of {prod.name} dropped to {prod.current_stock} to trigger restock."}

@router.post("/demo/trigger-customer-due")
def trigger_customer_due(business_id: str, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.business_id == business_id).first()
    if not cust:
        raise HTTPException(status_code=400, detail="No customers found. Please add a customer first inside ERP Core.")
        
    cust.outstanding_due = 3200.0
    cust.consent_status = "opted_in"
    db.commit()
    return {"status": "success", "message": f"Outstanding dues of customer {cust.name} set to ₹{cust.outstanding_due}."}

@router.post("/demo/trigger-customer-churn")
def trigger_customer_churn(business_id: str, db: Session = Depends(get_db)):
    cust = db.query(Customer).filter(Customer.business_id == business_id).first()
    if not cust:
        raise HTTPException(status_code=400, detail="No customers found. Please add a customer first inside ERP Core.")
        
    cust.last_order_date = (datetime.now() - timedelta(days=45)).strftime("%Y-%m-%d")
    db.commit()
    return {"status": "success", "message": f"Last order date of customer {cust.name} set to 45 days ago."}

@router.post("/qa")
def ask_aura(data: dict = Body(...), db: Session = Depends(get_db)):
    question = data.get("question", "")
    business_id = data.get("business_id")

    products = db.query(Product).filter(Product.business_id == business_id).all()
    customers = db.query(Customer).filter(Customer.business_id == business_id).all()
    
    stock_context = ", ".join([f"{p.name} (Stock: {p.current_stock}, Min: {p.reorder_threshold})" for p in products])
    dues_context = ", ".join([f"{c.name} (Due: ₹{c.outstanding_due})" for c in customers if c.outstanding_due > 0])

    system_prompt = (
        "You are AURA AI Core, the business nervous system brain. "
        "Your task is to answer the store owner's questions accurately using the provided store data context. "
        "Keep your response concise, clear, and actionable. Ground your answer strictly in the facts provided."
    )

    user_prompt = (
        f"Store Data Context:\n"
        f"- Product Stock Levels: {stock_context or 'No Products'}\n"
        f"- Outstanding Customer Dues: {dues_context or 'No Outstanding Dues'}\n\n"
        f"Owner's Question: \"{question}\"\n"
        f"Answer:"
    )

    res, source = query_llm(system_prompt, user_prompt)
    
    if source == "template_fallback" or not res:
        q_lower = question.lower()
        if "stock" in q_lower or "inventory" in q_lower:
            low_stocks = [p.name for p in products if p.current_stock < p.reorder_threshold]
            if low_stocks:
                res = f"You have {len(low_stocks)} items low in stock: {', '.join(low_stocks)}. AURA has already drafted Restock Purchase Orders for them."
            else:
                res = "All products are currently above their reorder thresholds. Inventory looks healthy!"
        elif "due" in q_lower or "collection" in q_lower or "money" in q_lower:
            total_due = sum(c.outstanding_due for c in customers)
            due_list = [f"{c.name} (₹{c.outstanding_due})" for c in customers if c.outstanding_due > 0]
            if due_list:
                res = f"There is a total of ₹{total_due:,.2f} pending in outstanding collections across {len(due_list)} customers: {', '.join(due_list)}."
            else:
                res = "You have ₹0 pending collections. All customer accounts are settled!"
        else:
            res = "I analyzed your current store snapshot. There are no major operational anomalies detected."
            
    return {"answer": res, "language_source": source}

# ----------------- REFINED DUAL-SUMMARY RANGE SERVICE -----------------

@router.post("/insight/daily-summary")
def generate_daily_summary(req: DailySummaryRequest, db: Session = Depends(get_db)):
    business_id = req.business_id
    date_range_days = req.date_range_days

    range_start = (datetime.now() - timedelta(days=date_range_days)).isoformat()
    
    orders = db.query(Order).filter(
        Order.business_id == business_id,
        Order.status == "completed",
        Order.created_at >= range_start
    ).all()
    
    range_revenue = sum(o.total for o in orders)
    range_orders_count = len(orders)

    products = db.query(Product).filter(Product.business_id == business_id).all()
    customers = db.query(Customer).filter(Customer.business_id == business_id).all()

    low_stock_list = [p.name for p in products if p.current_stock < p.reorder_threshold]
    due_list = [f"{c.name} (₹{c.outstanding_due})" for c in customers if c.outstanding_due > 0]
    
    system_prompt = (
        "You are AURA Business Insight Agent. "
        "Analyze the business state and return a clean, highly professional daily brief. "
        "Keep it extremely concise (under 4 sentences) and list recommended actions. "
        "Use JSON format."
    )

    user_prompt = (
        f"Business State Snapshot (Last {date_range_days} Days):\n"
        f"- Revenue Generated: ₹{range_revenue:,.2f}\n"
        f"- Total Orders Completed: {range_orders_count}\n"
        f"- Items below reorder threshold: {', '.join(low_stock_list) if low_stock_list else 'None'}\n"
        f"- Customers with pending dues: {', '.join(due_list) if due_list else 'None'}\n\n"
        "Generate a structured daily summary JSON containing a friendly summary message and list of actionable recommendations."
    )

    schema = {
        "type": "object",
        "properties": {
            "summary_text": {"type": "string"},
            "recommendations": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["summary_text", "recommendations"]
    }

    res, source = query_llm(system_prompt, user_prompt, schema)

    if source == "template_fallback" or not res:
        summary = f"Summary over past {date_range_days} days: Gupta Groceries processed {range_orders_count} orders creating ₹{range_revenue:,.2f} in revenue. "
        recs = []
        if low_stock_list:
            summary += f"There are {len(low_stock_list)} items low in stock. "
            recs.append(f"Restock {low_stock_list[0]}")
        if due_list:
            summary += f"We have {len(due_list)} customer payment dues pending."
            recs.append(f"Send Reminder to {due_list[0].split(' ')[0]}")
            
        if not recs:
            summary += "Ledgers are fully cleared and inventory is healthy."
            recs = ["Check inventory list", "Track sales goals"]
            
        res = {
            "summary_text": summary,
            "recommendations": recs
        }

    return res

@router.post("/webhooks/voice")
def handle_voice_webhook(data: dict = Body(...), db: Session = Depends(get_db)):
    customer_name = data.get("customer_name", "Anonymous")
    transcript = data.get("transcript", "")
    business_id = data.get("business_id")
    
    if not business_id:
        raise HTTPException(status_code=400, detail="Missing business_id")

    parsed_order, source = parse_voice_booking(customer_name, transcript)

    customer = db.query(Customer).filter(
        Customer.business_id == business_id,
        Customer.name.like(f"%{customer_name}%")
    ).first()
    
    if not customer:
        customer = Customer(
            business_id=business_id,
            name=customer_name,
            contact_channel="+91 99999 88888",
            consent_status="opted_in",
            last_order_date=datetime.now().strftime("%Y-%m-%d"),
            outstanding_due=0.0
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    new_order = Order(
        business_id=business_id,
        customer_id=customer.id,
        items=json.dumps(parsed_order.get("items", [])),
        total=parsed_order.get("total_price", 150.0),
        status="completed",
        created_at=datetime.now().isoformat()
    )
    db.add(new_order)
    
    action = AgentAction(
        business_id=business_id,
        agent_type="voice",
        trigger_reason=f"Incoming voice call from {customer_name}: \"{transcript}\"",
        action_taken=json.dumps({
            "message": parsed_order.get("confirmation_message", f"Order booked for {customer_name}"),
            "items": parsed_order.get("items", []),
            "total": parsed_order.get("total_price", 150.0)
        }),
        mode="autopilot",
        status="executed",
        language_source=source,
        created_at=datetime.now().isoformat()
    )
    db.add(action)
    db.commit()

    return {
        "status": "success",
        "order_id": new_order.id,
        "agent_action_id": action.id,
        "confirmation_message": parsed_order.get("confirmation_message")
    }

@router.post("/reminders")
def create_reminder(data: dict = Body(...), db: Session = Depends(get_db)):
    business_id = data.get("business_id")
    title = data.get("title", "Custom Reminder")
    what_to_remind = data.get("what_to_remind", "")
    remind_who = data.get("remind_who", "Self")
    contact_channel = data.get("contact_channel", "")

    if not business_id or not what_to_remind or not contact_channel:
        raise HTTPException(status_code=400, detail="Missing required reminder fields")

    action = AgentAction(
        business_id=business_id,
        agent_type="custom_reminder",
        trigger_reason=f"Manual reminder set by owner: {title}",
        action_taken=json.dumps({
            "message": what_to_remind,
            "recipient": contact_channel,
            "type": remind_who
        }),
        mode="copilot",
        status="proposed",
        language_source="template_fallback",
        created_at=datetime.now().isoformat()
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    return {"status": "success", "reminder": action}
