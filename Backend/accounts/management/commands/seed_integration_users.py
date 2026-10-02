import os

from django.core.management.base import (
    BaseCommand,
    CommandError,
)

from accounts.models import AccountProfile
from accounts.services import create_account
from exposure.models import (
    ExposureProfile,
    Worker,
)


class Command(BaseCommand):
    help = (
        "Create or verify integration-test accounts "
        "for OPERATOR, RESEARCHER, and WORKER."
    )

    def handle(self, *args, **options):
        password = os.getenv(
            "INTEGRATION_TEST_PASSWORD"
        )

        if not password:
            raise CommandError(
                "INTEGRATION_TEST_PASSWORD is not set."
            )

        operator = self._ensure_account(
            username="integration_operator",
            password=password,
            role=AccountProfile.Role.OPERATOR,
        )

        researcher = self._ensure_account(
            username="integration_researcher",
            password=password,
            role=AccountProfile.Role.RESEARCHER,
        )

        worker = self._ensure_worker()

        worker_account = self._ensure_account(
            username="integration_worker",
            password=password,
            role=AccountProfile.Role.WORKER,
            worker=worker,
        )

        self._ensure_exposure_profile(
            worker
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Integration users ready."
            )
        )

        self.stdout.write(
            f"OPERATOR   : {operator.user.username}"
        )

        self.stdout.write(
            f"RESEARCHER : {researcher.user.username}"
        )

        self.stdout.write(
            f"WORKER     : {worker_account.user.username}"
        )

        self.stdout.write(
            f"Worker code: {worker.code}"
        )

    def _ensure_account(
        self,
        *,
        username,
        password,
        role,
        worker=None,
    ):
        profile = (
            AccountProfile.objects
            .select_related(
                "user",
                "worker",
            )
            .filter(
                user__username=username
            )
            .first()
        )

        if profile is not None:
            if profile.role != role:
                raise CommandError(
                    (
                        f"{username} already exists "
                        f"with role {profile.role}, "
                        f"expected {role}."
                    )
                )

            if (
                role
                == AccountProfile.Role.WORKER
                and profile.worker_id
                != worker.id
            ):
                raise CommandError(
                    (
                        f"{username} is linked to "
                        "a different Worker."
                    )
                )

            user = profile.user

            user.set_password(
                password
            )

            user.is_active = True

            user.save(
                update_fields=[
                    "password",
                    "is_active",
                ]
            )

            self.stdout.write(
                self.style.WARNING(
                    (
                        f"Updated existing "
                        f"{username}."
                    )
                )
            )

            return profile

        result = create_account(
            username=username,
            password=password,
            email="",
            role=role,
            worker=worker,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Created {username}."
            )
        )

        return result.profile

    def _ensure_worker(self):
        existing_profile = (
            AccountProfile.objects
            .select_related("worker")
            .filter(
                user__username=(
                    "integration_worker"
                )
            )
            .first()
        )

        if (
            existing_profile
            and existing_profile.worker
        ):
            worker = (
                existing_profile.worker
            )

            if not worker.is_active:
                worker.is_active = True

                worker.save(
                    update_fields=[
                        "is_active"
                    ]
                )

            return worker

        worker = (
            Worker.objects
            .filter(
                code=(
                    "PML-INTEGRATION-001"
                )
            )
            .first()
        )

        if worker is not None:
            if (
                AccountProfile.objects
                .filter(worker=worker)
                .exists()
            ):
                raise CommandError(
                    (
                        "PML-INTEGRATION-001 "
                        "is already linked to "
                        "another account."
                    )
                )

            if not worker.is_active:
                worker.is_active = True

                worker.save(
                    update_fields=[
                        "is_active"
                    ]
                )

            return worker

        worker = Worker.objects.create(
            code="PML-INTEGRATION-001",
            name="Integration Worker",
            age=40,
            is_active=True,
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Created integration Worker."
            )
        )

        return worker

    def _ensure_exposure_profile(
        self,
        worker,
    ):
        profile, created = (
            ExposureProfile.objects
            .get_or_create(
                worker=worker,
                defaults={
                    "body_weight": 55,
                    "exposure_time": 8,
                    "exposure_frequency": 250,
                    "exposure_duration": 10,
                    "inhalation_rate": 0.83,
                },
            )
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    (
                        "Created integration "
                        "ExposureProfile."
                    )
                )
            )

            return profile

        self.stdout.write(
            self.style.WARNING(
                (
                    "Integration ExposureProfile "
                    "already exists."
                )
            )
        )

        return profile