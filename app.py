import os

from flask import Flask, jsonify, redirect, render_template, request, url_for
from mongoengine import (
    CASCADE,
    DateTimeField,
    Document,
    EmailField,
    FloatField,
    IntField,
    ReferenceField,
    StringField,
    ValidationError,
    connect,
    DoesNotExist,
)
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv
from datetime import datetime


load_dotenv()


# MongoDB connection settings
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "stockboard")
MONGODB_HOST = os.getenv("MONGODB_HOST", "localhost")
MONGODB_PORT = int(os.getenv("MONGODB_PORT", 27017))


if MONGODB_URI:
    connect(host=MONGODB_URI)
    print(f"Connected to MongoDB using URI: {MONGODB_URI}")
else:
    connect(db=MONGODB_DB, host=MONGODB_HOST, port=MONGODB_PORT)
    print(f"Connected to MongoDB on {MONGODB_HOST}:{MONGODB_PORT}, db={MONGODB_DB}")


class User(Document):
    email = EmailField(required=True, unique=True)
    password_hash = StringField(required=True)
    full_name = StringField(max_length=120)
    role = StringField(default="user")

    meta = {
        "collection": "users",
        "indexes": ["email"],
    }

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Category(Document):
    name = StringField(required=True, unique=True, max_length=120)
    description = StringField(max_length=500)
    status = StringField(default="active", choices=["active", "inactive"])
    created_at = DateTimeField(required=True)

    meta = {
        "collection": "categories",
        "indexes": ["name"],
        "ordering": ["name"],
    }

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Product(Document):
    name = StringField(required=True, max_length=180)
    sku = StringField(required=True, unique=True, max_length=60)
    category = ReferenceField(Category, reverse_delete_rule=CASCADE)
    quantity = IntField(default=0)
    price = FloatField(default=0.0)
    status = StringField(default="in stock", choices=["in stock", "low stock", "out of stock"])
    supplier = StringField(max_length=180)
    description = StringField(max_length=1000)
    created_at = DateTimeField(required=True)

    meta = {
        "collection": "products",
        "indexes": ["sku", "name"],
        "ordering": ["-created_at"],
    }

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "sku": self.sku,
            "category": self.category.to_dict() if self.category else None,
            "quantity": self.quantity,
            "price": self.price,
            "status": self.status,
            "supplier": self.supplier,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-me")


@app.route("/")
def index():
    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("register.html")

    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name", "")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required."}), 400

    if User.objects(email=email).first():
        return jsonify({"success": False, "error": "Email already registered."}), 409

    user = User(email=email, full_name=full_name)
    user.set_password(password)
    user.save()

    return jsonify({"success": True, "message": "User registered successfully."}), 201


@app.route("/api/categories", methods=["GET"])
def get_categories():
    categories = [category.to_dict() for category in Category.objects()]
    return jsonify({"success": True, "categories": categories})


@app.route("/api/categories/<string:category_id>", methods=["GET"])
def get_category(category_id):
    try:
        category = Category.objects.get(id=category_id)
        return jsonify({"success": True, "category": category.to_dict()})
    except (DoesNotExist, ValidationError):
        return jsonify({"success": False, "error": "Category not found."}), 404


@app.route("/api/categories", methods=["POST"])
def create_category():
    data = request.get_json() or {}
    name = data.get("name")
    description = data.get("description", "")
    status = data.get("status", "active")

    if not name:
        return jsonify({"success": False, "error": "Category name is required."}), 400

    if Category.objects(name=name).first():
        return jsonify({"success": False, "error": "Category already exists."}), 409

    category = Category(
        name=name,
        description=description,
        status=status,
        created_at=datetime.utcnow(),
    )
    category.save()
    return jsonify({"success": True, "category": category.to_dict()}), 201


@app.route("/api/categories/<string:category_id>", methods=["PUT"])
def update_category(category_id):
    data = request.get_json() or {}
    try:
        category = Category.objects.get(id=category_id)
    except (DoesNotExist, ValidationError):
        return jsonify({"success": False, "error": "Category not found."}), 404

    category.name = data.get("name", category.name)
    category.description = data.get("description", category.description)
    category.status = data.get("status", category.status)
    category.save()
    return jsonify({"success": True, "category": category.to_dict()})


@app.route("/api/categories/<string:category_id>", methods=["DELETE"])
def delete_category(category_id):
    try:
        category = Category.objects.get(id=category_id)
    except (DoesNotExist, ValidationError):
        return jsonify({"success": False, "error": "Category not found."}), 404

    category.delete()
    return jsonify({"success": True, "message": "Category deleted."})


@app.route("/api/products", methods=["GET"])
def get_products():
    filters = {}
    category_id = request.args.get("category_id")
    status = request.args.get("status")
    search = request.args.get("search")

    if category_id:
        filters["category"] = category_id
    if status:
        filters["status__iexact"] = status
    if search:
        filters["name__icontains"] = search

    products = [product.to_dict() for product in Product.objects(**filters)]
    return jsonify({"success": True, "products": products})


@app.route("/api/products/<string:product_id>", methods=["GET"])
def get_product(product_id):
    try:
        product = Product.objects.get(id=product_id)
        return jsonify({"success": True, "product": product.to_dict()})
    except (DoesNotExist, ValidationError):
        return jsonify({"success": False, "error": "Product not found."}), 404


@app.route("/api/products", methods=["POST"])
def create_product():
    data = request.get_json() or {}
    name = data.get("name")
    sku = data.get("sku")
    category_id = data.get("category_id")
    quantity = data.get("quantity", 0)
    price = data.get("price", 0.0)
    status = data.get("status", "in stock")
    supplier = data.get("supplier", "")
    description = data.get("description", "")

    if not name or not sku:
        return jsonify({"success": False, "error": "Product name and SKU are required."}), 400

    if Product.objects(sku=sku).first():
        return jsonify({"success": False, "error": "SKU already exists."}), 409

    category = None
    if category_id:
        try:
            category = Category.objects.get(id=category_id)
        except (DoesNotExist, ValidationError):
            return jsonify({"success": False, "error": "Category not found."}), 404

    product = Product(
        name=name,
        sku=sku,
        category=category,
        quantity=int(quantity),
        price=float(price),
        status=status,
        supplier=supplier,
        description=description,
        created_at=datetime.utcnow(),
    )
    product.save()
    return jsonify({"success": True, "product": product.to_dict()}), 201


@app.route("/api/products/<string:product_id>", methods=["PUT"])
def update_product(product_id):
    data = request.get_json() or {}
    try:
        product = Product.objects.get(id=product_id)
    except (DoesNotExist, ValidationError):
        return jsonify({"success": False, "error": "Product not found."}), 404

    if data.get("sku") and data["sku"] != product.sku:
        if Product.objects(sku=data["sku"]).first():
            return jsonify({"success": False, "error": "SKU already exists."}), 409
        product.sku = data["sku"]

    if data.get("category_id"):
        try:
            product.category = Category.objects.get(id=data["category_id"])
        except (DoesNotExist, ValidationError):
            return jsonify({"success": False, "error": "Category not found."}), 404

    product.name = data.get("name", product.name)
    product.quantity = int(data.get("quantity", product.quantity))
    product.price = float(data.get("price", product.price))
    product.status = data.get("status", product.status)
    product.supplier = data.get("supplier", product.supplier)
    product.description = data.get("description", product.description)
    product.save()
    return jsonify({"success": True, "product": product.to_dict()})


@app.route("/api/products/<string:product_id>", methods=["DELETE"])
def delete_product(product_id):
    try:
        product = Product.objects.get(id=product_id)
    except (DoesNotExist, ValidationError):
        return jsonify({"success": False, "error": "Product not found."}), 404

    product.delete()
    return jsonify({"success": True, "message": "Product deleted."})


@app.route("/signIn", methods=["POST"])
def sign_in():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required."}), 400

    user = User.objects(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    return jsonify({"success": True, "message": "Login successful.", "user": {"email": user.email, "full_name": user.full_name, "role": user.role}})


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


@app.route("/products")
def products():
    return render_template("products-inventory.html")


@app.route("/add-product")
def add_product():
    return render_template("add-product.html")


@app.route("/alerts")
def alerts():
    return render_template("alertpage.html")


@app.route("/categories")
def categories():
    return render_template("categories.html")


@app.route("/settings")
def settings():
    return render_template("setting.html")


if __name__ == "__main__":
    app.run(debug=True)
