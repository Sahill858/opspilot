
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from app.auth.password import hash_password
from app.database.dependencies import get_db
from app.main import app
from app.models.approval import Approval
from app.models.organization import Organization
from app.models.request import Request
from app.models.user import User
from app.models.workflow import Workflow
from app.models.workflow_step import WorkflowStep


@pytest.fixture(scope="session")
def postgres_test_engine():
    database_url = os.environ.get("OPSPILOT_TEST_DATABASE_URL")

    if not database_url:
        pytest.skip(
            "Set OPSPILOT_TEST_DATABASE_URL to run PostgreSQL integration tests"
        )

    url = make_url(database_url)

    # Safety guard: never run integration tests against the app database.
    if url.database != "opspilot_test_db":
        pytest.fail(
            "Safety check failed: PostgreSQL integration tests must use "
            "'opspilot_test_db'."
        )

    if url.drivername != "postgresql+psycopg":
        pytest.fail(
            "Expected the PostgreSQL SQLAlchemy driver 'postgresql+psycopg'."
        )

    engine = create_engine(url, pool_pre_ping=True)

    try:
        # Verify the actual connection points to the intended database.
        with engine.connect() as connection:
            actual_database = connection.exec_driver_sql(
                "SELECT current_database()"
            ).scalar_one()

            if actual_database != "opspilot_test_db":
                pytest.fail(
                    "Connected database does not match 'opspilot_test_db'."
                )

        yield engine
    finally:
        engine.dispose()

def test_postgres_connection_uses_dedicated_test_database(
    postgres_test_engine,
):
    with postgres_test_engine.connect() as connection:
        database_name = connection.exec_driver_sql(
            "SELECT current_database()"
        ).scalar_one()

    assert database_name == "opspilot_test_db"

@pytest.fixture
def postgres_client(postgres_test_engine):
    TestingSessionLocal = sessionmaker(
        bind=postgres_test_engine,
        autoflush=False,
        autocommit=False,
    )

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)

def test_postgres_manager_approval_advances_workflow(
    postgres_test_engine,
    postgres_client,
):
    TestingSessionLocal = sessionmaker(
        bind=postgres_test_engine,
        autoflush=False,
        autocommit=False,
    )

    suffix = uuid4().hex[:12]
    db = TestingSessionLocal()
    organization_id = None

    try:
        organization = Organization(
            name="Integration Test Company",
            slug=f"integration-{suffix}",
            is_active=True,
        )
        db.add(organization)
        db.commit()
        db.refresh(organization)
        organization_id = organization.id

        manager = User(
            organization_id=organization.id,
            full_name="Test Manager",
            email=f"manager-{suffix}@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="manager",
            is_active=True,
        )
        db.add(manager)
        db.commit()
        db.refresh(manager)

        workflow = Workflow(
            organization_id=organization.id,
            name="Integration Workflow",
            description="Manager then admin",
            is_active=True,
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)

        db.add_all([
            WorkflowStep(
                workflow_id=workflow.id,
                step_order=1,
                name="Manager Approval",
                approver_role="manager",
            ),
            WorkflowStep(
                workflow_id=workflow.id,
                step_order=2,
                name="Admin Approval",
                approver_role="admin",
            ),
        ])
        db.commit()

        request = Request(
            organization_id=organization.id,
            created_by=manager.id,
            title="Integration Test Request",
            description="Testing PostgreSQL approval",
            category="IT",
            priority="high",
            status="pending",
            workflow_id=workflow.id,
            current_step=1,
        )
        db.add(request)
        db.commit()
        db.refresh(request)

        login_response = postgres_client.post(
            "/auth/login",
            data={
                "username": manager.email,
                "password": "TestPassword123!",
            },
        )
        assert login_response.status_code == 200, login_response.text
        token = login_response.json()["access_token"]

        response = postgres_client.post(
            f"/requests/{request.id}/approval",
            json={"decision": "approved", "comment": "Integration test"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 201, response.text

        db.expire_all()
        saved_request = db.get(Request, request.id)
        assert saved_request is not None
        assert saved_request.status == "pending"
        assert saved_request.current_step == 2

        saved_approval = db.query(Approval).filter_by(
            request_id=request.id,
            approver_id=manager.id,
        ).one()
        assert saved_approval.decision == "approved"

    finally:
        if organization_id is not None:
            # Delete only this test's records, in foreign-key-safe order.
            request_ids = db.query(Request.id).filter_by(
                organization_id=organization_id
            ).all()
            request_ids = [row[0] for row in request_ids]

            if request_ids:
                db.execute(
                    delete(Approval).where(
                        Approval.request_id.in_(request_ids)
                    )
                )
                db.execute(
                    delete(Request).where(
                        Request.id.in_(request_ids)
                    )
                )

            workflow_ids = db.query(Workflow.id).filter_by(
                organization_id=organization_id
            ).all()
            workflow_ids = [row[0] for row in workflow_ids]

            if workflow_ids:
                db.execute(
                    delete(WorkflowStep).where(
                        WorkflowStep.workflow_id.in_(workflow_ids)
                    )
                )
                db.execute(
                    delete(Workflow).where(
                        Workflow.id.in_(workflow_ids)
                    )
                )

            db.execute(
                delete(User).where(
                    User.organization_id == organization_id
                )
            )
            db.execute(
                delete(Organization).where(
                    Organization.id == organization_id
                )
            )
            db.commit()

        db.close()


def test_postgres_concurrent_approvals_do_not_advance_twice(
    postgres_test_engine,
    postgres_client,
):
    TestingSessionLocal = sessionmaker(
        bind=postgres_test_engine,
        autoflush=False,
        autocommit=False,
    )

    suffix = uuid4().hex[:12]
    db = TestingSessionLocal()
    organization_id = None

    try:
        organization = Organization(
            name="Concurrent Test Company",
            slug=f"concurrent-{suffix}",
            is_active=True,
        )
        db.add(organization)
        db.commit()
        db.refresh(organization)
        organization_id = organization.id

        manager = User(
            organization_id=organization.id,
            full_name="Concurrent Manager",
            email=f"manager-{suffix}@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="manager",
            is_active=True,
        )
        db.add(manager)
        db.commit()
        db.refresh(manager)

        workflow = Workflow(
            organization_id=organization.id,
            name="Concurrent Workflow",
            description="Manager then admin",
            is_active=True,
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)

        db.add_all([
            WorkflowStep(
                workflow_id=workflow.id,
                step_order=1,
                name="Manager Approval",
                approver_role="manager",
            ),
            WorkflowStep(
                workflow_id=workflow.id,
                step_order=2,
                name="Admin Approval",
                approver_role="admin",
            ),
        ])
        db.commit()

        request = Request(
            organization_id=organization.id,
            created_by=manager.id,
            title="Concurrent Approval Request",
            description="Testing concurrent approvals",
            category="IT",
            priority="high",
            status="pending",
            workflow_id=workflow.id,
            current_step=1,
        )
        db.add(request)
        db.commit()
        db.refresh(request)

        login_response = postgres_client.post(
            "/auth/login",
            data={
                "username": manager.email,
                "password": "TestPassword123!",
            },
        )
        assert login_response.status_code == 200, login_response.text
        token = login_response.json()["access_token"]

        request_id = request.id
        headers = {"Authorization": f"Bearer {token}"}
        start_barrier = Barrier(2)

        def submit_approval():
            # Each worker gets its own TestClient.
            with TestClient(app) as client:
                # Synchronize the start of both requests.
                start_barrier.wait(timeout=10)
                return client.post(
                    f"/requests/{request_id}/approval",
                    json={
                        "decision": "approved",
                        "comment": "Concurrent integration test",
                    },
                    headers=headers,
                )

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(submit_approval),
                executor.submit(submit_approval),
            ]
            responses = [future.result(timeout=30) for future in futures]

        status_codes = sorted(response.status_code for response in responses)
        assert status_codes == [201, 409], [
            (response.status_code, response.text)
            for response in responses
        ]

        db.expire_all()
        saved_request = db.get(Request, request_id)
        assert saved_request is not None
        assert saved_request.status == "pending"
        assert saved_request.current_step == 2

        approvals = (
            db.query(Approval)
            .filter_by(request_id=request_id)
            .all()
        )
        assert len(approvals) == 1

    finally:
        if organization_id is not None:
            request_ids = [
                row[0]
                for row in db.query(Request.id)
                .filter_by(organization_id=organization_id)
                .all()
            ]

            if request_ids:
                db.execute(
                    delete(Approval).where(
                        Approval.request_id.in_(request_ids)
                    )
                )
                db.execute(
                    delete(Request).where(
                        Request.id.in_(request_ids)
                    )
                )

            workflow_ids = [
                row[0]
                for row in db.query(Workflow.id)
                .filter_by(organization_id=organization_id)
                .all()
            ]

            if workflow_ids:
                db.execute(
                    delete(WorkflowStep).where(
                        WorkflowStep.workflow_id.in_(workflow_ids)
                    )
                )
                db.execute(
                    delete(Workflow).where(
                        Workflow.id.in_(workflow_ids)
                    )
                )

            db.execute(
                delete(User).where(
                    User.organization_id == organization_id
                )
            )
            db.execute(
                delete(Organization).where(
                    Organization.id == organization_id
                )
            )
            db.commit()

        db.close()

def test_postgres_admin_cannot_approve_before_manager(
    postgres_test_engine,
    postgres_client,
):
    TestingSessionLocal = sessionmaker(
        bind=postgres_test_engine,
        autoflush=False,
        autocommit=False,
    )

    suffix = uuid4().hex[:12]
    db = TestingSessionLocal()
    organization_id = None

    try:
        organization = Organization(
            name="Step Order Test",
            slug=f"step-order-{suffix}",
            is_active=True,
        )
        db.add(organization)
        db.commit()
        db.refresh(organization)
        organization_id = organization.id

        manager = User(
            organization_id=organization.id,
            full_name="Test Manager",
            email=f"manager-{suffix}@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="manager",
            is_active=True,
        )
        admin = User(
            organization_id=organization.id,
            full_name="Test Admin",
            email=f"admin-{suffix}@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="admin",
            is_active=True,
        )
        db.add_all([manager, admin])
        db.commit()
        db.refresh(manager)
        db.refresh(admin)

        workflow = Workflow(
            organization_id=organization.id,
            name="Manager Then Admin",
            description="Verify approval order",
            is_active=True,
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)

        db.add_all([
            WorkflowStep(
                workflow_id=workflow.id,
                step_order=1,
                name="Manager Approval",
                approver_role="manager",
            ),
            WorkflowStep(
                workflow_id=workflow.id,
                step_order=2,
                name="Admin Approval",
                approver_role="admin",
            ),
        ])
        db.commit()

        request = Request(
            organization_id=organization.id,
            created_by=manager.id,
            title="Step Order Test Request",
            description="Admin must wait for manager",
            category="IT",
            priority="high",
            status="pending",
            workflow_id=workflow.id,
            current_step=1,
        )
        db.add(request)
        db.commit()
        db.refresh(request)

        login = postgres_client.post(
            "/auth/login",
            data={
                "username": admin.email,
                "password": "TestPassword123!",
            },
        )
        assert login.status_code == 200, login.text

        response = postgres_client.post(
            f"/requests/{request.id}/approval",
            json={
                "decision": "approved",
                "comment": "Attempt before manager",
            },
            headers={
                "Authorization": (
                    f"Bearer {login.json()['access_token']}"
                )
            },
        )

        assert response.status_code == 403, response.text

        db.expire_all()
        saved_request = db.get(Request, request.id)
        assert saved_request.status == "pending"
        assert saved_request.current_step == 1

        approval_count = (
            db.query(Approval)
            .filter(Approval.request_id == request.id)
            .count()
        )
        assert approval_count == 0

    finally:
        if organization_id is not None:
            request_ids = [
                row[0]
                for row in db.query(Request.id)
                .filter_by(organization_id=organization_id)
                .all()
            ]

            if request_ids:
                db.execute(
                    delete(Approval).where(
                        Approval.request_id.in_(request_ids)
                    )
                )
                db.execute(
                    delete(Request).where(
                        Request.id.in_(request_ids)
                    )
                )

            workflow_ids = [
                row[0]
                for row in db.query(Workflow.id)
                .filter_by(organization_id=organization_id)
                .all()
            ]

            if workflow_ids:
                db.execute(
                    delete(WorkflowStep).where(
                        WorkflowStep.workflow_id.in_(workflow_ids)
                    )
                )
                db.execute(
                    delete(Workflow).where(
                        Workflow.id.in_(workflow_ids)
                    )
                )

            db.execute(
                delete(User).where(
                    User.organization_id == organization_id
                )
            )
            db.execute(
                delete(Organization).where(
                    Organization.id == organization_id
                )
            )
            db.commit()

        db.close()


def test_postgres_approval_commit_failure_rolls_back(
    postgres_test_engine,
    postgres_client,
):
    TestingSessionLocal = sessionmaker(
        bind=postgres_test_engine,
        autoflush=False,
        autocommit=False,
    )

    suffix = uuid4().hex[:12]
    db = TestingSessionLocal()
    organization_id = None

    try:
        organization = Organization(
            name="Rollback Test Company",
            slug=f"rollback-{suffix}",
            is_active=True,
        )
        db.add(organization)
        db.commit()
        db.refresh(organization)
        organization_id = organization.id

        manager = User(
            organization_id=organization.id,
            full_name="Rollback Test Manager",
            email=f"manager-{suffix}@example.com",
            password_hash=hash_password("TestPassword123!"),
            role="manager",
            is_active=True,
        )
        db.add(manager)
        db.commit()
        db.refresh(manager)

        workflow = Workflow(
            organization_id=organization.id,
            name="Rollback Workflow",
            description="Test failed approval commit",
            is_active=True,
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)

        db.add(
            WorkflowStep(
                workflow_id=workflow.id,
                step_order=1,
                name="Manager Approval",
                approver_role="manager",
            )
        )
        db.commit()

        request = Request(
            organization_id=organization.id,
            created_by=manager.id,
            title="Rollback Test Request",
            description="Approval commit should fail",
            category="IT",
            priority="high",
            status="pending",
            workflow_id=workflow.id,
            current_step=1,
        )
        db.add(request)
        db.commit()
        db.refresh(request)

        login = postgres_client.post(
            "/auth/login",
            data={
                "username": manager.email,
                "password": "TestPassword123!",
            },
        )
        assert login.status_code == 200, login.text

        # Force commit to fail only for the approval API request.
        with patch(
            "app.api.approvals.Session.commit",
            side_effect=SQLAlchemyError("Simulated commit failure"),
        ):
            response = postgres_client.post(
                f"/requests/{request.id}/approval",
                json={
                    "decision": "approved",
                    "comment": "Rollback test",
                },
                headers={
                    "Authorization": (
                        f"Bearer {login.json()['access_token']}"
                    )
                },
            )

        # The endpoint should roll back and propagate the simulated error.
        assert response.status_code == 500, response.text

        db.expire_all()
        saved_request = db.get(Request, request.id)
        assert saved_request.status == "pending"
        assert saved_request.current_step == 1

        approval_count = (
            db.query(Approval)
            .filter(Approval.request_id == request.id)
            .count()
        )
        assert approval_count == 0

    finally:
        if organization_id is not None:
            request_ids = [
                row[0]
                for row in db.query(Request.id)
                .filter_by(organization_id=organization_id)
                .all()
            ]

            if request_ids:
                db.execute(
                    delete(Approval).where(
                        Approval.request_id.in_(request_ids)
                    )
                )
                db.execute(
                    delete(Request).where(
                        Request.id.in_(request_ids)
                    )
                )

            workflow_ids = [
                row[0]
                for row in db.query(Workflow.id)
                .filter_by(organization_id=organization_id)
                .all()
            ]

            if workflow_ids:
                db.execute(
                    delete(WorkflowStep).where(
                        WorkflowStep.workflow_id.in_(workflow_ids)
                    )
                )
                db.execute(
                    delete(Workflow).where(
                        Workflow.id.in_(workflow_ids)
                    )
                )

            db.execute(
                delete(User).where(
                    User.organization_id == organization_id
                )
            )
            db.execute(
                delete(Organization).where(
                    Organization.id == organization_id
                )
            )
            db.commit()

        db.close()
