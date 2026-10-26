from app.models.organization import Organization
from app.models.user import User
from app.models.workflow import Workflow
from app.models.workflow_step import WorkflowStep
from app.models.request import Request
from app.auth.password import hash_password


def create_user(db, organization_id, email, role):
    user = User(
        organization_id=organization_id,
        full_name=role.title(),
        email=email,
        password_hash=hash_password("TestPassword123!"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_workflow(db, organization_id):
    workflow = Workflow(
        organization_id=organization_id,
        name="Production Access",
        description="Manager then admin approval",
        is_active=True,
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    manager_step = WorkflowStep(
        workflow_id=workflow.id,
        step_order=1,
        name="Manager Approval",
        approver_role="manager",
    )

    admin_step = WorkflowStep(
        workflow_id=workflow.id,
        step_order=2,
        name="Admin Approval",
        approver_role="admin",
    )

    db.add_all([manager_step, admin_step])
    db.commit()

    return workflow


def create_request(db, organization_id, user_id, workflow_id):
    request = Request(
        organization_id=organization_id,
        created_by=user_id,
        title="Production Server Access",
        description="Need access for deployment",
        category="IT",
        priority="high",
        status="pending",
        workflow_id=workflow_id,
        current_step=1,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def login(client, email):
    response = client.post(
        "/auth/login",
        data={"username": email, "password": "TestPassword123!"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_manager_approval_moves_request_to_admin(
    client, db_session
):
    organization = Organization(
        name="Test Company",
        slug="test-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session, organization.id, "manager@test.com", "manager"
    )
    create_user(
        db_session, organization.id, "admin@test.com", "admin"
    )

    workflow = create_workflow(db_session, organization.id)
    request = create_request(
        db_session, organization.id, manager.id, workflow.id
    )

    token = login(client, "manager@test.com")

    response = client.post(
        f"/requests/{request.id}/approval",
        json={"decision": "approved", "comment": "Looks good"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201, response.text

    db_session.refresh(request)
    assert request.status == "pending"
    assert request.current_step == 2


def test_wrong_role_cannot_approve(client, db_session):
    organization = Organization(
        name="Test Company",
        slug="wrong-role-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    employee = create_user(
        db_session, organization.id, "employee@test.com", "employee"
    )
    create_user(db_session, organization.id, "manager2@test.com", "manager")

    workflow = create_workflow(db_session, organization.id)
    request = create_request(
        db_session, organization.id, employee.id, workflow.id
    )

    token = login(client, "employee@test.com")
    response = client.post(
        f"/requests/{request.id}/approval",
        json={"decision": "approved", "comment": "Trying to approve"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_rejection_rejects_request(client, db_session):
    organization = Organization(
        name="Rejection Company",
        slug="rejection-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session, organization.id, "manager3@test.com", "manager"
    )
    workflow = create_workflow(db_session, organization.id)
    request = create_request(
        db_session, organization.id, manager.id, workflow.id
    )

    token = login(client, "manager3@test.com")
    response = client.post(
        f"/requests/{request.id}/approval",
        json={"decision": "rejected", "comment": "Insufficient justification"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201, response.text

    db_session.refresh(request)
    assert request.status == "rejected"


def test_final_approval_completes_workflow(client, db_session):
    organization = Organization(
        name="Final Approval Company",
        slug="final-approval-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session, organization.id, "manager4@test.com", "manager"
    )
    admin = create_user(
        db_session, organization.id, "admin4@test.com", "admin"
    )
    workflow = create_workflow(db_session, organization.id)
    request = create_request(
        db_session, organization.id, manager.id, workflow.id
    )

    # First approval: manager
    manager_token = login(client, "manager4@test.com")
    response = client.post(
        f"/requests/{request.id}/approval",
        json={"decision": "approved", "comment": "Manager approved"},
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert response.status_code == 201, response.text

    # Second approval: admin
    admin_token = login(client, "admin4@test.com")
    response = client.post(
        f"/requests/{request.id}/approval",
        json={"decision": "approved", "comment": "Admin approved"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201, response.text

    db_session.refresh(request)
    assert request.status == "approved"


def test_approval_history_is_saved(client, db_session):
    organization = Organization(
        name="History Company",
        slug="history-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session, organization.id, "manager5@test.com", "manager"
    )
    workflow = create_workflow(db_session, organization.id)
    request = create_request(
        db_session, organization.id, manager.id, workflow.id
    )

    token = login(client, "manager5@test.com")
    response = client.post(
        f"/requests/{request.id}/approval",
        json={"decision": "approved", "comment": "Approved for testing"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201, response.text

    history_response = client.get(
        f"/requests/{request.id}/approvals",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert history_response.status_code == 200, history_response.text
    history = history_response.json()
    assert len(history) == 1
    assert history[0]["decision"] == "approved"
    assert history[0]["comment"] == "Approved for testing"


def test_user_cannot_access_another_organization_request(
    client, db_session
):
    organization_a = Organization(
        name="Company A",
        slug="company-a",
        is_active=True,
    )
    organization_b = Organization(
        name="Company B",
        slug="company-b",
        is_active=True,
    )

    db_session.add_all([organization_a, organization_b])
    db_session.commit()
    db_session.refresh(organization_a)
    db_session.refresh(organization_b)

    user_a = create_user(
        db_session, organization_a.id, "alice@company-a.com", "employee"
    )
    user_b = create_user(
        db_session, organization_b.id, "bob@company-b.com", "employee"
    )

    request_b = Request(
        organization_id=organization_b.id,
        created_by=user_b.id,
        title="Company B Confidential Request",
        description="Private company information",
        category="IT",
        priority="high",
        status="pending",
        workflow_id=None,
        current_step=1,
    )
    db_session.add(request_b)
    db_session.commit()
    db_session.refresh(request_b)

    token_a = login(client, "alice@company-a.com")

    response = client.get(
        f"/requests/{request_b.id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )

    assert response.status_code == 404


def test_request_list_only_shows_own_organization(
    client, db_session
):
    organization_a = Organization(
        name="List Company A",
        slug="list-company-a",
        is_active=True,
    )
    organization_b = Organization(
        name="List Company B",
        slug="list-company-b",
        is_active=True,
    )

    db_session.add_all([organization_a, organization_b])
    db_session.commit()
    db_session.refresh(organization_a)
    db_session.refresh(organization_b)

    user_a = create_user(
        db_session, organization_a.id, "list-a@test.com", "employee"
    )
    user_b = create_user(
        db_session, organization_b.id, "list-b@test.com", "employee"
    )

    request_a = create_request(
        db_session, organization_a.id, user_a.id, None
    )
    create_request(
        db_session, organization_b.id, user_b.id, None
    )

    token_a = login(client, "list-a@test.com")

    response = client.get(
        "/requests",
        headers={"Authorization": f"Bearer {token_a}"},
    )

    assert response.status_code == 200, response.text
    requests = response.json()

    assert len(requests) == 1
    assert requests[0]["id"] == request_a.id
    assert requests[0]["organization_id"] == organization_a.id


def test_user_cannot_approve_another_organization_request(
    client, db_session
):
    organization_a = Organization(
        name="Approval Company A",
        slug="approval-company-a",
        is_active=True,
    )
    organization_b = Organization(
        name="Approval Company B",
        slug="approval-company-b",
        is_active=True,
    )

    db_session.add_all([organization_a, organization_b])
    db_session.commit()
    db_session.refresh(organization_a)
    db_session.refresh(organization_b)

    user_a = create_user(
        db_session, organization_a.id, "approver-a@test.com", "manager"
    )
    user_b = create_user(
        db_session, organization_b.id, "requester-b@test.com", "employee"
    )

    workflow_b = create_workflow(db_session, organization_b.id)
    request_b = create_request(
        db_session, organization_b.id, user_b.id, workflow_b.id
    )

    token_a = login(client, "approver-a@test.com")

    response = client.post(
        f"/requests/{request_b.id}/approval",
        json={"decision": "approved", "comment": "Unauthorized attempt"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    assert response.status_code == 404, response.text

def test_same_approver_cannot_approve_same_step_twice(
    client, db_session
):
    organization = Organization(
        name="Duplicate Approval Company",
        slug="duplicate-approval-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session,
        organization.id,
        "duplicate-manager@test.com",
        "manager",
    )

    workflow = create_workflow(db_session, organization.id)
    request = create_request(
        db_session, organization.id, manager.id, workflow.id
    )

    token = login(client, "duplicate-manager@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "decision": "approved",
        "comment": "Manager approved",
    }

    first_response = client.post(
        f"/requests/{request.id}/approval",
        json=payload,
        headers=headers,
    )
    assert first_response.status_code == 201, first_response.text

    second_response = client.post(
        f"/requests/{request.id}/approval",
        json=payload,
        headers=headers,
    )

    assert second_response.status_code == 409, second_response.text

def test_request_creation_rejects_nonexistent_workflow(
    client, db_session
):
    organization = Organization(
        name="Request Validation Company",
        slug="request-validation-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    employee = create_user(
        db_session,
        organization.id,
        "request-validation@test.com",
        "employee",
    )

    token = login(client, "request-validation@test.com")

    response = client.post(
        "/requests",
        json={
            "title": "Laptop Request",
            "description": "I need a laptop for development",
            "category": "IT",
            "priority": "medium",
            "workflow_id": 999999,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404, response.text

def test_request_creation_rejects_another_organizations_workflow(
    client, db_session
):
    organization_a = Organization(
        name="Workflow Owner A",
        slug="workflow-owner-a",
        is_active=True,
    )
    organization_b = Organization(
        name="Workflow Owner B",
        slug="workflow-owner-b",
        is_active=True,
    )

    db_session.add_all([organization_a, organization_b])
    db_session.commit()
    db_session.refresh(organization_a)
    db_session.refresh(organization_b)

    employee_a = create_user(
        db_session,
        organization_a.id,
        "employee-a-workflow@test.com",
        "employee",
    )

    workflow_b = create_workflow(
        db_session, organization_b.id
    )

    token = login(client, "employee-a-workflow@test.com")

    response = client.post(
        "/requests",
        json={
            "title": "Access Request",
            "description": "Requesting access to a system",
            "category": "IT",
            "priority": "medium",
            "workflow_id": workflow_b.id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404, response.text

def test_request_creation_rejects_inactive_workflow(
    client, db_session
):
    organization = Organization(
        name="Inactive Workflow Company",
        slug="inactive-workflow-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    employee = create_user(
        db_session,
        organization.id,
        "inactive-workflow-user@test.com",
        "employee",
    )

    workflow = create_workflow(db_session, organization.id)
    workflow.is_active = False
    db_session.commit()

    token = login(client, "inactive-workflow-user@test.com")

    response = client.post(
        "/requests",
        json={
            "title": "Software Access Request",
            "description": "Requesting access to development software",
            "category": "IT",
            "priority": "medium",
            "workflow_id": workflow.id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404, response.text

def test_request_creation_with_valid_workflow(
    client, db_session
):
    organization = Organization(
        name="Valid Workflow Company",
        slug="valid-workflow-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    employee = create_user(
        db_session,
        organization.id,
        "valid-workflow-user@test.com",
        "employee",
    )

    workflow = create_workflow(db_session, organization.id)
    token = login(client, "valid-workflow-user@test.com")

    response = client.post(
        "/requests",
        json={
            "title": "Development Laptop",
            "description": "Need a laptop for software development",
            "category": "IT",
            "priority": "high",
            "workflow_id": workflow.id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201, response.text

    data = response.json()
    assert data["organization_id"] == organization.id
    assert data["created_by"] == employee.id
    assert data["workflow_id"] == workflow.id
    assert data["current_step"] == 1
    assert data["status"] == "pending"

def test_status_update_rejects_invalid_status(client, db_session):
    organization = Organization(
        name="Status Validation Company",
        slug="status-validation-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session,
        organization.id,
        "status-manager@test.com",
        "manager",
    )

    request = create_request(
        db_session, organization.id, manager.id, None
    )

    token = login(client, "status-manager@test.com")

    response = client.patch(
        f"/requests/{request.id}/status",
        json={"status": "banana"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422, response.text

def test_status_update_cannot_bypass_approval_workflow(client, db_session):
    organization = Organization(
        name="Workflow Status Company",
        slug="workflow-status-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session,
        organization.id,
        "workflow-status-manager@test.com",
        "manager",
    )

    workflow = create_workflow(db_session, organization.id)
    request = create_request(
        db_session,
        organization.id,
        manager.id,
        workflow.id,
    )

    token = login(client, "workflow-status-manager@test.com")

    response = client.patch(
        f"/requests/{request.id}/status",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409, response.text


def test_completed_request_cannot_be_reopened_by_status_endpoint(
    client, db_session
):
    organization = Organization(
        name="Completed Request Company",
        slug="completed-request-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session,
        organization.id,
        "completed-manager@test.com",
        "manager",
    )

    request = create_request(
        db_session,
        organization.id,
        manager.id,
        None,
    )
    request.status = "approved"
    db_session.commit()
    db_session.refresh(request)

    token = login(client, "completed-manager@test.com")

    response = client.patch(
        f"/requests/{request.id}/status",
        json={"status": "pending"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409, response.text

def test_workflow_step_rejects_zero_step_order(client, db_session):
    organization = Organization(
        name="Step Validation Company",
        slug="step-validation-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session,
        organization.id,
        "step-validation-manager@test.com",
        "manager",
    )

    workflow = create_workflow(db_session, organization.id)
    token = login(client, "step-validation-manager@test.com")

    response = client.post(
        f"/workflows/{workflow.id}/steps",
        json={
            "name": "Invalid Step",
            "step_order": 0,
            "approver_role": "admin",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422, response.text

def test_workflow_rejects_duplicate_step_order(client, db_session):
    organization = Organization(
        name="Duplicate Step Company",
        slug="duplicate-step-company",
        is_active=True,
    )
    db_session.add(organization)
    db_session.commit()
    db_session.refresh(organization)

    manager = create_user(
        db_session,
        organization.id,
        "duplicate-step-manager@test.com",
        "manager",
    )

    workflow = create_workflow(db_session, organization.id)
    token = login(client, "duplicate-step-manager@test.com")

    response = client.post(
        f"/workflows/{workflow.id}/steps",
        json={
            "name": "Duplicate Manager Step",
            "step_order": 1,
            "approver_role": "manager",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409, response.text
