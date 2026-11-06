from flask import Flask, jsonify, request
from flask_cors import CORS

import os
from dotenv import load_dotenv
from supabase import create_client

# import smtplib
import base64
from email.message import EmailMessage

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

load_dotenv()

# Initialize Flask application
app = Flask(__name__)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
).rstrip("/")

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                FRONTEND_URL
            ]
        }
    },
    methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")

# create Supabase connection 
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# def send_email(to_email, subject, body):

#     gmail_user = os.getenv("GMAIL_USER")
#     gmail_password = os.getenv("GMAIL_APP_PASSWORD")

#     if not gmail_user or not gmail_password:
#         raise ValueError("Gmail credentials are missing")

#     message = EmailMessage()

#     message["From"] = gmail_user
#     message["To"] = to_email
#     message["Subject"] = subject

#     message.set_content(body)

#     with smtplib.SMTP("smtp.gmail.com", 587) as server:
#         server.starttls()
#         server.login(gmail_user, gmail_password)
#         server.send_message(message)


def send_email(to_email, subject, body):

    client_id = os.getenv("GMAIL_CLIENT_ID")
    client_secret = os.getenv("GMAIL_CLIENT_SECRET")
    refresh_token = os.getenv("GMAIL_REFRESH_TOKEN")
    gmail_user = os.getenv("GMAIL_USER")

    # Gmail Credentials
    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=["https://www.googleapis.com/auth/gmail.send"]
    )

    # Generate Access Token
    credentials.refresh(Request())

    # Connect Gmail API
    service = build(
        "gmail",
        "v1",
        credentials=credentials,
        cache_discovery=False
    )

    # Create Email
    message = EmailMessage()

    message["To"] = to_email
    message["From"] = gmail_user
    message["Subject"] = subject

    message.set_content(body)

    # Encode Email
    encoded_message = base64.urlsafe_b64encode(
        message.as_bytes()
    ).decode()

    # Send Email
    service.users().messages().send(
        userId="me",
        body={"raw": encoded_message}
    ).execute()

def get_logged_in_user():
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None, None

    access_token = auth_header.split(" ")[1]

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    response = client.auth.get_user(access_token)

    user = response.user

    if not user:
        return None, None

    client.postgrest.auth(access_token)

    return client, user

# Health Check API
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "success",
        "message": "Flask Backend is Running!"
    })


# Supabase connection testt 
@app.route("/api/supabase-test", methods=["GET"])
def supabase_test():
    try:
        response = supabase.table("profiles").select("id").limit(1).execute()

        return jsonify({
            "status": "success",
            "message": 'Supabase Connected Successfully!'
        })

    except Exception as error:
        return jsonify({
            "status" : "error",
            "message": str(error)
        }), 500

@app.route("/api/profile", methods=["POST"])
def save_profile():
    try:
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({
                "message": "Access token missing"
            }), 401
        access_token = auth_header.split(" ")[1]

        user_supabase = create_client(
            SUPABASE_URL, SUPABASE_KEY
        )

        auth_response = user_supabase.auth.get_user(access_token)
        user = auth_response.user

        if not user:
            return jsonify({
                "message": "invalid user"
            }), 401

        user_data = user.user_metadata or {}

        profile = {
            "id": user.id,
            "full_name": user_data.get("full_name") or user_data.get("name"),
            "email": user.email,
            "avatar_url": user_data.get("avatar_url") or user_data.get("picture")
        }

        user_supabase.postgrest.auth(token=access_token)

        user_supabase.table("profiles").upsert(
            profile,
            on_conflict="id"
        ).execute()

        return jsonify({
            "status": "success",
            "message": "Profile saved successfully!"
        })

    except Exception as error:
        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500

@app.route("/api/tasks", methods=["POST"])
def create_task():

    try:
        client, user = get_logged_in_user()

        if not user:
            return jsonify({"message": "Unauthorized"}), 401

        data = request.get_json() or {}

        title = data.get("title")
        description = data.get("description")
        assigned_to = data.get("assigned_to") or None

        priority = data.get("priority", "medium").lower()
        due_date = data.get("due_date") or None

        if priority not in ["low", "medium", "high"]:
            return jsonify({
                "message": "Invalid priority"
            }), 400

        if not title:
            return jsonify({"message": "Task title is required"}), 400

        task = {
            "title": title,
            "description": description,
            "created_by": user.id,
            "assigned_to": assigned_to,
            "priority": priority,
            "due_date": due_date
        }

        response = client.table("tasks").insert(task).execute()

        created_task = response.data[0]

        # Default recipient: task creator
        recipient_email = user.email
        recipient_name = "User"
        subject = "Your task has been created"

        # If task is assigned, notify assigned user
        if assigned_to:

            user_response = client.table("profiles") \
                .select("email, full_name") \
                .eq("id", assigned_to) \
                .execute()

            if user_response.data:
                recipient_email = user_response.data[0]["email"]
                recipient_name = user_response.data[0]["full_name"] or "User"
                subject = "New Task Assigned to You"

        body = f"""
Hello {recipient_name},

A new task has been created for you.

Task: {title}

Description: {description or "No description"}

Please login to your Task Management application.

Thank you!
"""

        email_sent = False

        try:
            send_email(recipient_email, subject, body)
            email_sent = True

        except Exception:
            app.logger.exception("TASK EMAIL FAILED")

        message = (
            "Task created and email sent!"
            if email_sent
            else "Task created, but email could not be sent."
        )

        return jsonify({
            "status": "success",
            "message": message,
            "email_sent": email_sent,
            "task": created_task
        }), 201

    except Exception as error:

        app.logger.exception("CREATE TASK ERROR")

        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500


@app.route("/api/tasks", methods=["GET"])
def get_tasks():

    try:
        client , user = get_logged_in_user()

        if not user :
            return jsonify({ "message" : "Unauthorized"}), 401

        response = client.table("tasks")\
            .select("*")\
            .order("created_at", desc=True)\
            .execute()

        return jsonify({
            "status": "success",
            "tasks": response.data
        })

    except Exception as error:

        app.logger.exception("CREATE TASK ERROR")

        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500


@app.route("/api/users", methods=["GET"])
def get_users():
    try:
        client , user = get_logged_in_user()

        if not user:
            return jsonify({
                "message": "Unauthorized"
            }), 401

        response = client.table("profiles") \
            .select("id, full_name, email") \
            .execute()

        return jsonify({
            "status": "success",
            "users": response.data
        })

    except Exception as error:
        app.logger.exception("GET USERS ERROR")

        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500

@app.route("/api/tasks/<task_id>/complete", methods=["POST"])
def complete_task(task_id):

    try:
        client, user = get_logged_in_user()

        if not user:
            return jsonify({"message": "Unauthorized"}), 401

        # Update task status
        response = client.table("tasks") \
            .update({"status": "completed"}) \
            .eq("id", task_id) \
            .eq("status", "pending") \
            .select("*") \
            .execute()

        if not response.data:
            return jsonify({
                "message": "Task not found or already completed"
            }), 404

        completed_task = response.data[0]

        # Get task creator details
        creator_response = client.table("profiles") \
            .select("email, full_name") \
            .eq("id", completed_task["created_by"]) \
            .execute()

        email_sent = False

        if creator_response.data:

            creator = creator_response.data[0]

            body = f"""
Hello {creator["full_name"] or "User"},

Your task has been completed.

Task: {completed_task["title"]}

Completed by: {user.email}

Thank you!
"""

            try:
                send_email(
                    creator["email"],
                    "Task Completed Notification",
                    body
                )

                email_sent = True

            except Exception:
                app.logger.exception("COMPLETION EMAIL FAILED")

        message = (
            "Task completed and email sent!"
            if email_sent
            else "Task completed, but email could not be sent."
        )

        return jsonify({
            "status": "success",
            "message": message,
            "email_sent": email_sent
        })

    except Exception as error:

        app.logger.exception("COMPLETE TASK ERROR")

        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500


@app.route("/api/tasks/<task_id>/assign", methods=["PATCH"])
def assign_task(task_id):

    try:
        client, user = get_logged_in_user()

        if not user:
            return jsonify({"message": "Unauthorized"}), 401

        data = request.get_json() or {}
        assigned_to = data.get("assigned_to") or None

        # Get existing task
        task_response = client.table("tasks") \
            .select("*") \
            .eq("id", task_id) \
            .execute()

        if not task_response.data:
            return jsonify({"message": "Task not found"}), 404

        task = task_response.data[0]

        # Only creator can change assignment
        if task["created_by"] != user.id:
            return jsonify({
                "message": "Only task creator can change assignment"
            }), 403

        old_assigned_to = task["assigned_to"]

        # Check selected user
        recipient = None

        if assigned_to:
            user_response = client.table("profiles") \
                .select("id, full_name, email") \
                .eq("id", assigned_to) \
                .execute()

            if not user_response.data:
                return jsonify({"message": "User not found"}), 404

            recipient = user_response.data[0]

        # Update assignment
        client.table("tasks") \
            .update({"assigned_to": assigned_to}) \
            .eq("id", task_id) \
            .execute()

        email_sent = False

        # Send email only when assigned to a different user
        if assigned_to and assigned_to != old_assigned_to:

            recipient_name = recipient["full_name"] or "User"

            body = f"""
Hello {recipient_name},

A task has been assigned to you.

Task: {task["title"]}

Description: {task["description"] or "No description"}

Assigned by: {user.email}

Please login to your Task Management application.

Thank you!
"""

            try:
                send_email(
                    recipient["email"],
                    "New Task Assigned to You",
                    body
                )

                email_sent = True

            except Exception:
                app.logger.exception("REASSIGNMENT EMAIL FAILED")

        if assigned_to is None:
            message = "Task unassigned successfully!"

        elif email_sent:
            message = "Task reassigned and notification email sent!"

        else:
            message = "Task reassigned, but email could not be sent."

        return jsonify({
            "status": "success",
            "message": message,
            "email_sent": email_sent
        })

    except Exception as error:

        app.logger.exception("ASSIGN TASK ERROR")

        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500

@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):

    try:
        client, user = get_logged_in_user()

        if not user:
            return jsonify({"message": "Unauthorized"}), 401

        client.table("tasks") \
            .delete() \
            .eq("id", task_id) \
            .execute()

        return jsonify({
            "status": "success",
            "message": "Task deleted successfully!"
        })

    except Exception as error:

        app.logger.exception("DELETE TASK ERROR")

        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500


@app.route("/api/tasks/<task_id>/priority", methods=["PATCH"])
def update_task_priority(task_id):

    try:
        client, user = get_logged_in_user()

        if not user:
            return jsonify({"message": "Unauthorized"}), 401

        data = request.get_json() or {}
        priority = data.get("priority")

        if priority not in ["low", "medium", "high"]:
            return jsonify({
                "message": "Invalid priority"
            }), 400

        # Check task ownership
        task_response = client.table("tasks") \
            .select("created_by, status") \
            .eq("id", task_id) \
            .execute()

        if not task_response.data:
            return jsonify({"message": "Task not found"}), 404

        task = task_response.data[0]

        if task["created_by"] != user.id:
            return jsonify({
                "message": "Only task creator can change priority"
            }), 403

        if task["status"] == "completed":
            return jsonify({
                "message": "Completed task priority cannot be changed"
            }), 400

        client.table("tasks") \
            .update({"priority": priority}) \
            .eq("id", task_id) \
            .execute()

        return jsonify({
            "status": "success",
            "message": "Priority updated successfully!"
        })

    except Exception as error:

        app.logger.exception("UPDATE PRIORITY ERROR")

        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500


@app.route("/api/tasks/<task_id>/due-date", methods=["PATCH"])
def update_task_due_date(task_id):

    try:
        client, user = get_logged_in_user()

        if not user:
            return jsonify({"message": "Unauthorized"}), 401

        data = request.get_json() or {}
        due_date = data.get("due_date") or None

        # Check task
        task_response = client.table("tasks") \
            .select("created_by, status") \
            .eq("id", task_id) \
            .execute()

        if not task_response.data:
            return jsonify({"message": "Task not found"}), 404

        task = task_response.data[0]

        if task["created_by"] != user.id:
            return jsonify({
                "message": "Only task creator can change deadline"
            }), 403

        if task["status"] == "completed":
            return jsonify({
                "message": "Completed task deadline cannot be changed"
            }), 400

        # Update due date
        client.table("tasks") \
            .update({"due_date": due_date}) \
            .eq("id", task_id) \
            .execute()

        return jsonify({
            "status": "success",
            "message": "Deadline updated successfully!"
        })

    except Exception as error:

        app.logger.exception("UPDATE DEADLINE ERROR")

        return jsonify({
            "status": "error",
            "message": str(error)
        }), 500
    
# Start Flask Server
if __name__ == "__main__":
    app.run(debug=True, port=5000)