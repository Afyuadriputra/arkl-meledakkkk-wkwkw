from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)

from accounts.models import AccountProfile


def get_user_role(user):
    if not getattr(
        user,
        "is_authenticated",
        False,
    ):
        return None

    if user.is_superuser:
        return AccountProfile.Role.ADMIN

    try:
        return user.account_profile.role
    except AccountProfile.DoesNotExist:
        return None


def get_linked_worker(user):
    if not getattr(
        user,
        "is_authenticated",
        False,
    ):
        return None

    try:
        return user.account_profile.worker
    except AccountProfile.DoesNotExist:
        return None


class HasAccountRole(BasePermission):
    allowed_roles = ()

    def has_permission(
        self,
        request,
        view,
    ):
        return (
            get_user_role(request.user)
            in self.allowed_roles
        )


class IsAdminRole(HasAccountRole):
    allowed_roles = (
        AccountProfile.Role.ADMIN,
    )


class IsOperatorRole(HasAccountRole):
    allowed_roles = (
        AccountProfile.Role.OPERATOR,
    )


class IsResearcherRole(HasAccountRole):
    allowed_roles = (
        AccountProfile.Role.RESEARCHER,
    )


class IsWorkerRole(HasAccountRole):
    allowed_roles = (
        AccountProfile.Role.WORKER,
    )


class IsAdminOrOperator(HasAccountRole):
    allowed_roles = (
        AccountProfile.Role.ADMIN,
        AccountProfile.Role.OPERATOR,
    )


class IsAdminOperatorOrResearcher(
    HasAccountRole
):
    allowed_roles = (
        AccountProfile.Role.ADMIN,
        AccountProfile.Role.OPERATOR,
        AccountProfile.Role.RESEARCHER,
    )


class HasApplicationRole(HasAccountRole):
    allowed_roles = (
        AccountProfile.Role.ADMIN,
        AccountProfile.Role.OPERATOR,
        AccountProfile.Role.RESEARCHER,
        AccountProfile.Role.WORKER,
    )


class OperationalOrReadOnlyResearcher(
    BasePermission
):
    """
    ADMIN / OPERATOR:
        read and write.

    RESEARCHER:
        read only.

    WORKER:
        denied.
    """

    def has_permission(
        self,
        request,
        view,
    ):
        role = get_user_role(
            request.user
        )

        if role in (
            AccountProfile.Role.ADMIN,
            AccountProfile.Role.OPERATOR,
        ):
            return True

        return (
            role
            == AccountProfile.Role.RESEARCHER
            and request.method in SAFE_METHODS
        )


class ResearchReadOnly(BasePermission):
    """
    Read-only research access for:
    ADMIN, OPERATOR, RESEARCHER.

    WORKER is denied.
    """

    def has_permission(
        self,
        request,
        view,
    ):
        if request.method not in SAFE_METHODS:
            return False

        role = get_user_role(
            request.user
        )

        return role in (
            AccountProfile.Role.ADMIN,
            AccountProfile.Role.OPERATOR,
            AccountProfile.Role.RESEARCHER,
        )


class IsOwnWorker(BasePermission):
    """
    Object-level ownership helper.

    Supported objects:
    - Worker
    - objects with a `.worker` relation
    """

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        role = get_user_role(
            request.user
        )

        if role in (
            AccountProfile.Role.ADMIN,
            AccountProfile.Role.OPERATOR,
        ):
            return True

        if (
            role
            != AccountProfile.Role.WORKER
        ):
            return False

        linked_worker = get_linked_worker(
            request.user
        )

        if linked_worker is None:
            return False

        if hasattr(
            obj,
            "code",
        ) and obj.__class__.__name__ == "Worker":
            object_worker = obj
        else:
            object_worker = getattr(
                obj,
                "worker",
                None,
            )

        if object_worker is None:
            return False

        return (
            object_worker.pk
            == linked_worker.pk
        )