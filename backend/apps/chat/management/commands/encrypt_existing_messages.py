"""
Management command: encrypt_existing_messages

Re-encrypts any legacy plaintext messages in the database.

Usage:
    python manage.py encrypt_existing_messages
    python manage.py encrypt_existing_messages --dry-run

Safe to run multiple times — already-encrypted messages are detected
by the Fernet token prefix ("gAAAAA") and skipped.
"""

import logging

from django.core.management.base import BaseCommand

from apps.chat.encryption import encrypt_text, is_encrypted

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Encrypts any legacy plaintext messages in the database.  "
        "Safe to run multiple times — already-encrypted rows are skipped."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report how many messages would be encrypted without making changes.",
        )

    def handle(self, *args, **options):
        # Import here to ensure Django is fully initialized
        from apps.chat.models import Message

        dry_run: bool = options["dry_run"]

        self.stdout.write("Scanning messages for unencrypted content…")

        total = 0
        encrypted_count = 0
        skipped_count = 0
        error_count = 0

        # Process in batches to avoid loading all messages into memory
        batch_size = 500
        qs = Message.objects.only("id", "content").iterator(chunk_size=batch_size)

        for message in qs:
            total += 1
            raw = message.content  # EncryptedTextField already decrypts this on read

            if not raw or raw == "[message unavailable]":
                skipped_count += 1
                continue

            # Check the raw DB value — bypass the field's from_db_value
            # We need to inspect what's actually stored, not the decrypted version.
            # So we query the raw value directly.
            # Actually: since EncryptedTextField.from_db_value decrypts already,
            # we can check if re-encrypting is needed by checking the DB value.
            # The simplest approach: try to get the raw stored value.
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT content FROM chat_message WHERE id = %s",
                        [str(message.id)],
                    )
                    row = cursor.fetchone()
                    if not row:
                        skipped_count += 1
                        continue
                    raw_db_value = row[0]
            except Exception as exc:
                self.stderr.write(f"  ERROR reading raw value for message {message.id}: {exc}")
                error_count += 1
                continue

            if is_encrypted(raw_db_value):
                skipped_count += 1
                continue

            # This row is plaintext — needs encryption
            if dry_run:
                self.stdout.write(f"  [DRY RUN] Would encrypt message {message.id}")
                encrypted_count += 1
                continue

            try:
                encrypted_value = encrypt_text(raw_db_value)
                from django.db import connection as conn2
                with conn2.cursor() as cursor:
                    cursor.execute(
                        "UPDATE chat_message SET content = %s WHERE id = %s",
                        [encrypted_value, str(message.id)],
                    )
                encrypted_count += 1
                if encrypted_count % 100 == 0:
                    self.stdout.write(f"  Encrypted {encrypted_count} messages so far…")
            except Exception as exc:
                self.stderr.write(f"  ERROR encrypting message {message.id}: {exc}")
                error_count += 1

        action = "Would encrypt" if dry_run else "Encrypted"
        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Total={total}  {action}={encrypted_count}  "
                f"Already encrypted (skipped)={skipped_count}  Errors={error_count}"
            )
        )
